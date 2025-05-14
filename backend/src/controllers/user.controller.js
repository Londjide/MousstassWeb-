console.log('[UserController] Chargé');

const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');
const AccessLogModel = require('../models/accesslog.model');
const db = require('../models/db');

/**
 * Contrôleur pour gérer les utilisateurs
 */
const UserController = {
  /**
   * Récupère tous les utilisateurs (admin uniquement)
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getAllUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      const users = await UserModel.findAll(limit, offset);
      
      res.json({
        page,
        limit,
        users
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
    }
  },
  
  /**
   * Récupère un utilisateur par son ID
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getUserById: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
    }
  },
  
  /**
   * Récupère le profil de l'utilisateur connecté
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getProfile: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      res.json({
        success: true,
        user: {
          full_name: user.full_name,
          username: user.username,
          photo_url: user.photo_url || null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  },
  
  /**
   * Met à jour un utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  updateUser: async (req, res) => {
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const userId = parseInt(req.params.id);
      
      // Vérification des permissions
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      // Vérification de l'existence de l'utilisateur
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Préparation des données à mettre à jour
      const updateData = {};
      
      // L'admin peut modifier le rôle et le statut actif
      if (req.user.role === 'admin') {
        if (req.body.role) updateData.role = req.body.role;
        if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
      }
      
      // Tout utilisateur peut modifier son email et son nom complet
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.full_name) updateData.full_name = req.body.full_name;
      
      // Mise à jour de l'utilisateur
      const updated = await UserModel.update(userId, updateData);
      
      if (!updated) {
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
      }
      
      // Journalisation de l'action
      await AccessLogModel.create({
        user_id: req.user.id,
        action: 'USER_UPDATE',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        success: true
      });
      
      // Récupération des données mises à jour
      const updatedUser = await UserModel.findById(userId);
      
      res.json({
        message: 'Utilisateur mis à jour avec succès',
        user: updatedUser
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
  },
  
  /**
   * Supprime un utilisateur (admin uniquement)
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  deleteUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Vérification de l'existence de l'utilisateur
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Suppression de l'utilisateur
      const deleted = await UserModel.delete(userId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
      }
      
      // Journalisation de l'action
      await AccessLogModel.create({
        user_id: req.user.id,
        action: 'USER_DELETE',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        success: true
      });
      
      res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
    }
  },
  
  /**
   * Met à jour le profil de l'utilisateur
   */
  updateProfile: async (req, res) => {
    try {
      const { full_name } = req.body;
      
      // Vérifier que l'utilisateur existe
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utilisateur non trouvé' 
        });
      }
      
      // Si full_name est fourni, mettre à jour
      if (full_name) {
        await db.query('UPDATE users SET full_name = ? WHERE id = ?', 
                       [full_name, req.user.id]);
      }
      
      // Récupérer l'utilisateur mis à jour
      const updatedUser = await UserModel.findById(req.user.id);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        user: {
          full_name: updatedUser.full_name,
          username: updatedUser.username,
          photo_url: updatedUser.photo_url || null
        }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la mise à jour du profil' 
      });
    }
  },
  
  /**
   * Récupère un utilisateur par son ID
   */
  getUser: async (req, res) => {
    try {
      const user = await UserModel.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  },
  
  /**
   * Récupère un utilisateur par email (pour le partage)
   * @route GET /api/users/by-email?email=...
   */
  getByEmail: async (req, res) => {
    console.log('[getByEmail] Début fonction');
    try {
      const email = req.query.email;
      console.log('[getByEmail] email reçu:', email);
      if (!email) {
        return res.status(400).json({ success: false, message: "Email requis." });
      }
      const result = await db.query('SELECT id, email, username, full_name FROM users WHERE email = ?', [email]);
      console.log('[getByEmail] Résultat SQL brut:', result);
      if (!Array.isArray(result) || result.length === 0) {
        console.error('[getByEmail] Résultat SQL non conforme:', result);
        return res.status(500).json({ success: false, message: "Erreur interne : résultat SQL inattendu." });
      }
      const users = result[0];
      console.log('[getByEmail] users:', users);
      if (!Array.isArray(users)) {
        console.error('[getByEmail] users n\'est pas un tableau:', users);
        return res.status(500).json({ success: false, message: "Erreur interne : users n'est pas un tableau." });
      }
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: "Aucun utilisateur trouvé avec cet email." });
      }
      res.json({ success: true, user: users[0] });
    } catch (error) {
      console.error('[getByEmail] Erreur lors de la recherche utilisateur par email:', error);
      res.status(500).json({ success: false, message: "Erreur serveur lors de la recherche utilisateur.", error: error.message });
    }
  }
};

module.exports = UserController;