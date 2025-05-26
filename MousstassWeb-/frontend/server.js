const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const axios = require('axios');
const helmet = require('helmet');

// Configuration
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Création de l'application Express
const app = express();

// Configuration des middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", BACKEND_URL, "http://localhost:3000"]
        }
    }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration du moteur de template EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware pour vérifier l'authentification
const checkAuth = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.locals.user = null, next();
    }
    
    // Stockage du token pour les vues
    res.locals.token = token;
    
    // Récupération des informations utilisateur depuis le backend
    axios.get(`${BACKEND_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
        if (response.data && response.data.success) {
            res.locals.user = response.data.user;
        } else {
            res.locals.user = null;
        }
        next();
    })
    .catch(error => {
        console.error('Erreur de vérification du token:', error.message);
        res.locals.user = null;
        next();
    });
};

// Appliquer le middleware d'authentification à toutes les routes
app.use(checkAuth);

// Routes principales
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Accueil',
        user: res.locals.user,
        messages: req.query
    });
});

app.get('/login', (req, res) => {
    // Rediriger si déjà connecté
    if (res.locals.user) {
        return res.redirect('/');
    }
    
    res.render('login', { 
        title: 'Connexion',
        user: null,
        messages: req.query
    });
});

app.get('/register', (req, res) => {
    // Rediriger si déjà connecté
    if (res.locals.user) {
        return res.redirect('/');
    }
    
    res.render('register', { 
        title: 'Inscription',
        user: null,
        messages: req.query
    });
});

app.get('/profile', (req, res) => {
    // Rediriger si non connecté
    if (!res.locals.user) {
        return res.redirect('/login?error=Veuillez vous connecter pour accéder à votre profil');
    }
    
    res.render('profile', { 
        title: 'Mon Profil',
        user: res.locals.user,
        messages: req.query
    });
});

app.get('/recordings', (req, res) => {
    // Rediriger si non connecté
    if (!res.locals.user) {
        return res.redirect('/login?error=Veuillez vous connecter pour accéder à vos enregistrements');
    }
    
    res.render('recordings', { 
        title: 'Mes Enregistrements',
        user: res.locals.user,
        messages: req.query
    });
});

app.get('/shared', (req, res) => {
    // Rediriger si non connecté
    if (!res.locals.user) {
        return res.redirect('/login?error=Veuillez vous connecter pour accéder aux enregistrements partagés');
    }
    
    res.render('shared', { 
        title: 'Enregistrements Partagés',
        user: res.locals.user,
        messages: req.query
    });
});

app.get('/recordings/new', (req, res) => {
    // Rediriger si non connecté
    if (!res.locals.user) {
        return res.redirect('/login?error=Veuillez vous connecter pour créer un enregistrement');
    }
    
    res.render('recordings/new', { 
        title: 'Nouvel Enregistrement',
        user: res.locals.user,
        messages: req.query
    });
});

app.get('/recordings/:id', (req, res) => {
    // Rediriger si non connecté
    if (!res.locals.user) {
        return res.redirect('/login?error=Veuillez vous connecter pour accéder à cet enregistrement');
    }
    
    const recordingId = req.params.id;
    
    res.render('recordings/show', { 
        title: 'Détails de l\'enregistrement',
        user: res.locals.user,
        recordingId,
        messages: req.query
    });
});

// Ajouter une route de proxy pour les appels API
app.use('/api', (req, res) => {
    const apiUrl = `${BACKEND_URL}${req.url}`;
    console.log(`Proxy API request to: ${apiUrl}`);
    
    // Transférer les entêtes
    const headers = { ...req.headers };
    
    // Supprimer les entêtes qui pourraient causer des problèmes 
    delete headers.host;
    
    // Créer l'objet de configuration pour axios
    const config = {
        method: req.method,
        url: apiUrl,
        headers: headers,
        data: req.body,
        params: req.query
    };
    
    axios(config)
        .then(response => {
            res.status(response.status).json(response.data);
        })
        .catch(error => {
            console.error('Erreur de proxy API:', error.message);
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur de connexion au serveur backend',
                    error: error.message
                });
            }
        });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Page non trouvée',
        user: res.locals.user,
        messages: {}
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur frontend démarré sur le port ${PORT}`);
}); 