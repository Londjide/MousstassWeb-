require('dotenv').config();
const app = require('./app');
const db = require('./models/db');

const PORT = process.env.PORT || 3000;

// Fonction pour tenter de se connecter à la base de données avec des retries
const connectWithRetry = (retries = 5, delay = 5000) => {
  console.log(`Tentative de connexion à la base de données... (Essais restants: ${retries})`);
  
  db.testConnection()
    .then(() => {
      console.log('Connexion à la base de données établie avec succès');
      
      // Démarrage du serveur
      app.listen(PORT, () => {
        console.log(`Serveur en écoute sur le port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Impossible de se connecter à la base de données:', err);
      
      if (retries > 0) {
        console.log(`Nouvel essai dans ${delay/1000} secondes...`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      } else {
        console.error('Nombre maximum de tentatives atteint. Arrêt du serveur.');
        process.exit(1);
      }
    });
};

// Démarrer la tentative de connexion
connectWithRetry();