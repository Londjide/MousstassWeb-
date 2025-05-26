const crypto = require('crypto');

/**
 * Génère un vecteur d'initialisation de 16 octets
 * @returns {Buffer} - Vecteur d'initialisation aléatoire
 */
const generateIv = () => {
  return crypto.randomBytes(16); // 16 octets = 128 bits
};

/**
 * Chiffre ou déchiffre des données avec AES-256-CBC
 * @param {Buffer} data - Données à chiffrer/déchiffrer
 * @param {Buffer} key - Clé de chiffrement de 32 octets (256 bits)
 * @param {Buffer} iv - Vecteur d'initialisation de 16 octets
 * @param {boolean} decrypt - Vrai pour déchiffrer, faux pour chiffrer
 * @returns {Buffer} - Données chiffrées ou déchiffrées
 */
const encryptWithKey = (data, key, iv, decrypt = false) => {
  try {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }
    
    if (!Buffer.isBuffer(key)) {
      key = Buffer.from(key);
    }
    
    if (!Buffer.isBuffer(iv) || iv.length !== 16) {
      throw new Error('IV invalide ou de longueur incorrecte');
    }
    
    // Algorithme AES-256-CBC
    const algorithm = 'aes-256-cbc';
    
    // Créer un chiffreur ou déchiffreur
    const cipher = decrypt 
      ? crypto.createDecipheriv(algorithm, key, iv)
      : crypto.createCipheriv(algorithm, key, iv);
    
    // Chiffrer/déchiffrer les données
    const result = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    return result;
  } catch (error) {
    console.error(`Erreur lors du ${decrypt ? 'déchiffrement' : 'chiffrement'}:`, error);
    throw new Error(`Erreur de ${decrypt ? 'déchiffrement' : 'chiffrement'}: ${error.message}`);
  }
};

/**
 * Déchiffre des données avec un token et un secret
 * @param {Buffer} encryptedData - Données chiffrées
 * @param {string} token - Token de partage
 * @param {string} secret - Secret de déchiffrement
 * @param {Buffer} iv - Vecteur d'initialisation 
 * @returns {Buffer|null} - Données déchiffrées ou null en cas d'échec
 */
const decryptWithTokenSecret = (encryptedData, token, secret, iv) => {
  try {
    // Dériver une clé à partir du token et du secret
    const derivedKey = crypto.createHash('sha256')
      .update(`${token}:${secret}`)
      .digest();
    
    // Utiliser la clé dérivée pour déchiffrer
    return encryptWithKey(encryptedData, derivedKey, iv, true);
  } catch (error) {
    console.error('Erreur lors du déchiffrement avec token et secret:', error);
    return null;
  }
};

/**
 * Génère un jeton de partage à partir d'une clé d'enregistrement
 * @param {Buffer} recordingKey - Clé de l'enregistrement
 * @param {string} secret - Secret de partage
 * @returns {string} - Jeton de partage hexadécimal
 */
const generateSharingToken = (recordingKey, secret) => {
  try {
    // Créer un hash du secret
    const secretHash = crypto.createHash('sha256')
      .update(secret)
      .digest('hex');
    
    // Créer un jeton à partir de la clé d'enregistrement et du hash du secret
    const token = crypto.createHmac('sha256', recordingKey)
      .update(secretHash)
      .digest('hex');
    
    return token;
  } catch (error) {
    console.error('Erreur lors de la génération du jeton de partage:', error);
    throw new Error('Échec de la génération du jeton de partage');
  }
};

/**
 * Utilitaire pour le chiffrement/déchiffrement avec AES-256
 */
const cryptoUtils = {
  /**
   * Chiffre des données avec AES-256
   * @param {Buffer|string} data - Données à chiffrer
   * @param {string} [key] - Clé de chiffrement (générée si non fournie)
   * @returns {Object} - Données chiffrées et clé
   */
  encrypt: (data, key = null) => {
    try {
      // Générer une clé si non fournie
      const encryptionKey = key || crypto.randomBytes(32).toString('hex');
      
      // Générer un vecteur d'initialisation
      const iv = crypto.randomBytes(16);
      
      // Créer le chiffreur
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
      
      // Chiffrer les données
      let encrypted;
      if (Buffer.isBuffer(data)) {
        encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      } else {
        encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      }
      
      // Concaténer IV et données chiffrées
      const encryptedData = Buffer.concat([iv, encrypted]);
      
      return {
        encryptedData,
        key: encryptionKey
      };
    } catch (error) {
      console.error('Erreur lors du chiffrement:', error);
      throw error;
    }
  },

  /**
   * Déchiffre des données avec AES-256
   * @param {Buffer} encryptedData - Données chiffrées (avec IV en préfixe)
   * @param {string} key - Clé de déchiffrement
   * @returns {Buffer} - Données déchiffrées
   */
  decrypt: (encryptedData, key) => {
    try {
      // Extraire l'IV (les 16 premiers octets)
      const iv = encryptedData.slice(0, 16);
      
      // Extraire les données chiffrées (le reste)
      const encryptedText = encryptedData.slice(16);
      
      // Créer le déchiffreur
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
      
      // Déchiffrer les données
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      
      return decrypted;
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error);
      throw error;
    }
  },

  /**
   * Génère un hachage SHA-256 pour vérifier l'intégrité des données
   * @param {Buffer|string} data - Données à hacher
   * @returns {string} - Hachage SHA-256 en hexadécimal
   */
  generateHash: (data) => {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      console.error('Erreur lors de la génération du hachage:', error);
      throw error;
    }
  },

  /**
   * Vérifie l'intégrité des données en comparant les hachages
   * @param {Buffer|string} data - Données à vérifier
   * @param {string} hash - Hachage à comparer
   * @returns {boolean} - Résultat de la vérification
   */
  verifyIntegrity: (data, hash) => {
    try {
      const calculatedHash = cryptoUtils.generateHash(data);
      return calculatedHash === hash;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'intégrité:', error);
      throw error;
    }
  },

  /**
   * Génère un token de partage sécurisé
   * @returns {string} - Token unique
   */
  generateSharingToken: () => {
    return crypto.randomBytes(32).toString('hex');
  }
};

module.exports = {
  generateIv,
  encryptWithKey,
  decryptWithTokenSecret,
  generateSharingToken,
  ...cryptoUtils
}; 