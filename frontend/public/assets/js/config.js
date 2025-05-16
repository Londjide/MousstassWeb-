/**
 * Configuration générale de l'application Missié Moustass Web
 */
const config = {
    // URL de base de l'API
    apiUrl: '/api', 
    
    // Timeout pour les requêtes API (en ms)
    apiTimeout: 10000,
    
    // Durée de validité du token JWT (en ms) - 24h
    tokenExpiry: 24 * 60 * 60 * 1000,
    
    // Clé de stockage local du token
    tokenKey: 'moustass_token',
    
    // Clé de stockage local des informations utilisateur
    userKey: 'moustass_user',
    
    // Pagination par défaut
    defaultPageSize: 10,
    
    // Configuration audio
    audio: {
      // Format d'enregistrement
      mimeType: 'audio/webm',
      
      // Qualité de l'enregistrement
      audioBitsPerSecond: 128000
    },

    // URLs des services
    serviceUrls: {
      frontend: 'http://localhost:8080',
      backend: 'http://localhost:3001',
      apache: 'http://localhost:8081',
      apacheSSL: 'https://localhost:8443'
    }
  };