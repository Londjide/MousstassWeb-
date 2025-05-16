const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');
const security = require('../utils/security');
const AccessLogModel = require('../models/accesslog.model');

/**
 * Contrôleur pour gérer l'authentification
 */
const AuthController = {
  // Map pour suivre les tentatives de connexion échouées
  loginAttempts: new Map(),
  
  /**
   * Vérifie la force du mot de passe
   * @param {string} password - Mot de passe à vérifier 
   * @returns {boolean} Vrai si le mot de passe est assez fort
   */
  checkPasswordStrength(password) {
    if (!password || password.length < 8) return false;
    
    // Vérifier différents critères de complexité
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // Le mot de passe doit respecter au moins 3 des 4 critères
    return (hasUppercase + hasLowercase + hasNumbers + hasSpecialChars) >= 3;
  },
  
  /**
   * Vérifie si l'adresse IP est bloquée
   * @param {string} ip - Adresse IP à vérifier
   * @returns {boolean} Vrai si l'adresse IP est bloquée
   */
  isIpBlocked(ip) {
    const attempts = this.loginAttempts.get(ip);
    if (!attempts) return false;
    
    // Bloquer après 5 tentatives échouées pendant 15 minutes
    if (attempts.count >= 5) {
      const blockExpiration = attempts.timestamp + 15 * 60 * 1000; // 15 minutes
      if (Date.now() < blockExpiration) {
        return true;
      } else {
        // Réinitialiser les tentatives après la période de blocage
        this.loginAttempts.delete(ip);
        return false;
      }
    }
    return false;
  },
  
  /**
   * Enregistre une tentative de connexion échouée
   * @param {string} ip - Adresse IP à enregistrer
   */
  recordFailedAttempt(ip) {
    const attempts = this.loginAttempts.get(ip) || { count: 0, timestamp: Date.now() };
    attempts.count += 1;
    attempts.timestamp = Date.now();
    this.loginAttempts.set(ip, attempts);
  },
  
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

      // Vérifier la force du mot de passe
      if (!AuthController.checkPasswordStrength(password)) {
        return res.status(400).json({ 
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères et combiner majuscules, minuscules, chiffres et caractères spéciaux' 
        });
      }
      
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

      // Générer le token JWT avec expiration à 7 jours
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
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
      console.log('Tentative de connexion avec les données:', JSON.stringify(req.body));
      
      // Vérifier si l'IP est bloquée pour cause de trop nombreuses tentatives
      const clientIp = req.ip;
      if (AuthController.isIpBlocked(clientIp)) {
        console.log(`Tentative de connexion bloquée pour l'IP: ${clientIp} (trop de tentatives)`);
        return res.status(429).json({
          success: false,
          message: 'Trop de tentatives infructueuses. Réessayez dans 15 minutes.'
        });
      }
      
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Erreurs de validation:', JSON.stringify(errors.array()));
        return res.status(400).json({ 
          success: false, 
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('Email ou mot de passe manquant');
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis'
        });
      }

      console.log(`Tentative d'authentification pour l'email: ${email}`);
      
      // Vérifier les identifiants
      const user = await UserModel.authenticate(email, password);
      
      if (!user) {
        console.log(`Échec d'authentification pour l'email: ${email}`);
        // Enregistrer la tentative échouée
        AuthController.recordFailedAttempt(clientIp);
        return res.status(401).json({ 
          success: false,
          message: 'Email ou mot de passe incorrect' 
        });
      }

      console.log(`Authentification réussie pour l'utilisateur: ${user.email}`);
      
      // Réinitialiser les tentatives de connexion pour cette IP
      AuthController.loginAttempts.delete(clientIp);

      // Vérifier que JWT_SECRET est défini
      if (!process.env.JWT_SECRET) {
        console.error('Erreur critique: JWT_SECRET n\'est pas défini dans les variables d\'environnement');
        return res.status(500).json({
          success: false,
          message: 'Erreur de configuration du serveur'
        });
      }

      // Générer le token JWT avec expiration à 7 jours
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log(`Token généré pour l'utilisateur: ${user.email}`);

      // Journaliser la connexion réussie
      try {
        await AccessLogModel.create({
          user_id: user.id,
          action: 'LOGIN',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          success: true
        });
      } catch (logError) {
        console.error('Erreur lors de la journalisation de la connexion:', logError);
        // Ne pas bloquer l'authentification en cas d'erreur de journalisation
      }

      res.json({
        success: true,
        message: 'Connexion réussie',
        user: {
          username: user.username,
          full_name: user.full_name,
        },
        token
      });
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur serveur lors de la connexion' 
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