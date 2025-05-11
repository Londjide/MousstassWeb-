const db = require('./db');
const security = require('../utils/security');

/**
 * Modèle pour gérer les enregistrements audio
 */
const AudioModel = {
  /**
   * Crée un nouvel enregistrement audio
   * @param {Object} audioData - Données de l'enregistrement
   * @returns {Promise<Object>} - Enregistrement créé
   */
  create: async (audioData) => {
    const { user_id, filename, audio_data, description, duration_seconds } = audioData;
    
    // Chiffrement des données audio
    const encrypted_data = security.encrypt(audio_data);
    
    // Création du hash de vérification
    const hash_verification = security.createHash(audio_data);
    
    const query = `
      INSERT INTO audio_records (user_id, filename, encrypted_data, hash_verification, description, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(
      query, 
      [user_id, filename, encrypted_data, hash_verification, description, duration_seconds]
    );
    
    return {
      id: result.insertId,
      user_id,
      filename,
      description,
      duration_seconds,
      created_at: new Date()
    };
  },
  
  /**
   * Trouve un enregistrement audio par son ID
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Object|null>} - Enregistrement trouvé ou null
   */
  findById: async (id) => {
    const query = `
      SELECT id, user_id, filename, encrypted_data, hash_verification, 
             created_at, description, duration_seconds
      FROM audio_records
      WHERE id = ?
    `;
    
    const records = await db.query(query, [id]);
    
    if (!records.length) {
      return null;
    }
    
    const record = records[0];
    
    // Pour des raisons de sécurité, on ne déchiffre pas automatiquement
    // les données audio dans cette méthode de recherche
    return {
      id: record.id,
      user_id: record.user_id,
      filename: record.filename,
      description: record.description,
      duration_seconds: record.duration_seconds,
      created_at: record.created_at,
      has_encrypted_data: !!record.encrypted_data
    };
  },
  
  /**
   * Récupère et déchiffre les données audio
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Object|null>} - Données audio déchiffrées ou null
   */
  getAudioData: async (id) => {
    const query = `
      SELECT encrypted_data, hash_verification
      FROM audio_records
      WHERE id = ?
    `;
    
    const records = await db.query(query, [id]);
    
    if (!records.length) {
      return null;
    }
    
    const { encrypted_data, hash_verification } = records[0];
    
    // Déchiffrement des données
    const audio_data = security.decrypt(encrypted_data);
    
    // Vérification de l'intégrité
    const isValid = security.verifyHash(audio_data, hash_verification);
    
    if (!isValid) {
      throw new Error('L\'intégrité des données audio est compromise');
    }
    
    return {
      audio_data,
      is_valid: isValid
    };
  },
  
  /**
   * Liste les enregistrements audio d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} limit - Limite de résultats
   * @param {number} offset - Décalage pour pagination
   * @returns {Promise<Array>} - Liste d'enregistrements
   */
  findByUserId: async (userId, limit = 10, offset = 0) => {
    const query = `
      SELECT id, user_id, filename, created_at, description, duration_seconds
      FROM audio_records
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    return await db.query(query, [userId, limit, offset]);
  },
  
  /**
   * Met à jour un enregistrement audio
   * @param {number} id - ID de l'enregistrement
   * @param {Object} audioData - Données à mettre à jour
   * @returns {Promise<boolean>} - Vrai si mise à jour réussie
   */
  update: async (id, audioData) => {
    const { description } = audioData;
    
    // Seule la description est modifiable pour préserver l'intégrité
    const query = `
      UPDATE audio_records
      SET description = ?
      WHERE id = ?
    `;
    
    const result = await db.query(query, [description, id]);
    
    return result.affectedRows > 0;
  },
  
  /**
   * Supprime un enregistrement audio
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<boolean>} - Vrai si suppression réussie
   */
  delete: async (id) => {
    const query = `
      DELETE FROM audio_records
      WHERE id = ?
    `;
    
    const result = await db.query(query, [id]);
    
    return result.affectedRows > 0;
  },
  
  /**
   * Compte le nombre total d'enregistrements d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<number>} - Nombre total d'enregistrements
   */
  countByUserId: async (userId) => {
    const query = `
      SELECT COUNT(*) as count
      FROM audio_records
      WHERE user_id = ?
    `;
    
    const result = await db.query(query, [userId]);
    
    return result[0].count;
  }
};

module.exports = AudioModel;