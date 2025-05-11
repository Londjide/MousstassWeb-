const Recording = require('../models/recording.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const db = require('../models/db');

/**
 * Contrôleur pour la gestion des enregistrements audio
 */
const RecordingController = {
  /**
   * Crée un nouvel enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  create: async (req, res) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Vérifier si le fichier audio a été fourni
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'Fichier audio requis' 
        });
      }

      const { name } = req.body;
      const duration = parseInt(req.body.duration) || 0;
      const userId = req.user.id;
      
      // Lire le contenu du fichier temporaire
      const audioBuffer = await fs.readFile(req.file.path);
      
      // Créer l'enregistrement
      const recording = await Recording.create(
        { name, userId, duration },
        audioBuffer
      );
      
      // Supprimer le fichier temporaire
      await fs.unlink(req.file.path);
      
      res.status(201).json({
        success: true,
        message: 'Enregistrement créé avec succès',
        recording
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'enregistrement:', error);
      
      // Supprimer le fichier temporaire en cas d'erreur
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Erreur lors de la suppression du fichier temporaire:', unlinkError);
        }
      }
      
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la création de l\'enregistrement' 
      });
    }
  },

  /**
   * Récupère un enregistrement audio spécifique
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getOne: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      
      // Simulation d'un enregistrement
      const recording = {
        id: recordingId,
        title: "Enregistrement " + recordingId,
        description: "Description de l'enregistrement",
        duration: 180, // 3 minutes
        created_at: new Date(),
        file_path: "/path/to/file.webm"
      };
      
      res.json({
        success: true,
        recording
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'enregistrement:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la récupération de l\'enregistrement' 
      });
    }
  },

  /**
   * Récupère le contenu audio d'un enregistrement
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getAudio: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Récupérer l'enregistrement et vérifier l'accès
      const recording = await Recording.findById(recordingId, userId);
      
      if (!recording) {
        return res.status(404).json({ 
          success: false,
          message: 'Enregistrement non trouvé ou accès non autorisé' 
        });
      }
      
      // Récupérer la clé privée de l'utilisateur
      const privateKey = await User.getPrivateKey(userId);
      if (!privateKey) {
        return res.status(500).json({ 
          success: false,
          message: 'Clé privée introuvable' 
        });
      }
      
      // Déchiffrer le contenu audio
      const audioData = await Recording.getAudioContent(recording, privateKey);
      
      // Envoyer le contenu audio
      res.set('Content-Type', 'audio/webm');
      res.set('Content-Disposition', `attachment; filename="${recording.name}.webm"`);
      res.send(audioData);
    } catch (error) {
      console.error('Erreur lors de la récupération du contenu audio:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la récupération du contenu audio' 
      });
    }
  },

  /**
   * Liste tous les enregistrements de l'utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getAll: async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non authentifié'
        });
      }
      
      const userId = req.user.id;
      console.log(`API - Récupération des enregistrements pour l'utilisateur ${userId}`);
      
      // Récupérer les enregistrements réels depuis la base de données
      const recordings = await Recording.findByUserId(userId);
      console.log(`API - ${recordings.length} enregistrements trouvés`);
      
      res.json({
        success: true,
        count: recordings.length,
        recordings
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des enregistrements:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la récupération des enregistrements' 
      });
    }
  },

  /**
   * Supprime un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  delete: async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Fonctionnalité de suppression non implémentée pour le moment'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'enregistrement:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la suppression de l\'enregistrement' 
      });
    }
  },

  /**
   * Partage un enregistrement avec un autre utilisateur
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  share: async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Fonctionnalité de partage non implémentée pour le moment'
      });
    } catch (error) {
      console.error('Erreur lors du partage de l\'enregistrement:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors du partage de l\'enregistrement' 
      });
    }
  },

  /**
   * Streaming d'un enregistrement audio (non implémenté)
   */
  stream: async (req, res) => {
    res.status(501).json({ success: false, message: 'Streaming non implémenté' });
  },

  /**
   * Affiche la page des enregistrements avec pagination
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  getRecordingsPage: async (req, res) => {
    try {
      // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
      if (!req.user || !req.user.id) {
        return res.redirect('/login');
      }
      
      // Récupérer les enregistrements de l'utilisateur depuis la base de données
      const userId = req.user.id;
      console.log(`Récupération des enregistrements pour l'utilisateur ${userId}`);
      
      // Récupérer les enregistrements réels
      const recordings = await Recording.findByUserId(userId);
      console.log(`${recordings.length} enregistrements trouvés`);
      
      // Rendre la vue avec les données réelles
      res.render('recordings', {
        title: 'Mes Enregistrements',
        version: '1.0.0',
        recordings,
        currentPage: 1,
        totalPages: 1,
        hasSearch: false,
        searchTerm: '',
        sortOption: 'date-desc'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des enregistrements:', error);
      res.status(500).render('error', {
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la récupération des enregistrements.',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  },

  /**
   * Affiche la page d'édition d'un enregistrement
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  getEditPage: async (req, res) => {
    try {
      const userId = req.user.id;
      const recordingId = req.params.id;
      
      // Récupérer l'enregistrement
      const [recordings] = await db.query(
        'SELECT * FROM recordings WHERE id = ? AND user_id = ?',
        [recordingId, userId]
      );
      
      if (recordings.length === 0) {
        return res.status(404).render('404', {
          title: 'Enregistrement introuvable',
          message: "L'enregistrement demandé n'existe pas ou vous n'avez pas les droits pour y accéder."
        });
      }
      
      const recording = recordings[0];
      
      // Rendre la vue avec les données
      res.render('edit-recording', {
        title: `Éditer - ${recording.title}`,
        version: '1.0.0',
        recording
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'enregistrement:', error);
      res.status(500).render('error', {
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la récupération de l\'enregistrement.',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }
};

module.exports = RecordingController; 