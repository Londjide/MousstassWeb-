const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 80;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    backendUrl, 
    title: 'MousstassWeb - Enregistrements Audio Sécurisés',
    version: '3.0.0'
  });
});

// Route pour la page des enregistrements
app.get('/recordings', (req, res) => {
  res.render('recordings', { 
    backendUrl, 
    title: 'Mes Enregistrements - MousstassWeb',
    version: '3.0.0',
    recordings: [], // Tableau vide d'enregistrements par défaut
    currentPage: 1,
    totalPages: 1
  });
});

// Route pour la page des enregistrements partagés
app.get('/shared', (req, res) => {
  res.render('shared', { 
    backendUrl, 
    title: 'Enregistrements Partagés - MousstassWeb',
    version: '3.0.0'
  });
});

// Route pour la page de profil
app.get('/profile', (req, res) => {
  res.render('profile', { 
    backendUrl, 
    title: 'Mon Profil - MousstassWeb',
    version: '3.0.0'
  });
});

// Page d'erreur 404
app.use((req, res) => {
  res.status(404).render('404', { 
    backendUrl, 
    title: 'Page Non Trouvée - MousstassWeb',
    version: '3.0.0',
    message: 'La page que vous avez demandée n\'existe pas.'
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
  console.log(`Connected to backend at ${backendUrl}`);
});
