const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./models/db');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Route de base pour tester l'API
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'L\'API fonctionne correctement!' });
});

// Route pour tester la connexion à la base de données
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 as connection_test');
    res.json({ 
      success: true, 
      message: 'Connexion à la base de données réussie!',
      data: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur de connexion à la base de données',
      error: error.message
    });
  }
});

// Route d'authentification simple
app.post('/api/auth/login', (req, res) => {
  // Simulation d'authentification
  const { email, password } = req.body;
  // Dans un vrai système, vous vérifieriez les identifiants dans la base de données
  if (email === 'test@example.com' && password === 'password') {
    res.json({
      success: true,
      token: 'fake-jwt-token',
      user: {
        id: 1,
        name: 'Utilisateur Test',
        email: 'test@example.com'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Email ou mot de passe incorrect'
    });
  }
});

// Route de vérification d'authentification
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Dans un vrai système, vous vérifieriez le token JWT
    if (token === 'fake-jwt-token') {
      res.json({
        success: true,
        user: {
          id: 1,
          name: 'Utilisateur Test',
          email: 'test@example.com'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'Token manquant ou format incorrect'
    });
  }
});

// Route pour créer un utilisateur de test
app.post('/api/users/create-test', async (req, res) => {
  try {
    // Vérification si l'utilisateur existe déjà
    const existingUsers = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      ['test@example.com']
    );
    
    if (existingUsers.length > 0) {
      return res.json({
        success: true,
        message: 'Utilisateur test déjà créé',
        user: existingUsers[0]
      });
    }
    
    // Création d'un utilisateur de test
    const result = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      ['Utilisateur Test', 'test@example.com', '$2a$10$FDGDJ8sFHGJHFSDGHFSDGHFSDGHFSDGH'] // Hash fictif
    );
    
    res.json({
      success: true,
      message: 'Utilisateur test créé avec succès',
      userId: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur test',
      error: error.message
    });
  }
});

// Initialisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Initialiser le pool de connexions
    await db.initDb();
    
    // Initialiser la base de données avec les tables
    await db.initDatabase();
    
    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log(`Serveur backend démarré sur le port ${PORT}`);
      console.log(`API disponible à l'adresse: http://localhost:${PORT}/api/test`);
    });
  } catch (err) {
    console.error('Erreur de démarrage du serveur:', err);
    process.exit(1);
  }
};

// Lancer le serveur
startServer();