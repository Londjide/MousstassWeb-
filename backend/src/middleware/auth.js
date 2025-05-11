const jwt = require('jsonwebtoken');

/**
 * Middleware d'authentification pour les routes API
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 * @param {function} next - Fonction next Express
 */
const auth = (req, res, next) => {
  try {
    // Récupérer le token depuis les headers
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé: token manquant'
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
    
    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('Erreur lors de la vérification JWT:', jwtError.name, jwtError.message);
      
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé: token invalide ou expiré'
      });
    }
  } catch (error) {
    console.error('Erreur d\'authentification générale:', error);
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé: erreur d\'authentification'
    });
  }
};

/**
 * Middleware d'authentification pour les pages EJS
 * Ne redirige pas vers la page de login pendant le développement
 */
const verifyTokenForPages = (req, res, next) => {
  try {
    // Récupérer le token depuis les cookies
    let token = req.cookies && req.cookies.token;
    
    // Vérifier ensuite l'en-tête Authorization (Bearer token)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      // Format: "Bearer <token>"
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    
    // Vérifier également si le token est passé en paramètre d'URL (pour l'exportation/partage)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }
    
    // Si pas de token, rediriger vers la page de connexion
    if (!token) {
      console.log("Token non trouvé, redirection vers /login");
      return res.redirect('/login');
    }
    
    // Vérifier que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      console.error('Erreur critique: JWT_SECRET n\'est pas défini dans les variables d\'environnement');
      return res.redirect('/login');
    }
    
    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('Erreur lors de la vérification JWT (pages):', jwtError.name, jwtError.message);
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Erreur d\'authentification générale (pages):', error);
    return res.redirect('/login');
  }
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Privilèges d\'administrateur requis.'
    });
  }
  
  next();
};

module.exports = {
  auth,
  authenticateToken: auth, // Alias pour compatibilité
  verifyTokenForPages,
  admin: adminMiddleware
};