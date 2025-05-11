const { validationResult } = require('express-validator');
const FinancialModel = require('../models/financial.model');

/**
 * Contrôleur pour gérer les données financières
 */
const FinancialController = {
  /**
   * Récupère toutes les données financières d'un utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getUserFinancialData: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId || req.user.id);
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const dataType = req.query.type || null;
      
      // Récupération des données financières
      const financialData = await FinancialModel.findByUserIdAndType(userId, dataType, limit, offset);
      
      // Comptage du total de données
      const totalData = await FinancialModel.countByUserId(userId, dataType);
      
      res.json({
        page,
        limit,
        total: totalData,
        data: financialData
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des données financières:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des données financières' });
    }
  },
  
  /**
   * Récupère des données financières par ID
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getFinancialData: async (req, res) => {
    try {
      const dataId = parseInt(req.params.id);
      
      // Récupération des données
      const data = await FinancialModel.findById(dataId);
      
      if (!data) {
        return res.status(404).json({ message: 'Données financières non trouvées' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== data.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      res.json(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des données financières:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des données financières' });
    }
  },
  
  /**
   * Récupère le contenu déchiffré des données financières
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getFinancialContent: async (req, res) => {
    try {
      const dataId = parseInt(req.params.id);
      
      // Récupération des données pour vérifier les permissions
      const data = await FinancialModel.findById(dataId);
      
      if (!data) {
        return res.status(404).json({ message: 'Données financières non trouvées' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== data.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Récupération et déchiffrement du contenu
      const content = await FinancialModel.getContent(dataId);
      
      if (!content) {
        return res.status(404).json({ message: 'Contenu des données financières non trouvé' });
      }
      
      // Envoi du contenu déchiffré
      res.json({
        id: dataId,
        data_type: data.data_type,
        content: content.content,
        integrity_verified: content.is_valid
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du contenu des données financières:', error);
      
      // Gestion spécifique pour l'erreur d'intégrité
      if (error.message.includes('intégrité')) {
        return res.status(500).json({ 
          message: 'L\'intégrité des données financières est compromise',
          integrity_error: true
        });
      }
      
      res.status(500).json({ message: 'Erreur lors de la récupération du contenu des données financières' });
    }
  },
  
  /**
   * Crée de nouvelles données financières
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  createFinancialData: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { data_type, content, notes } = req.body;
      const userId = req.user.id;
      
      // Création des données financières
      const data = await FinancialModel.create({
        user_id: userId,
        data_type,
        content,
        notes
      });
      
      res.status(201).json({
        message: 'Données financières créées avec succès',
        data
      });
    } catch (error) {
      console.error('Erreur lors de la création des données financières:', error);
      res.status(500).json({ message: 'Erreur lors de la création des données financières' });
    }
  },
  
  /**
   * Met à jour des données financières
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  updateFinancialData: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const dataId = parseInt(req.params.id);
      const { content, notes } = req.body;
      
      // Récupération des données pour vérifier les permissions
      const data = await FinancialModel.findById(dataId);
      
      if (!data) {
        return res.status(404).json({ message: 'Données financières non trouvées' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== data.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Mise à jour des données
      const updated = await FinancialModel.update(dataId, { content, notes });
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour des données financières' });
      }
      
      // Récupération des données mises à jour
      const updatedData = await FinancialModel.findById(dataId);
      
      res.json({
        message: 'Données financières mises à jour avec succès',
        data: updatedData
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données financières:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour des données financières' });
    }
  },
  
  /**
   * Supprime des données financières
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  deleteFinancialData: async (req, res) => {
    try {
      const dataId = parseInt(req.params.id);
      
      // Récupération des données pour vérifier les permissions
      const data = await FinancialModel.findById(dataId);
      
      if (!data) {
        return res.status(404).json({ message: 'Données financières non trouvées' });
      }
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== data.user_id) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Suppression des données
      const deleted = await FinancialModel.delete(dataId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression des données financières' });
      }
      
      res.json({ message: 'Données financières supprimées avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression des données financières:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression des données financières' });
    }
  }
};

module.exports = FinancialController;