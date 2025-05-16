const jwt = require('jsonwebtoken');

/**
 * Middleware pour vérifier le token JWT pour les API
 */
const auth = (req, res, next) => {
  console.log('[auth] Middleware appelé pour ' + req.originalUrl);
  
  try {
    // Récupérer le token depuis l'en-tête Authorization
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // Vérifier également le token dans les cookies
    if (!token && req.cookies) {
      token = req.cookies.token || req.cookies.moustass_token;
    }
    
    // Vérifier aussi le paramètre token dans l'URL
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      console.log('[auth] Aucun token trouvé pour ' + req.originalUrl);
      return res.status(401).json({
        success: false,
        message: 'Accès refusé, token manquant'
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log('[auth] Token valide pour user ' + decoded.id);
      next();
    } catch (error) {
      console.error('[auth] Token invalide:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  } catch (error) {
    console.error('[auth] Erreur:', error);
    return res.status(500).json({
      success: false, 
      message: 'Erreur côté serveur'
    });
  }
};

/**
 * Middleware pour vérifier le token JWT pour les pages (EJS views)
 */
const verifyTokenForPages = (req, res, next) => {
  console.log(`[verifyTokenForPages] Vérification d'authentification pour: ${req.originalUrl}`);
  
  try {
    // Récupérer le token depuis les cookies
    let token = req.cookies && (req.cookies.token || req.cookies.moustass_token);
    let tokenSource = token ? "cookie" : "none";
    
    // Vérifier ensuite l'en-tête Authorization (Bearer token)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      // Format: "Bearer <token>"
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        tokenSource = "authorization header";
      }
    }

    // Vérifier également si le token est passé en paramètre d'URL (pour l'exportation/partage)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
      tokenSource = "query parameter";
    }

    // Si pas de token, rediriger vers la page de connexion
    if (!token) {
      console.log(`[verifyTokenForPages] Token non trouvé pour ${req.originalUrl}, redirection vers la page d'accueil`);
      
      // Pour les requêtes AJAX, renvoyer un statut 401 au lieu de rediriger
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, message: 'Authentification requise' });
      }
      
      return res.redirect('/');
    }

    console.log(`[verifyTokenForPages] Token trouvé (source: ${tokenSource}) pour ${req.originalUrl}`);

    // Vérifier que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      console.error('[verifyTokenForPages] Erreur critique: JWT_SECRET n\'est pas défini dans les variables d\'environnement');
      return res.redirect('/');
    }

    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      // Mettre à jour le cookie token si nécessaire (renouvellement)
      if (tokenSource !== "cookie" || (!req.cookies.token && !req.cookies.moustass_token)) {
        console.log(`[verifyTokenForPages] Mise à jour des cookies pour ${req.originalUrl}`);
        res.cookie('token', token, { 
          path: '/',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });
        res.cookie('moustass_token', token, {
          path: '/',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });
      }
      
      console.log(`[verifyTokenForPages] Token validé pour user ${decoded.id} sur ${req.originalUrl}`);
      next();
    } catch (jwtError) {
      console.error(`[verifyTokenForPages] Erreur lors de la vérification JWT (${req.originalUrl}):`, jwtError.name, jwtError.message);
      
      // Nettoyer les cookies invalides
      res.clearCookie('token');
      res.clearCookie('moustass_token');
      
      // Pour les requêtes AJAX, renvoyer un statut 401 au lieu de rediriger
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, message: 'Token invalide' });
      }
      
      return res.redirect('/');
    }
  } catch (error) {
    console.error(`[verifyTokenForPages] Erreur d'authentification générale (${req.originalUrl}):`, error);
    
    // Pour les requêtes AJAX, renvoyer un statut 500 au lieu de rediriger
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: 'Erreur d\'authentification' });
    }
    
    return res.redirect('/');
  }
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Accès réservé aux administrateurs'
  });
};

module.exports = {
  auth,
  authenticateToken: auth, // Alias pour compatibilité
  verifyTokenForPages,
  admin: adminMiddleware
};