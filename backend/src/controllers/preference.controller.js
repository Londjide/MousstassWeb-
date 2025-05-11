/**
 * Contrôleur pour gérer les préférences utilisateur
 */
const UserModel = require('../models/user.model');
const { validationResult } = require('express-validator');

const PreferenceController = {
  /**
   * Récupère les préférences de l'utilisateur connecté
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getPreferences: async (req, res) => {
    try {
      const preferences = await UserModel.getPreferences(req.user.id);
      
      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la récupération des préférences'
      });
    }
  },
  
  /**
   * Met à jour les préférences de l'utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  updatePreferences: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Données invalides', 
          errors: errors.array() 
        });
      }
      
      const { dark_mode, notifications } = req.body;
      
      // Valeurs par défaut et conversion des types
      const preferences = {
        dark_mode: dark_mode === true || dark_mode === 'true' ? true : false,
        notifications: notifications === true || notifications === 'true' ? true : false
      };
      
      // Mise à jour des préférences
      await UserModel.updatePreferences(req.user.id, preferences);
      
      res.json({
        success: true,
        message: 'Préférences enregistrées sur le serveur',
        preferences
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la mise à jour des préférences'
      });
    }
  }
};

module.exports = PreferenceController; 