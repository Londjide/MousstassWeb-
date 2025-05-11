const express = require('express');
const { body } = require('express-validator');
const AudioController = require('../controllers/audio.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route GET /api/audio/user/:userId?
 * @desc Récupère tous les enregistrements audio d'un utilisateur
 * @access Private
 */
router.get(
  '/user/:userId?',
  AudioController.getUserAudioRecords
);

/**
 * @route GET /api/audio/:id
 * @desc Récupère un enregistrement audio par son ID
 * @access Private
 */
router.get(
  '/:id',
  AudioController.getAudioRecord
);

/**
 * @route GET /api/audio/:id/data
 * @desc Récupère les données audio déchiffrées
 * @access Private
 */
router.get(
  '/:id/data',
  AudioController.getAudioData
);

/**
 * @route POST /api/audio
 * @desc Crée un nouvel enregistrement audio
 * @access Private
 */
router.post(
  '/',
  [
    body('filename')
      .isLength({ min: 1, max: 255 })
      .withMessage('Le nom de fichier doit contenir entre 1 et 255 caractères'),
    
    body('audio_data')
      .notEmpty()
      .withMessage('Les données audio sont requises'),
    
    body('description')
      .optional()
      .isString()
      .withMessage('La description doit être une chaîne de caractères'),
    
    body('duration_seconds')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La durée doit être un entier positif')
  ],
  AudioController.createAudioRecord
);

/**
 * @route PUT /api/audio/:id
 * @desc Met à jour un enregistrement audio
 * @access Private
 */
router.put(
  '/:id',
  [
    body('description')
      .optional()
      .isString()
      .withMessage('La description doit être une chaîne de caractères')
  ],
  AudioController.updateAudioRecord
);

/**
 * @route DELETE /api/audio/:id
 * @desc Supprime un enregistrement audio
 * @access Private
 */
router.delete(
  '/:id',
  AudioController.deleteAudioRecord
);

module.exports = router;