const db = require('./db');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Modèle pour la gestion des enregistrements audio
 */
class Recording {
  /**
   * Crée un nouvel enregistrement audio
   * @param {Object} recordingData Données de l'enregistrement
   * @param {Buffer} audioBuffer Contenu audio à chiffrer
   * @returns {Promise<Object>} Enregistrement créé
   */
  static async create(recordingData, audioBuffer) {
    const { name, userId, duration } = recordingData;
    const timestamp = new Date();
    
    // Génération d'une clé AES pour chiffrer l'enregistrement
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Chiffrement des données audio avec AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(audioBuffer),
      cipher.final()
    ]);
    
    // Création du répertoire des enregistrements si nécessaire
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Génération d'un nom de fichier unique
    const fileName = `${userId}_${Date.now()}.enc`;
    const filePath = path.join(uploadDir, fileName);
    
    // Ajout de l'IV au début du fichier pour le déchiffrement
    const fileData = Buffer.concat([
      Buffer.from(iv.toString('hex')), // Stocker l'IV en hexadécimal
      Buffer.from('\n'), // Séparateur
      encryptedData
    ]);
    
    // Écriture du fichier chiffré
    await fs.writeFile(filePath, fileData);
    
    // Chiffrement de la clé AES avec la clé publique de l'utilisateur
    const [rows] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('Clé publique introuvable pour cet utilisateur');
    }
    
    const publicKey = rows[0].public_key;
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      aesKey
    ).toString('base64');
    
    // Sauvegarde en base de données
    const [result] = await db.query(
      'INSERT INTO recordings (name, file_path, timestamp, duration, user_id, encryption_key) VALUES (?, ?, ?, ?, ?, ?)',
      [name, fileName, timestamp, duration, userId, encryptedKey]
    );
    
    return {
      id: result.insertId,
      name,
      timestamp,
      duration,
      userId
    };
  }

  /**
   * Récupère un enregistrement par son ID
   * @param {number} id ID de l'enregistrement
   * @param {number} userId ID de l'utilisateur (pour vérifier l'accès)
   * @returns {Promise<Object|null>} Enregistrement trouvé ou null
   */
  static async findById(id, userId) {
    // Vérifier si l'enregistrement appartient à l'utilisateur ou lui a été partagé
    const [rows] = await db.query(
      `SELECT r.*, 
        CASE 
          WHEN r.user_id = ? THEN true 
          WHEN sr.id IS NOT NULL THEN true 
          ELSE false 
        END AS has_access,
        CASE
          WHEN r.user_id = ? THEN r.encryption_key
          WHEN sr.id IS NOT NULL THEN sr.encryption_key
          ELSE NULL
        END AS proper_key
      FROM recordings r
      LEFT JOIN shared_recordings sr ON r.id = sr.recording_id AND sr.target_user_id = ?
      WHERE r.id = ?`,
      [userId, userId, userId, id]
    );
    
    if (rows.length === 0 || !rows[0].has_access) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Récupère le contenu audio d'un enregistrement (déchiffré)
   * @param {Object} recording Enregistrement avec sa clé
   * @param {string} privateKey Clé privée de l'utilisateur pour déchiffrer
   * @returns {Promise<Buffer>} Données audio déchiffrées
   */
  static async getAudioContent(recording, privateKey) {
    // Lecture du fichier chiffré
    const filePath = path.join(__dirname, '../../uploads', recording.file_path);
    const fileData = await fs.readFile(filePath, 'utf8');
    
    // Extraction de l'IV et des données chiffrées
    const [ivHex, encryptedData] = fileData.split('\n');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Déchiffrement de la clé AES avec la clé privée
    const encryptedKey = recording.proper_key;
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    );
    
    // Déchiffrement des données audio
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    const decryptedData = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, 'binary')),
      decipher.final()
    ]);
    
    return decryptedData;
  }

  /**
   * Liste les enregistrements d'un utilisateur
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<Array>} Liste des enregistrements
   */
  static async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.timestamp, r.duration, r.user_id, 
        CASE WHEN r.user_id = ? THEN 'owned' ELSE 'shared' END AS type
      FROM recordings r
      WHERE r.user_id = ?
      UNION
      SELECT r.id, r.name, r.timestamp, r.duration, r.user_id, 'shared' AS type
      FROM recordings r
      INNER JOIN shared_recordings sr ON r.id = sr.recording_id
      WHERE sr.target_user_id = ?
      ORDER BY timestamp DESC`,
      [userId, userId, userId]
    );
    
    return rows;
  }

  /**
   * Supprime un enregistrement
   * @param {number} id ID de l'enregistrement
   * @param {number} userId ID de l'utilisateur (pour vérifier l'accès)
   * @returns {Promise<boolean>} Vrai si suppression réussie
   */
  static async delete(id, userId) {
    // Vérifier si l'enregistrement appartient à l'utilisateur
    const [recordings] = await db.query(
      'SELECT file_path FROM recordings WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (recordings.length === 0) {
      return false;
    }
    
    const filePath = path.join(__dirname, '../../uploads', recordings[0].file_path);
    
    // Supprimer le fichier
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
    }
    
    // Supprimer l'enregistrement de la BDD
    await db.query('DELETE FROM recordings WHERE id = ?', [id]);
    
    return true;
  }

  /**
   * Partage un enregistrement avec un autre utilisateur
   * @param {number} recordingId ID de l'enregistrement à partager
   * @param {number} sourceUserId ID de l'utilisateur qui partage
   * @param {number} targetUserId ID de l'utilisateur qui reçoit
   * @returns {Promise<boolean>} Vrai si partage réussi
   */
  static async share(recordingId, sourceUserId, targetUserId) {
    // Vérifier si l'enregistrement appartient à l'utilisateur source
    const [recordings] = await db.query(
      'SELECT file_path, encryption_key FROM recordings WHERE id = ? AND user_id = ?',
      [recordingId, sourceUserId]
    );
    
    if (recordings.length === 0) {
      return false;
    }
    
    // Récupérer les clés publiques/privées des utilisateurs
    const [sourceKeys] = await db.query(
      'SELECT private_key FROM user_keys WHERE user_id = ?',
      [sourceUserId]
    );
    
    const [targetKeys] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [targetUserId]
    );
    
    if (sourceKeys.length === 0 || targetKeys.length === 0) {
      return false;
    }
    
    // Déchiffrer la clé AES avec la clé privée de la source
    const sourcePrivateKey = sourceKeys[0].private_key;
    const encryptedKey = recordings[0].encryption_key;
    
    const aesKey = crypto.privateDecrypt(
      {
        key: sourcePrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    );
    
    // Rechiffrer la clé AES avec la clé publique de la cible
    const targetPublicKey = targetKeys[0].public_key;
    const reencryptedKey = crypto.publicEncrypt(
      {
        key: targetPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      aesKey
    ).toString('base64');
    
    // Insérer le partage
    await db.query(
      'INSERT INTO shared_recordings (recording_id, source_user_id, target_user_id, encryption_key) VALUES (?, ?, ?, ?)',
      [recordingId, sourceUserId, targetUserId, reencryptedKey]
    );
    
    // Créer une notification pour le destinataire
    await db.query(
      'INSERT INTO notifications (user_id, message, recording_id) VALUES (?, ?, ?)',
      [targetUserId, `Un enregistrement nommé "${recordings[0].name}" a été partagé avec vous.`, recordingId]
    );
    
    return true;
  }
}

module.exports = Recording; 