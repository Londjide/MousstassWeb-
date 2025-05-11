const { validationResult } = require('express-validator');
const AudioModel = require('../models/audio.model');

/**
 * Contrôleur pour gérer les enregistrements audio
 */
const AudioController = {
  /**
   * Récupère tous les enregistrements audio d'un utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getUserAudioRecords: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId || req.user.id);
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      // Récupération des enregistrements
      const records = await AudioModel.findByUserId(userId, limit, offset);
      
      // Comptage du total d'enregistrements
      const totalRecords = await AudioModel.countByUserId(userId);
      
      res.json({
        page,
        limit,
        total: totalRecords,
        records
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des enregistrements audio:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des enregistrements audio' });
    }
  },
  
  /**
   * Récupère un enregistrement audio par son ID
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getAudioRecord: async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      
      // Récupération de l'enregistrement
      const record = await AudioModel.findById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: 'Enregistrement audio non trouvé' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== record.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      res.json(record);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'enregistrement audio:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération de l\'enregistrement audio' });
    }
  },
  
  /**
   * Récupère les données audio déchiffrées
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getAudioData: async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      
      // Récupération de l'enregistrement pour vérifier les permissions
      const record = await AudioModel.findById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: 'Enregistrement audio non trouvé' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== record.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Récupération et déchiffrement des données audio
      const audioData = await AudioModel.getAudioData(recordId);
      
      if (!audioData) {
        return res.status(404).json({ message: 'Données audio non trouvées' });
      }
      
      // Envoi des données déchiffrées
      res.json({
        id: recordId,
        filename: record.filename,
        audio_data: audioData.audio_data,
        integrity_verified: audioData.is_valid
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des données audio:', error);
      
      // Gestion spécifique pour l'erreur d'intégrité
      if (error.message.includes('intégrité')) {
        return res.status(500).json({ 
          message: 'L\'intégrité des données audio est compromise',
          integrity_error: true
        });
      }
      
      res.status(500).json({ message: 'Erreur lors de la récupération des données audio' });
    }
  },
  
  /**
   * Crée un nouvel enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  createAudioRecord: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { filename, audio_data, description, duration_seconds } = req.body;
      const userId = req.user.id;
      
      // Création de l'enregistrement audio
      const record = await AudioModel.create({
        user_id: userId,
        filename,
        audio_data,
        description,
        duration_seconds
      });
      
      res.status(201).json({
        message: 'Enregistrement audio créé avec succès',
        record
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'enregistrement audio:', error);
      res.status(500).json({ message: 'Erreur lors de la création de l\'enregistrement audio' });
    }
  },
  
  /**
   * Met à jour un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  updateAudioRecord: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const recordId = parseInt(req.params.id);
      const { description } = req.body;
      
      // Récupération de l'enregistrement pour vérifier les permissions
      const record = await AudioModel.findById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: 'Enregistrement audio non trouvé' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== record.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Mise à jour de l'enregistrement
      const updated = await AudioModel.update(recordId, { description });
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'enregistrement audio' });
      }
      
      // Récupération de l'enregistrement mis à jour
      const updatedRecord = await AudioModel.findById(recordId);
      
      res.json({
        message: 'Enregistrement audio mis à jour avec succès',
        record: updatedRecord
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement audio:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'enregistrement audio' });
    }
  },
  
  /**
   * Supprime un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  deleteAudioRecord: async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      
      // Récupération de l'enregistrement pour vérifier les permissions
      const record = await AudioModel.findById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: 'Enregistrement audio non trouvé' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== record.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Suppression de l'enregistrement
      const deleted = await AudioModel.delete(recordId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression de l\'enregistrement audio' });
      }
      
      res.json({ message: 'Enregistrement audio supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'enregistrement audio:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression de l\'enregistrement audio' });
    }
  }
};

module.exports = AudioController;