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
        title: 'Enregistrement ' + recordingId,
        description: 'Description de l\'enregistrement',
        duration: 180, // 3 minutes
        created_at: new Date(),
        file_path: '/path/to/file.webm'
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
          message: 'Enregistrement non trouvé ou vous n\'êtes pas le propriétaire.'
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
      const { target_user_id } = req.body;
      if (!target_user_id) {
        return res.status(400).json({ success: false, message: 'ID du destinataire requis.' });
      }
      const success = await Recording.share(recordingId, sourceUserId, target_user_id);
      if (!success) {
        return res.status(400).json({ success: false, message: 'Partage impossible (droits ou utilisateur inexistant).' });
      }
      res.json({ success: true, message: 'Enregistrement partagé avec succès.' });
    } catch (error) {
      console.error('Erreur lors du partage de l\'enregistrement:', error);
      res.status(500).json({ success: false, message: 'Erreur lors du partage de l\'enregistrement.' });
    }
  },

  /**
   * Streaming d'un enregistrement audio
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  stream: async (req, res) => {
    try {
      console.log(`[stream] Demande de streaming pour l'enregistrement ${req.params.id}`);
      
      // Vérifier la présence d'une signature pour les accès partagés
      const signature = req.query.signature;
      const isSharedAccess = !!signature;
      
      console.log(`[stream] Type d'accès: ${isSharedAccess ? 'Partagé (avec signature)' : 'Direct (utilisateur propriétaire)'}`);
      
      // Récupérer l'ID de l'enregistrement
      const recordingId = parseInt(req.params.id);
      if (isNaN(recordingId)) {
        console.error('[stream] ID d\'enregistrement invalide:', req.params.id);
        return res.status(400).json({
          success: false,
          message: 'ID d\'enregistrement invalide'
        });
      }
      
      // Récupérer l'utilisateur depuis la requête (middleware d'authentification)
      const userId = req.user.id;
      console.log(`[stream] Demande de l'utilisateur ID: ${userId}`);
      
      let recording;
      
      // Rechercher l'enregistrement différemment selon le type d'accès
      if (isSharedAccess) {
        console.log(`[stream] Vérification de la signature: ${signature}`);
        try {
          // Utiliser le modèle pour vérifier la signature et récupérer l'enregistrement
          recording = await Recording.findById(recordingId, userId);
          console.log(`[stream] Résultat vérification signature: ${recording ? 'Valide' : 'Invalide'}`);
          
          if (!recording) {
            return res.status(403).json({
              success: false,
              message: 'Signature invalide ou expirée'
            });
          }
        } catch (signatureError) {
          console.error('[stream] Erreur lors de la vérification de la signature:', signatureError);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification de la signature'
          });
        }
      } else {
        // Accès direct, vérifier que l'utilisateur est propriétaire ou a accès
        console.log(`[stream] Vérification de l'accès direct pour l'utilisateur ${userId}`);
        recording = await Recording.findById(recordingId, userId);
      }
      
      // Vérifier si l'enregistrement existe et si l'utilisateur a les droits d'accès
      if (!recording) {
        console.error(`[stream] Enregistrement ${recordingId} non trouvé ou accès non autorisé`);
        return res.status(404).json({
          success: false,
          message: 'Enregistrement non trouvé ou accès non autorisé'
        });
      }
      
      // Récupérer les clés de l'utilisateur
      console.log(`[stream] Récupération des clés pour l'utilisateur ${userId}`);
      const [keyRows] = await db.query('SELECT private_key FROM user_keys WHERE user_id = ?', [userId]);
      
      if (keyRows.length === 0) {
        console.error(`[stream] Clés non trouvées pour l'utilisateur ${userId}`);
        return res.status(500).json({
          success: false,
          message: 'Erreur de configuration des clés de chiffrement'
        });
      }
      
      const privateKey = keyRows[0].private_key;
      
      // Récupérer les données audio
      console.log(`[stream] Récupération du contenu audio pour l'enregistrement ${recordingId}`);
      try {
        const audioData = await Recording.getAudioContent(recording, privateKey, signature);
        
        // Configuration du téléchargement si demandé
        const isDownload = req.query.download === 'true';
        if (isDownload) {
          console.log('[stream] Mode téléchargement activé');
          res.setHeader('Content-Disposition', `attachment; filename="${recording.name || 'recording'}.${recording.audio_format || 'webm'}"`);
        } else {
          console.log('[stream] Mode streaming (sans téléchargement)');
          res.setHeader('Content-Disposition', 'inline');
        }
        
        // Définir le type MIME en fonction du format audio
        let contentType = 'audio/webm';
        if (recording.audio_format === 'mp3') {
          contentType = 'audio/mpeg';
        } else if (recording.audio_format === 'ogg') {
          contentType = 'audio/ogg';
        } else if (recording.audio_format === 'wav') {
          contentType = 'audio/wav';
        }
        
        // Définir les en-têtes pour le streaming audio
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', audioData.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Envoyer directement les données audio
        console.log(`[stream] Envoi de ${audioData.length} octets au client avec Content-Type: ${contentType}`);
        res.end(audioData);
        
      } catch (audioError) {
        console.error('[stream] Erreur lors de la récupération du contenu audio:', audioError);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération du contenu audio'
        });
      }
      
    } catch (error) {
      console.error('[stream] Erreur lors du streaming audio:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du streaming audio'
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
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des enregistrements partagés.' });
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
          message: 'Vous n\'avez pas les droits pour modifier cet enregistrement'
        });
      }
      
      // Mise à jour de l'enregistrement
      const success = await Recording.update(recordingId, { name, description });
      
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour de l\'enregistrement'
        });
      }
      
      // Récupérer l'enregistrement mis à jour
      const updatedRecording = await Recording.findById(recordingId, userId);
      
      res.json({
        success: true,
        message: 'Enregistrement mis à jour avec succès',
        recording: updatedRecording
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erreur lors de la mise à jour de l\'enregistrement' 
      });
    }
  },

  /**
   * Partage un enregistrement avec un token d'accès unique
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  shareWithToken: async (req, res) => {
    try {
      const recordingId = parseInt(req.params.id);
      const sourceUserId = req.user.id;
      const { permissions, maxUses, expiration } = req.body;
      
      // Créer un partage avec token
      const shareInfo = await Recording.shareWithToken(recordingId, sourceUserId, permissions, {
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiration: expiration || null
      });
      
      // Retourner les infos du partage, incluant le token et le secret
      res.json({
        success: true,
        message: 'Enregistrement partagé avec succès via token d\'accès',
        shareInfo
      });
    } catch (error) {
      console.error('Erreur lors du partage de l\'enregistrement avec token:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du partage de l\'enregistrement avec token d\'accès'
      });
    }
  },

  /**
   * Récupère les informations d'un enregistrement partagé par token
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getRecordingInfoWithToken: async (req, res) => {
    try {
      const token = req.query.token;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token d\'accès requis'
        });
      }
      
      // Récupérer les infos de l'enregistrement
      const recordingInfo = await Recording.getRecordingInfoWithToken(token);
      
      res.json({
        success: true,
        recording: recordingInfo
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des informations de l\'enregistrement:', error);
      res.status(403).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des informations de l\'enregistrement'
      });
    }
  },

  /**
   * Accède à un enregistrement avec un token et un secret
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  streamWithToken: async (req, res) => {
    try {
      const token = req.query.token;
      const secret = req.query.secret;
      const isProbe = req.query.probe === 'true'; // Mode de sondage pour vérification sans streaming
      
      // Validation des inputs
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token d\'accès requis'
        });
      }
      
      if (!secret) {
        return res.status(400).json({
          success: false,
          message: 'Secret d\'accès requis'
        });
      }
      
      // Journalisation de la tentative d'accès
      console.log(`[CONTROLLER] Tentative d'accès à un enregistrement avec token: ${token.substring(0, 8)}... (probe: ${isProbe})`);
      
      try {
        // Récupérer le contenu audio avec le token et le secret
        const { audio, metadata } = await Recording.getAudioContentWithToken(token, secret);
        
        // En mode probe, ne pas envoyer l'audio, juste confirmer que tout est OK
        if (isProbe) {
          return res.json({
            success: true,
            message: 'Vérification réussie, les données audio sont disponibles',
            metadata: {
              name: metadata.name,
              size: audio.length,
              duration: metadata.duration,
              format: metadata.audioFormat || 'unknown'
            }
          });
        }
        
        // Déterminer si c'est une demande de téléchargement
        const isDownload = req.query.download === 'true';
        
        // Déterminer le type MIME basé sur le format audio détecté ou stocké dans les métadonnées
        let contentType = 'audio/webm'; // Type par défaut
        let fileExtension = 'webm';     // Extension par défaut
        
        // Utiliser d'abord le format des métadonnées s'il existe
        if (metadata.audioFormat) {
          switch (metadata.audioFormat) {
          case 'webm':
            contentType = 'audio/webm';
            fileExtension = 'webm';
            break;
          case 'mp3':
            contentType = 'audio/mpeg';
            fileExtension = 'mp3';
            break;
          case 'ogg':
            contentType = 'audio/ogg';
            fileExtension = 'ogg';
            break;
          case 'wav':
            contentType = 'audio/wav';
            fileExtension = 'wav';
            break;
          }
        } 
        // Si aucun format n'est spécifié dans les métadonnées, tenter de détecter à partir du contenu
        else {
          // Vérifier si c'est un format WebM (commence par 1A 45 DF A3)
          if (audio.length > 4 && 
              audio[0] === 0x1A && 
              audio[1] === 0x45 && 
              audio[2] === 0xDF && 
              audio[3] === 0xA3) {
            contentType = 'audio/webm';
            fileExtension = 'webm';
          } 
          // Vérifier si c'est un format MP3 (commence par ID3 ou FF FB)
          else if (audio.length > 3 && 
                  ((audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33) || 
                   (audio[0] === 0xFF && (audio[1] & 0xE0) === 0xE0))) {
            contentType = 'audio/mpeg';
            fileExtension = 'mp3';
          }
          // Format OGG Vorbis (commence par "OggS")
          else if (audio.length > 4 && 
                  audio[0] === 0x4F && audio[1] === 0x67 && 
                  audio[2] === 0x67 && audio[3] === 0x53) {
            contentType = 'audio/ogg';
            fileExtension = 'ogg';
          }
          // Format WAV (commence par "RIFF" suivi de "WAVE")
          else if (audio.length > 12 && 
                  audio[0] === 0x52 && audio[1] === 0x49 && 
                  audio[2] === 0x46 && audio[3] === 0x46 &&
                  audio[8] === 0x57 && audio[9] === 0x41 && 
                  audio[10] === 0x56 && audio[11] === 0x45) {
            contentType = 'audio/wav';
            fileExtension = 'wav';
          }
          else {
            // Si le format n'est pas reconnu, utiliser un type générique
            contentType = 'application/octet-stream';
            fileExtension = 'bin';
            console.log('[CONTROLLER] Format audio non reconnu. Premiers octets:', 
              audio.slice(0, 16).toString('hex'));
          }
        }
        
        // Log détaillé des informations de format
        console.log(`[CONTROLLER] Format audio: ${metadata.audioFormat || 'non spécifié dans les métadonnées'}`);
        console.log(`[CONTROLLER] Content-Type déterminé: ${contentType}`);
        console.log(`[CONTROLLER] Taille des données audio: ${audio.length} octets`);
        console.log(`[CONTROLLER] Premiers octets: ${audio.slice(0, 16).toString('hex')}`);
        
        // Configurer les en-têtes de réponse
        res.set('Content-Type', contentType);
        
        // Autres en-têtes pour améliorer la compatibilité
        res.set('Accept-Ranges', 'bytes');
        res.set('Cache-Control', 'no-cache, no-transform');
        res.set('Access-Control-Allow-Origin', '*');
        
        if (isDownload) {
          res.set('Content-Disposition', `attachment; filename="${metadata.name || 'audio'}.${fileExtension}"`);
        } else {
          res.set('Content-Disposition', `inline; filename="${metadata.name || 'audio'}.${fileExtension}"`);
        }
        
        // Journalisation du succès
        console.log(`[CONTROLLER] Accès réussi à l'enregistrement avec token: ${token.substring(0, 8)}...`);
        
        // Envoyer les données audio
        res.send(audio);
      } catch (error) {
        // Différencier les types d'erreur
        console.error('[CONTROLLER] Erreur lors de l\'accès à l\'enregistrement avec token:', error);
        
        const errorResponse = {
          success: false,
          message: error.message || 'Erreur lors de l\'accès à l\'enregistrement',
          errorType: 'unknown',
          timestamp: new Date().toISOString()
        };
        
        if (error.message.includes('Token de partage invalide')) {
          errorResponse.errorType = 'invalid_token';
          return res.status(403).json(errorResponse);
        } else if (error.message.includes('partage a expiré')) {
          errorResponse.errorType = 'expired_token';
          return res.status(403).json(errorResponse);
        } else if (error.message.includes('Secret d\'accès invalide')) {
          errorResponse.errorType = 'invalid_secret';
          return res.status(401).json(errorResponse);
        } else if (error.message.includes('lecture du fichier')) {
          errorResponse.errorType = 'file_not_found';
          return res.status(500).json(errorResponse);
        } else if (error.message.includes('déchiffrement')) {
          errorResponse.errorType = 'decryption_error';
          return res.status(400).json(errorResponse);
        } else if (error.message.includes('format de fichier')) {
          errorResponse.errorType = 'invalid_format';
          return res.status(500).json(errorResponse);
        } else {
          return res.status(500).json(errorResponse);
        }
      }
    } catch (error) {
      console.error('Erreur générale dans streamWithToken:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors du traitement de la demande',
        errorType: 'server_error',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = RecordingController; 