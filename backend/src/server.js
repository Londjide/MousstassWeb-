require('dotenv').config();
const app = require('./app');
const db = require('./models/db');

const PORT = process.env.PORT || 3000;

// Vérification de la connexion à la base de données
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
    process.exit(1);
  });