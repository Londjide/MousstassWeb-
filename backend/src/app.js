const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Middleware
const { verifyTokenForPages, auth } = require('./middleware/auth');
const RecordingController = require('./controllers/recording.controller');

// Routes
const authRoutes = require("./routes/auth.routes");
const recordingRoutes = require('./routes/recording.routes');
const userRoutes = require('./routes/user.routes');

// Initialisation de l'application Express
const app = express();

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../frontend/views'));

// Middleware de base
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      mediaSrc: ["'self'", "blob:"],
    },
  }
})); // Sécurité avec configuration pour permettre l'audio
app.use(cors()); // Gestion du CORS
app.use(express.json()); // Parsing du JSON
app.use(express.urlencoded({ extended: true })); // Parsing des URL-encoded forms
app.use(cookieParser());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware pour les logs de base
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Création des répertoires nécessaires
(async () => {
  try {
    await fs.mkdir(path.join(__dirname, '../uploads'), { recursive: true });
    await fs.mkdir(path.join(__dirname, '../temp'), { recursive: true });
  } catch (error) {
    console.error('Erreur lors de la création des répertoires:', error);
  }
})();

// Route racine - Rendu de la vue EJS
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Missié Moustass Web',
    version: '1.0.0'
  });
});

app.get('/profile', (req, res) => {
  res.render('profile', {
    title: 'Mon Profil | Missié Moustass Web'
  });
});

// Routes pour les pages de vues
app.get('/recordings', verifyTokenForPages, (req, res) => {
  RecordingController.getRecordingsPage(req, res);
});

// Page des enregistrements partagés avec moi (sécurisée)
app.get('/shared', verifyTokenForPages, (req, res) => {
  res.render('shared', {
    title: 'Enregistrements partagés avec moi'
  });
});

// Route de page pour l'édition d'un enregistrement
app.get('/recordings/:id/edit', verifyTokenForPages, (req, res) => {
  RecordingController.getEditPage(req, res);
});

// Routes API
app.use("/api/auth", authRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/users', userRoutes);

app.get('/api/protected', auth, (req, res) => {
  res.json({ message: 'Tu es authentifié !' });
});

// Middleware de gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).render('404', {
    title: 'Page non trouvée',
    message: 'La ressource demandée n\'existe pas'
  });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  
  res.status(err.statusCode || 500).render('error', {
    title: 'Erreur',
    message: err.message || 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;