const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Clé secrète pour vérifier les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'MoustassWeb_secret_key';

/**
 * Middleware d'authentification pour vérifier les tokens JWT
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const authMiddleware = async (req, res, next) => {
  try {
    let token;
    
    // Vérifier si le token est dans l'en-tête Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Sinon, vérifier s'il est dans les cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Si aucun token trouvé
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Authentification requise.'
      });
    }
    
    // Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Récupérer les informations utilisateur
    const user = await User.findById(decoded.id);
    
    // Si l'utilisateur n'existe pas
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé. Veuillez vous reconnecter.'
      });
    }
    
    // Ajouter les informations utilisateur à la requête
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide. Veuillez vous reconnecter.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expirée. Veuillez vous reconnecter.'
      });
    }
    
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification'
    });
  }
};

module.exports = authMiddleware; 