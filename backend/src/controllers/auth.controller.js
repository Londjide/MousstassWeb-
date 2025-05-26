const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const security = require('../utils/security');
const AccessLogModel = require('../models/accesslog.model');

// Clé secrète pour les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'MoustassWeb_secret_key';
// Durée de validité du token (24h)
const JWT_EXPIRES_IN = '24h';

/**
 * Contrôleur pour l'authentification
 */
const authController = {
  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Vérifier que tous les champs requis sont présents
      if (!username || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tous les champs sont obligatoires'
        });
      }
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }
      
      // Vérifier si le nom d'utilisateur est déjà pris
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ 
          success: false, 
          message: 'Ce nom d\'utilisateur est déjà pris'
        });
      }
      
      // Créer l'utilisateur
      const newUser = await User.create({ username, email, password });
      
      // Créer un token JWT
      const token = jwt.sign(
        { id: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          profile_picture: newUser.profile_picture
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
      const { email, password } = req.body;
      
      // Vérifier que tous les champs requis sont présents
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email et mot de passe sont obligatoires'
        });
      }
      
      // Rechercher l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email ou mot de passe incorrect'
        });
      }
      
      // Vérifier le mot de passe
      const passwordMatch = await User.comparePassword(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email ou mot de passe incorrect'
        });
      }
      
      // Créer un token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Définir le cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24h
      });
      
      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture
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
   * Déconnexion d'un utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  logout: (req, res) => {
    try {
      // Supprimer le cookie
      res.clearCookie('token');
      
      res.status(200).json({
        success: true,
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la déconnexion'
      });
    }
  },

  /**
   * Vérification du token JWT
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  verifyToken: (req, res) => {
    try {
      // Si le middleware d'authentification a passé, le token est valide
      res.status(200).json({
        success: true,
        message: 'Token valide',
        user: req.user
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la vérification du token'
      });
    }
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
        const user = await User.findById(userId);
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
            await User.changePassword(userId, newPassword);
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
      const user = await User.findById(req.user.id);
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

module.exports = authController;