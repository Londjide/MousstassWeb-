const db = require('./db');

/**
 * Modèle pour gérer les logs d'accès
 */
const AccessLogModel = {
  /**
   * Crée une nouvelle entrée de log
   * @param {Object} logData - Données du log
   * @returns {Promise<Object>} - Log créé
   */
  create: async (logData) => {
    const { user_id, action, ip_address, user_agent, success } = logData;
    
    const query = `
      INSERT INTO access_logs (user_id, action, ip_address, user_agent, success)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(
      query, 
      [user_id, action, ip_address, user_agent, success]
    );
    
    return {
      id: result.insertId,
      user_id,
      action,
      ip_address,
      timestamp: new Date(),
      success
    };
  },
  
  /**
   * Récupère les logs d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} limit - Limite de résultats
   * @param {number} offset - Décalage pour pagination
   * @returns {Promise<Array>} - Liste des logs
   */
  findByUserId: async (userId, limit = 10, offset = 0) => {
    const query = `
      SELECT id, user_id, timestamp, action, ip_address, user_agent, success
      FROM access_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    return await db.query(query, [userId, limit, offset]);
  },
  
  /**
   * Récupère tous les logs (admin uniquement)
   * @param {number} limit - Limite de résultats
   * @param {number} offset - Décalage pour pagination
   * @returns {Promise<Array>} - Liste des logs
   */
  findAll: async (limit = 100, offset = 0) => {
    const query = `
      SELECT l.id, l.user_id, l.timestamp, l.action, l.ip_address, l.user_agent, l.success, u.username
      FROM access_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    return await db.query(query, [limit, offset]);
  },
  
  /**
   * Récupère les logs d'échec de connexion
   * @param {string} ipAddress - Adresse IP
   * @param {number} timeframeMinutes - Période en minutes
   * @returns {Promise<number>} - Nombre d'échecs
   */
  countLoginFailures: async (ipAddress, timeframeMinutes = 30) => {
    const query = `
      SELECT COUNT(*) as count
      FROM access_logs
      WHERE ip_address = ?
        AND action = 'LOGIN_ATTEMPT'
        AND success = 0
        AND timestamp > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    
    const result = await db.query(query, [ipAddress, timeframeMinutes]);
    
    return result[0].count;
  },
  
  /**
   * Supprime les logs plus anciens qu'une certaine date
   * @param {number} days - Nombre de jours à conserver
   * @returns {Promise<number>} - Nombre de logs supprimés
   */
  deleteOldLogs: async (days = 90) => {
    const query = `
      DELETE FROM access_logs
      WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    const result = await db.query(query, [days]);
    
    return result.affectedRows;
  }
};

module.exports = AccessLogModel;