const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Utilitaires de sécurité pour l'application
 */
const security = {
  /**
   * Chiffre les données avec AES-256-CBC
   * @param {string|Buffer} data - Les données à chiffrer
   * @returns {string} - Données chiffrées au format 'iv:données_chiffrées'
   */
  encrypt: (data) => {
    const iv = crypto.randomBytes(16); // Vecteur d'initialisation
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    
    // Création du chiffreur
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Chiffrement des données
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Concaténation du vecteur d'initialisation et des données chiffrées
    return `${iv.toString('hex')}:${encrypted}`;
  },
  
  /**
   * Déchiffre les données AES-256-CBC
   * @param {string} encryptedData - Données au format 'iv:données_chiffrées'
   * @returns {string} - Données déchiffrées
   */
  decrypt: (encryptedData) => {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    
    // Création du déchiffreur
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Déchiffrement des données
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },
  
  /**
   * Crée un hash SHA-256 des données
   * @param {string|Buffer} data - Les données à hacher
   * @returns {string} - Hash hexadécimal
   */
  createHash: (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  },
  
  /**
   * Vérifie l'intégrité des données avec un hash SHA-256
   * @param {string|Buffer} data - Les données à vérifier
   * @param {string} hash - Le hash attendu
   * @returns {boolean} - Vrai si l'intégrité est vérifiée
   */
  verifyHash: (data, hash) => {
    const calculatedHash = security.createHash(data);
    return calculatedHash === hash;
  },
  
  /**
   * Hache un mot de passe avec bcrypt
   * @param {string} password - Mot de passe en clair
   * @returns {Promise<string>} - Hash du mot de passe
   */
  hashPassword: async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  },
  
  /**
   * Compare un mot de passe avec un hash bcrypt
   * @param {string} password - Mot de passe en clair
   * @param {string} hash - Hash bcrypt
   * @returns {Promise<boolean>} - Vrai si correspondance
   */
  comparePassword: async (password, hash) => {
    // Vérifier que les entrées sont valides
    if (!password || !hash) {
      console.error('comparePassword: entrées invalides', { 
        passwordProvided: !!password, 
        hashProvided: !!hash 
      });
      return false;
    }
    
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Erreur dans bcrypt.compare:', error);
      throw error;
    }
  }
};

module.exports = security;