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

      const { name, description } = req.body;
      const duration = parseInt(req.body.duration) || 0;
      const userId = req.user.id;
      
      // Lire le contenu du fichier temporaire
      const audioBuffer = await fs.readFile(req.file.path);
      
      // Créer l'enregistrement
      const recording = await Recording.create(
        { name, userId, duration, description },
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
      const recordingId = parseInt(req.params.id);
      const userId = req.user.id;
      const success = await Recording.delete(recordingId, userId);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Enregistrement non trouvé ou vous n'êtes pas le propriétaire."
        });
      }
      res.json({
        success: true,
        message: 'Enregistrement supprimé avec succès.'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'enregistrement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de l\'enregistrement.'
      });
    }
  },

  /**
   * Partage un enregistrement avec un autre utilisateur
   * @route POST /api/recordings/:id/share
   */
  share: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      const sourceUserId = req.user.id;
      const { target_user_id, permissions } = req.body;
      if (!target_user_id) {
        return res.status(400).json({ success: false, message: "ID du destinataire requis." });
      }
      const success = await Recording.share(recordingId, sourceUserId, target_user_id, permissions);
      if (!success) {
        return res.status(400).json({ success: false, message: "Partage impossible (droits ou utilisateur inexistant)." });
      }
      res.json({ success: true, message: "Enregistrement partagé avec succès." });
    } catch (error) {
      console.error('Erreur lors du partage de l\'enregistrement:', error);
      res.status(500).json({ success: false, message: "Erreur lors du partage de l'enregistrement." });
    }
  },

  /**
   * Streaming d'un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  stream: async (req, res) => {
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
      
      // Vérifier si c'est un partage avec un autre utilisateur
      const isSharedWithOther = recording.user_id !== userId;
      let signature = null;
      
      // Si c'est un partage avec un autre utilisateur, vérifier la signature
      if (isSharedWithOther) {
        signature = req.query.signature;
        if (!signature) {
          return res.status(403).json({
            success: false,
            message: 'Une signature est requise pour accéder à cet enregistrement partagé'
          });
        }
        
        // Associer l'ID de l'utilisateur actuel pour la vérification
        recording.target_user_id = userId;
      }
      
      // Récupérer la clé privée de l'utilisateur
      const privateKey = await User.getPrivateKey(userId);
      if (!privateKey) {
        return res.status(500).json({
          success: false,
          message: 'Clé privée introuvable'
        });
      }
      
      // Déchiffrer le contenu audio avec signature si nécessaire
      const audioData = await Recording.getAudioContent(recording, privateKey, signature);
      
      // Déterminer le type MIME (par défaut webm)
      res.set('Content-Type', 'audio/webm');
      res.set('Content-Disposition', `inline; filename="${recording.name || 'audio'}.webm"`);
      res.send(audioData);
    } catch (error) {
      console.error('Erreur lors du streaming audio:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du streaming audio: ' + error.message
      });
    }
  },

  /**
   * Génère une signature pour accéder à un enregistrement partagé
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  generateSignature: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Vérifier si l'utilisateur a accès à l'enregistrement
      const recording = await Recording.findById(recordingId, userId);
      if (!recording) {
        return res.status(404).json({
          success: false,
          message: 'Enregistrement non trouvé ou accès non autorisé'
        });
      }
      
      // Vérifier si c'est un partage (pas son propre enregistrement)
      if (recording.user_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'Aucune signature requise pour vos propres enregistrements'
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
      
      // Générer la signature
      const signature = await Recording.generateSignature(recordingId, privateKey);
      
      res.json({
        success: true,
        signature,
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      });
    } catch (error) {
      console.error('Erreur lors de la génération de la signature:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de la signature: ' + error.message
      });
    }
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

  getSharedWithMe: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`[getSharedWithMe] Récupération des partages pour l'utilisateur ${userId}`);
      // Récupérer tous les enregistrements partagés avec cet utilisateur, même ceux dont il est propriétaire
      const [rows] = await db.query(`
        SELECT r.id, r.name, r.description, r.timestamp, r.duration,
               u.id AS owner_id, u.email AS owner_email, u.full_name AS owner_name, u.photo_url AS owner_avatar,
               s.permissions, s.shared_date AS shared_at,
               CASE WHEN s.source_user_id = s.target_user_id THEN true ELSE false END AS is_self_shared
        FROM shared_recordings s
        JOIN recordings r ON s.recording_id = r.id
        JOIN users u ON r.user_id = u.id
        WHERE s.target_user_id = ?
        ORDER BY s.shared_date DESC
      `, [userId]);
      
      console.log(`[getSharedWithMe] ${rows.length} enregistrements partagés trouvés`);
      
      // Si le owner_name est null, utiliser la partie locale de l'email
      const sharedWithFormattedNames = rows.map(row => ({
        ...row,
        owner_name: row.owner_name || row.owner_email.split('@')[0]
      }));
      
      res.json({ success: true, shared: sharedWithFormattedNames });
    } catch (error) {
      console.error('[getSharedWithMe] Erreur:', error);
      res.status(500).json({ success: false, message: "Erreur lors de la récupération des enregistrements partagés." });
    }
  },

  /**
   * Met à jour un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  update: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      const userId = req.user.id;
      const { name, description } = req.body;
      
      // Vérifier si l'enregistrement existe et si l'utilisateur a les droits d'édition
      const hasEditAccess = await Recording.checkEditAccess(recordingId, userId);
      if (!hasEditAccess) {
        return res.status(403).json({
          success: false,
          message: "Vous n'avez pas les droits pour modifier cet enregistrement"
        });
      }
      
      // Mise à jour de l'enregistrement
      const success = await Recording.update(recordingId, { name, description });
      
      if (!success) {
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la mise à jour de l'enregistrement"
        });
      }
      
      // Récupérer l'enregistrement mis à jour
      const updatedRecording = await Recording.findById(recordingId, userId);
      
      res.json({
        success: true,
        message: "Enregistrement mis à jour avec succès",
        recording: updatedRecording
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la mise à jour de l\'enregistrement' 
      });
    }
  }
};

module.exports = RecordingController; 