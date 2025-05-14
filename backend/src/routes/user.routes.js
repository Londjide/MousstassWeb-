const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/user.controller');
const PreferenceController = require('../controllers/preference.controller');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const UserModel = require('../models/user.model');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

/**
 * @route GET /api/users/profile
 * @desc Récupère le profil de l'utilisateur connecté
 * @access Private
 */
router.get('/profile', UserController.getProfile);

/**
 * @route PUT /api/users/profile
 * @desc Met à jour le profil de l'utilisateur
 * @access Private
 */
router.put(
  '/profile',
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    
    body('full_name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom complet doit contenir entre 2 et 100 caractères')
  ],
  UserController.updateProfile
);

/**
 * @route GET /api/users/preferences
 * @desc Récupère les préférences de l'utilisateur
 * @access Private
 */
router.get('/preferences', PreferenceController.getPreferences);

/**
 * @route PUT /api/users/preferences
 * @desc Met à jour les préférences de l'utilisateur
 * @access Private
 */
router.put(
  '/preferences',
  [
    body('dark_mode')
      .optional()
      .isBoolean()
      .withMessage('La valeur du mode sombre doit être un booléen'),
    
    body('notifications')
      .optional()
      .isBoolean()
      .withMessage('La valeur des notifications doit être un booléen')
  ],
  PreferenceController.updatePreferences
);

// Récupérer un utilisateur par email
router.get('/by-email', UserController.getByEmail);

/**
 * @route GET /api/users/:id
 * @desc Récupère un utilisateur par son ID
 * @access Private
 */
router.get('/:id', UserController.getUser);

// Configuration de multer pour stocker les fichiers dans uploads/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'user_' + req.user.id + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Route pour uploader la photo de profil
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier envoyé' });
    }
    // Mettre à jour le champ photo_url de l'utilisateur
    const photoUrl = '/uploads/' + req.file.filename;
    await UserModel.updatePhotoUrl(req.user.id, photoUrl);
    res.json({ success: true, photo_url: photoUrl });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
