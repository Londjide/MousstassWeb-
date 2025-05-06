const express = require('express');
const path = require('path');
const db = require('../../db/connexion');


const app = express();
const port = 3000;

// Configuration middleware

// app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

// Exemple de route
app.get('/', (req, res) => {
  res.send('API Node.js avec MySQL');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));