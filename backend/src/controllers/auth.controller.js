const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');
const security = require('../utils/security');
const AccessLogModel = require('../models/accesslog.model');

/**
 * Contrôleur pour gérer l'authentification
 */
const AuthController = {
  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  register: async (req, res) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, full_name, password } = req.body;

      // Vérifier si l'email existe déjà
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Cet email est déjà utilisé' 
        });
      }

      // Créer le nouvel utilisateur
      const user = await UserModel.create({ username, email, full_name, password });

      // Vérifier que JWT_SECRET est défini
      if (!process.env.JWT_SECRET) {
        console.error('Erreur critique: JWT_SECRET n\'est pas défini dans les variables d\'environnement');
        return res.status(500).json({
          success: false,
          message: 'Erreur de configuration du serveur'
        });
      }

      // Générer le token JWT avec expiration à 1h
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        user: {
          // id: user.id,
          // email: user.email,
          username: user.username,
          full_name: user.full_name,
          // is_admin: user.is_admin
        },
        token
      });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de l\'inscription' 
      });
    }
  },
  
  /**
   * Connexion d'un utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  login: async (req, res) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Vérifier les identifiants
      const user = await UserModel.authenticate(email, password);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Email ou mot de passe incorrect' 
        });
      }

      // Vérifier que JWT_SECRET est défini
      if (!process.env.JWT_SECRET) {
        console.error('Erreur critique: JWT_SECRET n\'est pas défini dans les variables d\'environnement');
        return res.status(500).json({
          success: false,
          message: 'Erreur de configuration du serveur'
        });
      }

      // Générer le token JWT avec expiration à 1h
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        success: true,
        message: 'Connexion réussie',
        user: {
          // id: user.id,
          // email: user.email,
          username: user.username,
          full_name: user.full_name,
          // is_admin: user.is_admin
        },
        token
      });
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la connexion' 
      });
    }
  },
  
  /**
   * Déconnexion d'un utilisateur (côté serveur)
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  logout: async (req, res) => {
    try {
      // Comme JWT est stateless, on se contente de journaliser la déconnexion
      // Le token devra être supprimé côté client
      if (req.user) {
        await AccessLogModel.create({
          user_id: req.user.id,
          action: 'LOGOUT',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          success: true
        });
      }
      
      res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      res.status(500).json({ message: 'Erreur lors de la déconnexion' });
    }
  },
  
  /**
   * Vérifie la validité du token JWT
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  verifyToken: (req, res) => {
    // Si cette route est atteinte, c'est que le middleware auth a validé le token
    res.json({ 
      valid: true,
      user: req.user
    });
  },
  
  /**
   * Modification du mot de passe
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  changePassword: async (req, res) => {
    try {
      console.log('Début de changePassword avec req.body:', JSON.stringify(req.body));
      console.log('User info:', JSON.stringify(req.user));
      
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      console.log('currentPassword et newPassword reçus:', !!currentPassword, !!newPassword);
      
      const userId = req.user.id;
      console.log('userId:', userId);
      
      // Récupération de l'utilisateur
      try {
        const user = await UserModel.findById(userId);
        console.log('Utilisateur trouvé:', user ? 'oui' : 'non');
        
        if (!user) {
          return res.status(404).json({ 
            success: false,
            message: 'Utilisateur non trouvé' 
          });
        }
        
        console.log('password_hash présent:', !!user.password_hash);
        
        // Vérification du mot de passe actuel
        try {
          const isPasswordValid = await security.comparePassword(currentPassword, user.password_hash);
          console.log('Mot de passe valide:', isPasswordValid);
          
          if (!isPasswordValid) {
            return res.status(401).json({ 
              success: false,
              message: 'Mot de passe actuel incorrect' 
            });
          }
          
          // Changement du mot de passe
          try {
            await UserModel.changePassword(userId, newPassword);
            console.log('Mot de passe changé avec succès');
            
            // Journalisation du changement de mot de passe
            await AccessLogModel.create({
              user_id: userId,
              action: 'PASSWORD_CHANGE',
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
              success: true
            });
            
            res.json({ 
              success: true,
              message: 'Mot de passe modifié avec succès' 
            });
          } catch (passwordChangeError) {
            console.error('Erreur lors du changement de mot de passe:', passwordChangeError);
            throw new Error('Erreur lors du changement de mot de passe: ' + passwordChangeError.message);
          }
        } catch (compareError) {
          console.error('Erreur lors de la comparaison des mots de passe:', compareError);
          throw new Error('Erreur lors de la vérification du mot de passe: ' + compareError.message);
        }
      } catch (userError) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
        throw new Error('Erreur lors de la récupération de l\'utilisateur: ' + userError.message);
      }
    } catch (error) {
      console.error('Erreur globale lors du changement de mot de passe:', error);
      console.error('Stack trace:', error.stack);
      
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors du changement de mot de passe',
        error: error.message
      });
    }
  },

  /**
   * Récupération des informations de l'utilisateur connecté
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getMe: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          is_admin: user.is_admin,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur serveur' 
      });
    }
  }
};

module.exports = AuthController;