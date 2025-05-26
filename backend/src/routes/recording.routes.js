const express = require('express');
const router = express.Router();
const recordingController = require('../controllers/recording.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Toutes les routes d'enregistrement nécessitent une authentification
router.use(authMiddleware);

/**
 * @route GET /api/recordings
 * @desc Récupérer tous les enregistrements de l'utilisateur connecté
 * @access Private
 */
router.get('/', recordingController.getAll);

/**
 * @route GET /api/recordings/:id
 * @desc Récupérer un enregistrement par son ID
 * @access Private
 */
router.get('/:id', recordingController.getOne);

/**
 * @route POST /api/recordings
 * @desc Créer un nouvel enregistrement
 * @access Private
 */
router.post('/', recordingController.uploadMiddleware, recordingController.create);

/**
 * @route PUT /api/recordings/:id
 * @desc Mettre à jour un enregistrement
 * @access Private
 */
router.put('/:id', recordingController.update);

/**
 * @route DELETE /api/recordings/:id
 * @desc Supprimer un enregistrement
 * @access Private
 */
router.delete('/:id', recordingController.delete);

/**
 * @route GET /api/recordings/:id/audio
 * @desc Récupérer les données audio d'un enregistrement
 * @access Private
 */
router.get('/:id/audio', recordingController.getAudio);

// Récupérer les enregistrements partagés avec l'utilisateur
router.get('/shared', recordingController.getSharedWithMe);

// Récupérer l'audio d'un enregistrement (stream)
router.get('/:id/stream', recordingController.stream);

// Générer une signature pour accéder à un enregistrement partagé
router.get('/:id/signature', recordingController.generateSignature);

// Partager un enregistrement (simulé pour le moment)
router.post('/:id/share', recordingController.share);

// Upload sécurisé d'un enregistrement audio
router.post('/upload', upload.single('audio'), recordingController.create);

module.exports = router; 