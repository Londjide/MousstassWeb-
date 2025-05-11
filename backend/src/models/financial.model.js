const db = require('./db');
const security = require('../utils/security');

/**
 * Modèle pour gérer les données financières
 */
const FinancialModel = {
  /**
   * Crée une nouvelle entrée de données financières
   * @param {Object} financialData - Données financières
   * @returns {Promise<Object>} - Données financières créées
   */
  create: async (financialData) => {
    const { user_id, data_type, content, notes } = financialData;
    
    // Chiffrement du contenu
    const encrypted_content = security.encrypt(content);
    
    // Création du hash de vérification
    const hash_verification = security.createHash(content);
    
    const query = `
      INSERT INTO financial_data (user_id, data_type, encrypted_content, hash_verification, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(
      query, 
      [user_id, data_type, encrypted_content, hash_verification, notes]
    );
    
    return {
      id: result.insertId,
      user_id,
      data_type,
      notes,
      created_at: new Date()
    };
  },
  
  /**
   * Trouve des données financières par ID
   * @param {number} id - ID des données
   * @returns {Promise<Object|null>} - Données financières trouvées ou null
   */
  findById: async (id) => {
    const query = `
      SELECT id, user_id, data_type, encrypted_content, hash_verification, 
             created_at, modified_at, notes
      FROM financial_data
      WHERE id = ?
    `;
    
    const records = await db.query(query, [id]);
    
    if (!records.length) {
      return null;
    }
    
    const record = records[0];
    
    // Pour des raisons de sécurité, on ne déchiffre pas automatiquement
    // le contenu dans cette méthode de recherche
    return {
      id: record.id,
      user_id: record.user_id,
      data_type: record.data_type,
      notes: record.notes,
      created_at: record.created_at,
      modified_at: record.modified_at,
      has_encrypted_content: !!record.encrypted_content
    };
  },
  
  /**
   * Récupère et déchiffre le contenu des données financières
   * @param {number} id - ID des données
   * @returns {Promise<Object|null>} - Contenu déchiffré ou null
   */
  getContent: async (id) => {
    const query = `
      SELECT encrypted_content, hash_verification
      FROM financial_data
      WHERE id = ?
    `;
    
    const records = await db.query(query, [id]);
    
    if (!records.length) {
      return null;
    }
    
    const { encrypted_content, hash_verification } = records[0];
    
    // Déchiffrement du contenu
    const content = security.decrypt(encrypted_content);
    
    // Vérification de l'intégrité
    const isValid = security.verifyHash(content, hash_verification);
    
    if (!isValid) {
      throw new Error('L\'intégrité des données financières est compromise');
    }
    
    return {
      content,
      is_valid: isValid
    };
  },
  
  /**
   * Liste les données financières d'un utilisateur par type
   * @param {number} userId - ID de l'utilisateur
   * @param {string} dataType - Type de données (optionnel)
   * @param {number} limit - Limite de résultats
   * @param {number} offset - Décalage pour pagination
   * @returns {Promise<Array>} - Liste des données financières
   */
  findByUserIdAndType: async (userId, dataType = null, limit = 10, offset = 0) => {
    let query, params;
    
    if (dataType) {
      query = `
        SELECT id, user_id, data_type, created_at, modified_at, notes
        FROM financial_data
        WHERE user_id = ? AND data_type = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, dataType, limit, offset];
    } else {
      query = `
        SELECT id, user_id, data_type, created_at, modified_at, notes
        FROM financial_data
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, limit, offset];
    }
    
    return await db.query(query, params);
  },
  
  /**
   * Met à jour des données financières
   * @param {number} id - ID des données
   * @param {Object} financialData - Données à mettre à jour
   * @returns {Promise<boolean>} - Vrai si mise à jour réussie
   */
  update: async (id, financialData) => {
    const { content, notes } = financialData;
    
    // Si le contenu est fourni, on le chiffre et on met à jour le hash
    if (content) {
      const encrypted_content = security.encrypt(content);
      const hash_verification = security.createHash(content);
      
      const query = `
        UPDATE financial_data
        SET encrypted_content = ?,
            hash_verification = ?,
            notes = ?,
            modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const result = await db.query(query, [encrypted_content, hash_verification, notes, id]);
      
      return result.affectedRows > 0;
    } else {
      // Sinon on met à jour seulement les notes
      const query = `
        UPDATE financial_data
        SET notes = ?,
            modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const result = await db.query(query, [notes, id]);
      
      return result.affectedRows > 0;
    }
  },
  
  /**
   * Supprime des données financières
   * @param {number} id - ID des données
   * @returns {Promise<boolean>} - Vrai si suppression réussie
   */
  delete: async (id) => {
    const query = `
      DELETE FROM financial_data
      WHERE id = ?
    `;
    
    const result = await db.query(query, [id]);
    
    return result.affectedRows > 0;
  },
  
  /**
   * Compte le nombre total de données financières d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} dataType - Type de données (optionnel)
   * @returns {Promise<number>} - Nombre total de données
   */
  countByUserId: async (userId, dataType = null) => {
    let query, params;
    
    if (dataType) {
      query = `
        SELECT COUNT(*) as count
        FROM financial_data
        WHERE user_id = ? AND data_type = ?
      `;
      params = [userId, dataType];
    } else {
      query = `
        SELECT COUNT(*) as count
        FROM financial_data
        WHERE user_id = ?
      `;
      params = [userId];
    }
    
    const result = await db.query(query, params);
    
    return result[0].count;
  }
};

module.exports = FinancialModel;