const db = require('../utils/db');
const crypto = require('../utils/crypto');
const fs = require('fs');
const path = require('path');

/**
 * Modèle pour la gestion des enregistrements audio
 */
class Recording {
  /**
   * Récupère un enregistrement par son ID
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Object>} - Données de l'enregistrement
   */
  static async findById(id) {
    try {
      const [rows] = await db.query(
        `SELECT r.*, u.username as owner_name 
         FROM recordings r
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'enregistrement:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les enregistrements d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Array>} - Liste des enregistrements
   */
  static async findByUserId(userId) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM recordings WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des enregistrements:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel enregistrement
   * @param {Object} recordingData - Données de l'enregistrement
   * @param {number} recordingData.user_id - ID de l'utilisateur
   * @param {string} recordingData.title - Titre de l'enregistrement
   * @param {string} recordingData.description - Description
   * @param {Buffer} recordingData.audio - Données audio
   * @param {number} recordingData.duration - Durée en secondes
   * @param {boolean} recordingData.is_encrypted - Si l'enregistrement doit être chiffré
   * @returns {Promise<Object>} - Enregistrement créé
   */
  static async create(recordingData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Générer un nom de fichier unique
      const fileName = `recording_${Date.now()}_${Math.floor(Math.random() * 1000)}.webm`;
      const filePath = path.join('uploads', fileName);
      
      // Chiffrer l'audio si demandé
      let audioToSave = recordingData.audio;
      let encryptionKey = null;
      
      if (recordingData.is_encrypted) {
        const encrypted = crypto.encrypt(recordingData.audio);
        audioToSave = encrypted.encryptedData;
        encryptionKey = encrypted.key;
      }
      
      // Sauvegarder le fichier
      fs.writeFileSync(path.join(__dirname, '../../../', filePath), audioToSave);
      
      // Insérer l'enregistrement dans la base de données
      const [result] = await connection.query(
        `INSERT INTO recordings (
          user_id, title, description, file_path, duration, 
          is_encrypted, encryption_key, is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordingData.user_id,
          recordingData.title,
          recordingData.description || null,
          filePath,
          recordingData.duration || 0,
          recordingData.is_encrypted || false,
          encryptionKey,
          recordingData.is_public || false
        ]
      );
      
      await connection.commit();
      
      // Récupérer l'enregistrement créé
      return this.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      console.error('Erreur lors de la création de l\'enregistrement:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Met à jour un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @param {Object} recordingData - Données à mettre à jour
   * @returns {Promise<Object>} - Enregistrement mis à jour
   */
  static async update(id, recordingData) {
    try {
      let query = 'UPDATE recordings SET ';
      const values = [];
      const fields = [];

      // Construction dynamique de la requête
      if (recordingData.title) {
        fields.push('title = ?');
        values.push(recordingData.title);
      }
      
      if (recordingData.description !== undefined) {
        fields.push('description = ?');
        values.push(recordingData.description);
      }
      
      if (recordingData.is_public !== undefined) {
        fields.push('is_public = ?');
        values.push(recordingData.is_public);
      }
      
      if (recordingData.access_code !== undefined) {
        fields.push('access_code = ?');
        values.push(recordingData.access_code);
      }

      // Si aucun champ à mettre à jour
      if (fields.length === 0) {
        return this.findById(id);
      }

      query += fields.join(', ') + ' WHERE id = ?';
      values.push(id);

      await db.query(query, values);
      return this.findById(id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement:', error);
      throw error;
    }
  }

  /**
   * Supprime un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<boolean>} - Résultat de la suppression
   */
  static async delete(id) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Récupérer le chemin du fichier
      const [rows] = await connection.query(
        'SELECT file_path FROM recordings WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return false;
      }
      
      const filePath = path.join(__dirname, '../../../', rows[0].file_path);
      
      // Supprimer l'enregistrement de la base de données
      const [result] = await connection.query(
        'DELETE FROM recordings WHERE id = ?',
        [id]
      );
      
      // Supprimer le fichier
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Erreur lors de la suppression de l\'enregistrement:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Récupère les données audio d'un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Buffer>} - Données audio (déchiffrées si nécessaire)
   */
  static async getAudioData(id) {
    try {
      // Récupérer les informations de l'enregistrement
      const [rows] = await db.query(
        'SELECT file_path, is_encrypted, encryption_key FROM recordings WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        throw new Error('Enregistrement non trouvé');
      }
      
      const recording = rows[0];
      const filePath = path.join(__dirname, '../../../', recording.file_path);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Fichier audio non trouvé');
      }
      
      // Lire le fichier
      const audioData = fs.readFileSync(filePath);
      
      // Déchiffrer si nécessaire
      if (recording.is_encrypted && recording.encryption_key) {
        return crypto.decrypt(audioData, recording.encryption_key);
      }
      
      return audioData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données audio:', error);
      throw error;
    }
  }
}

module.exports = Recording; 