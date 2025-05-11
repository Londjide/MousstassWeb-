/**
 * Middleware de gestion globale des erreurs
 */
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    
    // Détermination du statut HTTP
    const status = err.statusCode || 500;
    
    // Message d'erreur
    const message = err.message || 'Une erreur interne s\'est produite';
    
    // En mode développement, on renvoie plus de détails
    const error = process.env.NODE_ENV === 'development' 
      ? { 
          message,
          stack: err.stack,
          details: err.details || null
        }
      : { 
          message 
        };
    
    res.status(status).json({
      success: false,
      error
    });
  }
  
  module.exports = errorHandler;