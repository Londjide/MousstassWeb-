const db = require('./db');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Modèle pour la gestion des enregistrements audio
 */
class Recording {
  /**
   * Crée un nouvel enregistrement audio
   * @param {Object} recordingData Données de l'enregistrement
   * @param {Buffer} audioBuffer Contenu audio à chiffrer
   * @returns {Promise<Object>} Enregistrement créé
   */
  static async create(recordingData, audioBuffer) {
    console.log(`[RECORDING DEBUG] === DÉBUT CRÉATION ENREGISTREMENT ===`);
    console.log(`[RECORDING DEBUG] Données:`, JSON.stringify(recordingData));
    console.log(`[RECORDING DEBUG] Buffer audio: présent, Taille: ${audioBuffer.length} octets`);
    
    // Détecter le format audio à partir des premiers octets du fichier
    let audioFormat = 'unknown';
    
    // Vérifier si c'est un format WebM (commence par 1A 45 DF A3)
    if (audioBuffer.length > 4 && 
        audioBuffer[0] === 0x1A && 
        audioBuffer[1] === 0x45 && 
        audioBuffer[2] === 0xDF && 
        audioBuffer[3] === 0xA3) {
      audioFormat = 'webm';
    } 
    // Vérifier si c'est un format MP3 (commence par ID3 ou FF FB)
    else if (audioBuffer.length > 3 && 
            ((audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33) || 
             (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0))) {
      audioFormat = 'mp3';
    }
    // Format OGG Vorbis (commence par "OggS")
    else if (audioBuffer.length > 4 && 
            audioBuffer[0] === 0x4F && audioBuffer[1] === 0x67 && 
            audioBuffer[2] === 0x67 && audioBuffer[3] === 0x53) {
      audioFormat = 'ogg';
    }
    // Format WAV (commence par "RIFF" suivi de "WAVE")
    else if (audioBuffer.length > 12 && 
            audioBuffer[0] === 0x52 && audioBuffer[1] === 0x49 && 
            audioBuffer[2] === 0x46 && audioBuffer[3] === 0x46 &&
            audioBuffer[8] === 0x57 && audioBuffer[9] === 0x41 && 
            audioBuffer[10] === 0x56 && audioBuffer[11] === 0x45) {
      audioFormat = 'wav';
    }
    
    console.log(`[RECORDING DEBUG] Format audio détecté: ${audioFormat}`);
    console.log(`[RECORDING DEBUG] Premiers octets: ${audioBuffer.slice(0, 16).toString('hex')}`);
    
    const { name, userId, duration, description } = recordingData;
    const timestamp = new Date();
    
    // Génération d'une clé AES pour chiffrer l'enregistrement
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    console.log(`[RECORDING DEBUG] Génération de la clé AES`);
    
    // Chiffrement des données audio avec AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(audioBuffer),
      cipher.final()
    ]);
    console.log(`[RECORDING DEBUG] Chiffrement des données audio avec AES`);
    console.log(`[RECORDING DEBUG] Données chiffrées: ${encryptedData.length} octets`);
    
    // Création du répertoire des enregistrements si nécessaire
    const uploadDir = path.join(__dirname, '../../uploads');
    console.log(`[RECORDING DEBUG] Création du répertoire de stockage: ${uploadDir}`);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (mkdirError) {
      console.log(`[RECORDING DEBUG] Le répertoire existe déjà.`);
    }
    
    // Génération d'un nom de fichier unique
    const fileName = `${userId}_${Date.now()}.enc`;
    const filePath = path.join(uploadDir, fileName);
    console.log(`[RECORDING DEBUG] Chemin du fichier: ${filePath}`);
    
    // Créer un en-tête enrichi qui stocke également le format audio
    const headerData = {
      iv: iv.toString('hex'),
      format: audioFormat,
      version: '1.0'
    };
    
    // Convertir l'en-tête en JSON et l'encoder en base64
    const headerJson = JSON.stringify(headerData);
    const headerBase64 = Buffer.from(headerJson).toString('base64');
    
    // Ajout de l'en-tête au début du fichier pour le déchiffrement
    const fileData = Buffer.concat([
      Buffer.from(headerBase64),
      Buffer.from('\n'), // Séparateur
      encryptedData
    ]);
    
    console.log(`[RECORDING DEBUG] Écriture du fichier chiffré (${fileData.length} octets)`);
    
    // Écriture du fichier chiffré
    await fs.writeFile(filePath, fileData);
    console.log(`[RECORDING DEBUG] Fichier écrit avec succès`);
    
    // Chiffrement de la clé AES avec la clé publique de l'utilisateur
    console.log(`[RECORDING DEBUG] Recherche de la clé publique de l'utilisateur`);
    const [rows] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [userId]
    );
    
    console.log(`[RECORDING DEBUG] Résultat de la recherche: ${rows.length} lignes trouvées`);
    
    if (rows.length === 0) {
      throw new Error('Clé publique introuvable pour cet utilisateur');
    }
    
    const publicKey = rows[0].public_key;
    console.log(`[RECORDING DEBUG] Clé publique trouvée, chiffrement de la clé AES`);
    
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      aesKey
    ).toString('base64');
    
    console.log(`[RECORDING DEBUG] Clé AES chiffrée avec succès`);
    
    // Sauvegarde en base de données avec le format audio
    const [result] = await db.query(
      'INSERT INTO recordings (name, file_path, timestamp, duration, user_id, encryption_key, description, audio_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, fileName, timestamp, duration, userId, encryptedKey, description || null, audioFormat]
    );
    
    console.log(`[RECORDING DEBUG] Enregistrement sauvegardé en BDD, ID: ${result.insertId}`);
    console.log(`[RECORDING DEBUG] === FIN CRÉATION ENREGISTREMENT (RÉUSSI) ===`);
    
    return {
      id: result.insertId,
      name,
      timestamp,
      duration,
      userId,
      description: description || null,
      audioFormat
    };
  }

  /**
   * Récupère un enregistrement par son ID
   * @param {number} id ID de l'enregistrement
   * @param {number} userId ID de l'utilisateur (pour vérifier l'accès)
   * @returns {Promise<Object|null>} Enregistrement trouvé ou null
   */
  static async findById(id, userId) {
    // Vérifier si l'enregistrement appartient à l'utilisateur ou lui a été partagé
    const [rows] = await db.query(
      `SELECT r.*, 
        CASE 
          WHEN r.user_id = ? THEN true 
          WHEN sr.id IS NOT NULL THEN true 
          ELSE false 
        END AS has_access,
        CASE
          WHEN r.user_id = ? THEN r.encryption_key
          WHEN sr.id IS NOT NULL THEN sr.encryption_key
          ELSE NULL
        END AS proper_key,
        sr.source_user_id,
        sr.target_user_id
      FROM recordings r
      LEFT JOIN shared_recordings sr ON r.id = sr.recording_id AND sr.target_user_id = ?
      WHERE r.id = ?`,
      [userId, userId, userId, id]
    );
    
    if (rows.length === 0 || !rows[0].has_access) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Récupère le contenu audio d'un enregistrement (déchiffré)
   * @param {Object} recording Enregistrement avec sa clé
   * @param {string} privateKey Clé privée de l'utilisateur pour déchiffrer
   * @param {string} signature Signature de l'utilisateur (pour les enregistrements partagés)
   * @returns {Promise<Buffer>} Données audio déchiffrées
   */
  static async getAudioContent(recording, privateKey, signature = null) {
    console.log(`[getAudioContent] Demande de contenu audio pour l'enregistrement ${recording.id}`);
    
    // Vérifier si l'enregistrement est partagé (pas propriétaire)
    const isShared = recording.user_id !== recording.target_user_id;
    
    // Vérifier si l'utilisateur est le propriétaire original
    const isOwner = recording.user_id === recording.target_user_id;
    
    // Si l'enregistrement est partagé et que ce n'est pas un auto-partage, vérifier la signature
    if (isShared && !isOwner && !signature) {
      console.log(`[getAudioContent] Signature requise pour accès partagé`);
      throw new Error('Une signature est requise pour accéder à cet enregistrement partagé');
    }
    
    // Si une signature est fournie et que ce n'est pas un auto-partage, la vérifier
    if (isShared && !isOwner && signature) {
      console.log(`[getAudioContent] Vérification de la signature pour accès partagé`);
      const isValid = await this.verifySignature(recording.id, signature, recording.target_user_id);
      if (!isValid) {
        console.log(`[getAudioContent] Signature invalide`);
        throw new Error('Signature invalide pour cet enregistrement');
      }
    }
    
    try {
      // Lecture du fichier chiffré 
      console.log(`[getAudioContent] Lecture du fichier: ${recording.file_path}`);
      const filePath = path.join(__dirname, '../../uploads', recording.file_path);
      const fileData = await fs.readFile(filePath);
      console.log(`[getAudioContent] Fichier lu: ${fileData.length} octets`);
      
      // Parse les données du fichier avec le nouveau format d'en-tête
      // 1. Trouver la position du séparateur (nouvelle ligne)
      const newlineIndex = fileData.indexOf(0x0A); // 0x0A = '\n'
      
      if (newlineIndex === -1 || newlineIndex === 0) {
        console.error(`[getAudioContent] Format de fichier incorrect - pas de séparateur trouvé`);
        throw new Error('Format de fichier incorrect');
      }
      
      // 2. Extraire et décoder l'en-tête JSON Base64
      const headerBase64 = fileData.slice(0, newlineIndex).toString();
      console.log(`[getAudioContent] En-tête encodé: ${headerBase64.substring(0, 20)}...`);
      
      let headerData;
      try {
        const headerJson = Buffer.from(headerBase64, 'base64').toString();
        headerData = JSON.parse(headerJson);
        console.log(`[getAudioContent] En-tête décodé:`, headerData);
      } catch (headerError) {
        console.error(`[getAudioContent] Erreur de décodage de l'en-tête:`, headerError);
        // Ancienne méthode de décodage pour la compatibilité (peut être supprimée plus tard)
        console.log(`[getAudioContent] Essai avec l'ancien format...`);
        const ivHex = headerBase64;
        headerData = { iv: ivHex };
      }
      
      // 3. Extraire les données chiffrées après le séparateur
      const encryptedData = fileData.slice(newlineIndex + 1);
      console.log(`[getAudioContent] Données chiffrées extraites: ${encryptedData.length} octets`);
      
      // 4. Déchiffrer la clé AES avec la clé privée
      const encryptedKey = recording.proper_key;
      if (!encryptedKey) {
        console.error(`[getAudioContent] Clé de chiffrement introuvable pour l'enregistrement ${recording.id}`);
        throw new Error('Clé de chiffrement introuvable');
      }
      
      console.log(`[getAudioContent] Déchiffrement de la clé AES avec la clé privée RSA`);
      const aesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        Buffer.from(encryptedKey, 'base64')
      );
      
      // 5. Utiliser la clé AES et l'IV pour déchiffrer les données
      console.log(`[getAudioContent] Déchiffrement des données audio avec AES-256-CBC`);
      const iv = Buffer.from(headerData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      console.log(`[getAudioContent] Données déchiffrées: ${decryptedData.length} octets`);
      return decryptedData;
    } catch (error) {
      console.error(`[getAudioContent] Erreur lors du déchiffrement:`, error);
      throw new Error(`Erreur lors de la récupération du contenu audio: ${error.message}`);
    }
  }

  /**
   * Vérifie la signature pour un enregistrement partagé
   * @param {number} recordingId ID de l'enregistrement
   * @param {string} signature Signature fournie
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<boolean>} Vrai si la signature est valide
   */
  static async verifySignature(recordingId, signature, userId) {
    try {
      // Récupérer la clé publique de l'utilisateur
      const [rows] = await db.query(
        'SELECT public_key FROM user_keys WHERE user_id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        return false;
      }
      
      const publicKey = rows[0].public_key;
      
      // Créer un message à vérifier (format standard: recordingId + timestamp)
      const parts = signature.split('.');
      if (parts.length !== 2) {
        return false;
      }
      
      const [signedData, signatureValue] = parts;
      const decodedData = Buffer.from(signedData, 'base64').toString();
      const data = JSON.parse(decodedData);
      
      // Vérifier que les données concernent bien cet enregistrement
      if (data.recordingId !== recordingId) {
        return false;
      }
      
      // Vérifier que la signature n'est pas expirée (validité de 5 minutes)
      const signatureTime = new Date(data.timestamp);
      const now = new Date();
      const diffMinutes = (now - signatureTime) / (1000 * 60);
      
      if (diffMinutes > 5) {
        return false;
      }
      
      // Vérifier la signature cryptographique
      const isValid = crypto.verify(
        'sha256',
        Buffer.from(signedData, 'base64'),
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        Buffer.from(signatureValue, 'base64')
      );
      
      return isValid;
    } catch (error) {
      console.error('Erreur lors de la vérification de la signature:', error);
      return false;
    }
  }

  /**
   * Génère une signature pour accéder à un enregistrement partagé
   * @param {number} recordingId ID de l'enregistrement
   * @param {string} privateKey Clé privée de l'utilisateur
   * @returns {Promise<string>} Signature générée
   */
  static async generateSignature(recordingId, privateKey) {
    try {
      // Créer les données à signer
      const data = {
        recordingId: recordingId,
        timestamp: new Date().toISOString()
      };
      
      // Convertir en JSON et encoder en Base64
      const signedData = Buffer.from(JSON.stringify(data)).toString('base64');
      
      // Signer avec la clé privée
      const signature = crypto.sign(
        'sha256',
        Buffer.from(signedData, 'base64'),
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        }
      ).toString('base64');
      
      // Format: donnéesSignées.signature
      return `${signedData}.${signature}`;
    } catch (error) {
      console.error('Erreur lors de la génération de la signature:', error);
      throw new Error('Impossible de générer la signature');
    }
  }

  /**
   * Liste les enregistrements DONT l'utilisateur est propriétaire
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<Array>} Liste des enregistrements
   */
  static async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.timestamp, r.duration, r.user_id, r.description
      FROM recordings r
      WHERE r.user_id = ?
      ORDER BY r.timestamp DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Supprime un enregistrement
   * @param {number} id ID de l'enregistrement
   * @param {number} userId ID de l'utilisateur (pour vérifier l'accès)
   * @returns {Promise<boolean>} Vrai si suppression réussie
   */
  static async delete(id, userId) {
    // Vérifier si l'enregistrement appartient à l'utilisateur
    const [recordings] = await db.query(
      'SELECT file_path FROM recordings WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (recordings.length === 0) {
      return false;
    }
    
    const filePath = path.join(__dirname, '../../uploads', recordings[0].file_path);
    
    // Supprimer le fichier
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
    }
    
    // Supprimer d'abord les partages associés
    await db.query('DELETE FROM shared_recordings WHERE recording_id = ?', [id]);
    
    // Supprimer l'enregistrement de la BDD
    await db.query('DELETE FROM recordings WHERE id = ?', [id]);
    
    return true;
  }

  /**
   * Partage un enregistrement avec un autre utilisateur
   * @param {number} recordingId ID de l'enregistrement à partager
   * @param {number} sourceUserId ID du propriétaire
   * @param {number} targetUserId ID du destinataire
   * @param {string} permissions Permissions accordées ('read' ou 'edit')
   * @returns {Promise<boolean>} Vrai si partage réussi
   */
  static async share(recordingId, sourceUserId, targetUserId, permissions = 'read') {
    console.log(`Partage de l'enregistrement ${recordingId} de ${sourceUserId} vers ${targetUserId} avec permissions ${permissions}`);
    
    // Vérifier si les permissions sont valides
    if (permissions !== 'read' && permissions !== 'edit') {
      console.log(`Permissions invalides: ${permissions}, utilisation de 'read' par défaut`);
      permissions = 'read';
    }
    
    // Vérifier si l'enregistrement appartient à l'utilisateur source
    const [recordings] = await db.query(
      'SELECT file_path, encryption_key, name FROM recordings WHERE id = ? AND user_id = ?',
      [recordingId, sourceUserId]
    );
    if (recordings.length === 0) {
      console.log(`Enregistrement ${recordingId} non trouvé ou n'appartient pas à l'utilisateur ${sourceUserId}`);
      return false;
    }
    // Récupérer les clés publiques/privées des utilisateurs
    const [sourceKeys] = await db.query(
      'SELECT private_key FROM user_keys WHERE user_id = ?',
      [sourceUserId]
    );
    const [targetKeys] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [targetUserId]
    );
    if (sourceKeys.length === 0 || targetKeys.length === 0) {
      console.log(`Clés non trouvées pour l'utilisateur source ${sourceUserId} ou cible ${targetUserId}`);
      return false;
    }
    // Déchiffrer la clé AES avec la clé privée de la source
    const sourcePrivateKey = sourceKeys[0].private_key;
    const encryptedKey = recordings[0].encryption_key;
    const aesKey = crypto.privateDecrypt(
      {
        key: sourcePrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    );
    // Rechiffrer la clé AES avec la clé publique de la cible
    const targetPublicKey = targetKeys[0].public_key;
    const reencryptedKey = crypto.publicEncrypt(
      {
        key: targetPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      aesKey
    ).toString('base64');
    
    // Vérifier si un partage existe déjà et le mettre à jour
    const [existingShare] = await db.query(
      'SELECT id FROM shared_recordings WHERE recording_id = ? AND target_user_id = ?',
      [recordingId, targetUserId]
    );
    
    if (existingShare.length > 0) {
      console.log(`Mise à jour du partage existant avec permissions: ${permissions}`);
      await db.query(
        'UPDATE shared_recordings SET permissions = ?, encryption_key = ?, shared_date = NOW() WHERE id = ?',
        [permissions, reencryptedKey, existingShare[0].id]
      );
    } else {
      // Insérer le partage
      console.log(`Création d'un nouveau partage avec permissions: ${permissions}`);
      await db.query(
        'INSERT INTO shared_recordings (recording_id, source_user_id, target_user_id, encryption_key, permissions) VALUES (?, ?, ?, ?, ?)',
        [recordingId, sourceUserId, targetUserId, reencryptedKey, permissions]
      );
    }
    
    // Créer une notification pour le destinataire
    await db.query(
      'INSERT INTO notifications (user_id, message, recording_id) VALUES (?, ?, ?)',
      [targetUserId, `Un enregistrement nommé "${recordings[0].name}" a été partagé avec vous avec des droits de ${permissions === 'edit' ? 'modification' : 'lecture seule'}.`, recordingId]
    );
    
    console.log(`Partage réussi de l'enregistrement ${recordingId} vers l'utilisateur ${targetUserId}`);
    return true;
  }

  /**
   * Vérifie si l'utilisateur a le droit de modifier l'enregistrement
   * @param {number} recordingId ID de l'enregistrement
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<boolean>} Vrai si l'utilisateur a les droits d'édition
   */
  static async checkEditAccess(recordingId, userId) {
    // L'utilisateur peut modifier s'il est propriétaire OU s'il a un partage avec droits d'édition
    const [rows] = await db.query(
      `SELECT 1 
      FROM (
        SELECT id FROM recordings WHERE id = ? AND user_id = ?
        UNION 
        SELECT recording_id FROM shared_recordings 
        WHERE recording_id = ? AND target_user_id = ? AND permissions = 'edit'
      ) AS access_check`,
      [recordingId, userId, recordingId, userId]
    );
    
    return rows.length > 0;
  }

  /**
   * Met à jour un enregistrement
   * @param {number} recordingId ID de l'enregistrement
   * @param {Object} updateData Données à mettre à jour (name, description)
   * @returns {Promise<boolean>} Vrai si la mise à jour a réussi
   */
  static async update(recordingId, updateData) {
    const { name, description } = updateData;
    
    try {
      await db.query(
        'UPDATE recordings SET name = ?, description = ? WHERE id = ?',
        [name, description, recordingId]
      );
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement:', error);
      return false;
    }
  }

  /**
   * Partage un enregistrement avec un token d'accès unique et un secret
   * @param {number} recordingId ID de l'enregistrement à partager
   * @param {number} sourceUserId ID du propriétaire
   * @param {string} permissions Permissions accordées ('read' ou 'edit')
   * @param {Object} options Options de partage (maxUses, expiration)
   * @returns {Promise<Object>} Informations de partage avec le token et le secret
   */
  static async shareWithToken(recordingId, sourceUserId, permissions = 'read', options = {}) {
    console.log(`Partage de l'enregistrement ${recordingId} avec token d'accès, permissions: ${permissions}`);
    
    // S'assurer que la table token_shared_recordings existe
    await this.ensureTokenSharedRecordingsTable();
    
    // Vérifier si les permissions sont valides
    if (permissions !== 'read' && permissions !== 'edit') {
      console.log(`Permissions invalides: ${permissions}, utilisation de 'read' par défaut`);
      permissions = 'read';
    }
    
    // Vérifier si l'enregistrement appartient à l'utilisateur source
    const [recordings] = await db.query(
      'SELECT file_path, encryption_key, name FROM recordings WHERE id = ? AND user_id = ?',
      [recordingId, sourceUserId]
    );
    
    if (recordings.length === 0) {
      console.log(`Enregistrement ${recordingId} non trouvé ou n'appartient pas à l'utilisateur ${sourceUserId}`);
      throw new Error('Enregistrement non trouvé ou vous n\'êtes pas le propriétaire');
    }
    
    // Récupérer les clés de l'utilisateur source
    const [sourceKeys] = await db.query(
      'SELECT private_key, public_key FROM user_keys WHERE user_id = ?',
      [sourceUserId]
    );
    
    if (sourceKeys.length === 0) {
      console.log(`Clés non trouvées pour l'utilisateur source ${sourceUserId}`);
      throw new Error('Clés non trouvées');
    }
    
    // Récupérer la clé privée et publique du propriétaire
    const sourcePrivateKey = sourceKeys[0].private_key;
    const sourcePublicKey = sourceKeys[0].public_key;
    
    // Déchiffrer la clé AES avec la clé privée du propriétaire
    const encryptedKey = recordings[0].encryption_key;
    const aesKey = crypto.privateDecrypt(
      {
        key: sourcePrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    );
    
    // Générer un token d'accès aléatoire
    const tokenRaw = crypto.randomBytes(16);
    const token = tokenRaw.toString('hex');
    
    // Générer un secret d'accès aléatoire (ce que le destinataire devra fournir)
    const accessSecretRaw = crypto.randomBytes(16);
    const accessSecret = accessSecretRaw.toString('hex');
    
    // Hacher le secret pour le stockage dans la base de données
    const hashedSecret = crypto.createHash('sha256').update(accessSecret).digest('hex');
    
    // Créer une "phrase secrète" unique pour ce partage, basée sur le token et le secret
    // Cette phrase sera utilisée comme "sel" pour le chiffrement
    const uniquePhraseSecret = crypto.createHash('sha256')
      .update(`${token}:${accessSecret}:${recordingId}:${sourceUserId}`)
      .digest('hex');
    
    // Chiffrer la clé AES avec la clé publique du propriétaire, mais en utilisant
    // une méthode qui incorpore le secret unique pour ce partage spécifique
    // Cela garantit que seul quelqu'un avec la bonne combinaison de token et secret pourra déchiffrer
    
    // Préparation des données pour le chiffrement
    const ivForEncryption = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(uniquePhraseSecret).digest(); // Dérive une clé de 32 bytes
    
    // Chiffrer la clé AES en utilisant cette méthode hybride
    const cipher = crypto.createCipheriv('aes-256-cbc', key, ivForEncryption);
    const encryptedAesKey = Buffer.concat([
      ivForEncryption,
      cipher.update(aesKey),
      cipher.final()
    ]).toString('base64');
    
    // Options de partage
    const maxUses = options.maxUses ? parseInt(options.maxUses) : null;
    const expiration = options.expiration ? new Date(options.expiration) : null;
    
    // Insérer le partage dans la base de données
    const [result] = await db.query(
      `INSERT INTO token_shared_recordings 
       (recording_id, source_user_id, token, access_secret, encrypted_key, permissions, max_uses, expiration) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordingId, sourceUserId, token, hashedSecret, encryptedAesKey, permissions, maxUses, expiration]
    );
    
    console.log(`Partage avec token créé avec succès, ID: ${result.insertId}`);
    
    // Retourner les informations de partage
    return {
      shareId: result.insertId,
      recordingId,
      token,
      accessSecret, // Le secret que le destinataire devra fournir
      permissions,
      maxUses,
      expiration: expiration ? expiration.toISOString() : null
    };
  }

  /**
   * Récupère le contenu audio d'un enregistrement en utilisant un token d'accès et un secret
   * @param {string} token Token d'accès unique
   * @param {string} accessSecret Secret d'accès fourni par le destinataire
   * @returns {Promise<Object>} Données audio déchiffrées et métadonnées
   */
  static async getAudioContentWithToken(token, accessSecret) {
    console.log(`[TOKEN ACCESS] Tentative d'accès à l'enregistrement avec token: ${token.substring(0, 8)}... et secret: ${accessSecret ? accessSecret.substring(0, 5) + '...' : 'non fourni'}`);
    
    // Validation des entrées
    if (!token || typeof token !== 'string') {
      console.log('[TOKEN ACCESS ERROR] Token manquant ou invalide');
      throw new Error('Token de partage invalide');
    }
    
    if (!accessSecret || typeof accessSecret !== 'string') {
      console.log('[TOKEN ACCESS ERROR] Secret d\'accès manquant ou invalide');
      throw new Error('Secret d\'accès invalide');
    }
    
    try {
      // S'assurer que la table token_shared_recordings existe
      await this.ensureTokenSharedRecordingsTable();
      console.log('[TOKEN ACCESS] Table token_shared_recordings vérifiée');

      // Récupérer le partage correspondant au token
      const [shares] = await db.query(
        `SELECT ts.*, r.file_path, r.name, r.description, r.duration, r.timestamp, r.audio_format,
                u.id as owner_id, u.email as owner_email, u.full_name as owner_name
         FROM token_shared_recordings ts
         JOIN recordings r ON ts.recording_id = r.id
         JOIN users u ON r.user_id = u.id
         WHERE ts.token = ?`,
        [token]
      );
      
      console.log(`[TOKEN ACCESS] Requête de token exécutée, ${shares.length} résultats trouvés`);
      
      if (shares.length === 0) {
        console.log(`[TOKEN ACCESS ERROR] Aucun partage trouvé pour le token ${token.substring(0, 8)}...`);
        throw new Error('Token de partage invalide');
      }
      
      const share = shares[0];
      console.log(`[TOKEN ACCESS] Informations du partage: ID=${share.id}, Recording=${share.recording_id}, Fichier=${share.file_path}, Format=${share.audio_format || 'non spécifié'}`);
      
      // Vérifier si le partage a expiré
      if (share.expiration && new Date(share.expiration) < new Date()) {
        console.log(`[TOKEN ACCESS ERROR] Partage expiré pour le token ${token.substring(0, 8)}...`);
        throw new Error('Ce partage a expiré');
      }
      
      // Vérifier si le nombre maximal d'utilisations est atteint
      if (share.max_uses !== null && share.use_count >= share.max_uses) {
        console.log(`[TOKEN ACCESS ERROR] Nombre maximal d'utilisations atteint pour le token ${token.substring(0, 8)}...`);
        throw new Error('Le nombre maximal d\'utilisations de ce partage a été atteint');
      }
      
      // Nettoyage du secret d'accès (suppression des espaces)
      const cleanedAccessSecret = accessSecret.trim();
      console.log(`[TOKEN ACCESS] Secret nettoyé de longueur: ${cleanedAccessSecret.length}`);
      
      // Vérifier le secret d'accès en comparant son hash avec celui stocké
      const hashedSecret = crypto.createHash('sha256').update(cleanedAccessSecret).digest('hex');
      if (hashedSecret !== share.access_secret) {
        console.log(`[TOKEN ACCESS ERROR] Secret d'accès invalide pour le token ${token.substring(0, 8)}...`);
        console.log(`[TOKEN ACCESS DEBUG] Hash calculé: ${hashedSecret.substring(0, 10)}..., Hash stocké: ${share.access_secret.substring(0, 10)}...`);
        throw new Error('Secret d\'accès invalide');
      }
      
      console.log('[TOKEN ACCESS] Secret d\'accès validé avec succès');
      
      // Créer la phrase secrète unique pour ce partage
      const uniquePhraseSecret = crypto.createHash('sha256')
        .update(`${token}:${cleanedAccessSecret}:${share.recording_id}:${share.source_user_id}`)
        .digest('hex');
      
      // Extraire l'IV et la clé AES chiffrée
      const encryptedAesKeyBuffer = Buffer.from(share.encrypted_key, 'base64');
      if (!encryptedAesKeyBuffer || encryptedAesKeyBuffer.length < 17) {
        console.log('[TOKEN ACCESS ERROR] Clé AES chiffrée invalide ou corrompue');
        console.log(`[TOKEN ACCESS DEBUG] Longueur du buffer: ${encryptedAesKeyBuffer ? encryptedAesKeyBuffer.length : 0}`);
        throw new Error('Erreur lors du déchiffrement: données de clé corrompues');
      }
      
      const iv = encryptedAesKeyBuffer.slice(0, 16);
      const encryptedAesKey = encryptedAesKeyBuffer.slice(16);
      
      console.log('[TOKEN ACCESS] Déchiffrement de la clé AES avec phrase unique');
      
      // Dériver la clé de déchiffrement à partir de la phrase secrète
      const key = crypto.createHash('sha256').update(uniquePhraseSecret).digest();
      
      console.log('[TOKEN ACCESS] Tentative de déchiffrement de la clé AES');
      
      try {
        // Déchiffrer la clé AES
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const aesKey = Buffer.concat([
          decipher.update(encryptedAesKey),
          decipher.final()
        ]);
        
        console.log('[TOKEN ACCESS] Clé AES déchiffrée avec succès');
        
        // Lecture du fichier chiffré
        const filePath = path.join(__dirname, '../../uploads', share.file_path);
        console.log(`[TOKEN ACCESS] Tentative de lecture du fichier : ${filePath}`);
        
        try {
          // Vérifier si le fichier existe
          await fs.access(filePath);
          console.log(`[TOKEN ACCESS] Le fichier existe à l'emplacement attendu`);
          
          const fileData = await fs.readFile(filePath);
          console.log(`[TOKEN ACCESS] Fichier audio chiffré lu: ${fileData.length} octets`);
          
          // Extraction de l'en-tête et des données chiffrées
          const newlineIndex = fileData.indexOf(0x0A); // 0x0A = '\n'
          
          if (newlineIndex === -1) {
            console.log('[TOKEN ACCESS ERROR] Format de fichier audio invalide (séparateur introuvable)');
            throw new Error('Erreur lors du déchiffrement: format de fichier invalide');
          }
          
          const headerBase64 = fileData.slice(0, newlineIndex).toString();
          console.log(`[TOKEN ACCESS] En-tête récupéré, longueur: ${headerBase64.length}`);
          
          // Variables pour stocker les informations d'en-tête
          let fileIv;
          let audioFormat = share.audio_format || 'unknown';
          
          try {
            // Essayer de décoder l'en-tête comme JSON (nouveau format)
            const headerJson = Buffer.from(headerBase64, 'base64').toString();
            const headerData = JSON.parse(headerJson);
            
            console.log(`[TOKEN ACCESS] En-tête JSON décodé: ${JSON.stringify(headerData)}`);
            
            // Récupérer l'IV et le format audio depuis l'en-tête JSON
            fileIv = Buffer.from(headerData.iv, 'hex');
            if (headerData.format) {
              audioFormat = headerData.format;
              console.log(`[TOKEN ACCESS] Format audio depuis l'en-tête: ${audioFormat}`);
            }
          } catch (headerError) {
            // Si ce n'est pas du JSON, essayer l'ancien format (juste IV en hexadécimal)
            console.log('[TOKEN ACCESS] Format d\'en-tête ancien détecté (non JSON)');
            try {
              fileIv = Buffer.from(headerBase64, 'hex');
              console.log(`[TOKEN ACCESS] IV ancien format récupéré: ${fileIv.toString('hex').substring(0, 10)}...`);
            } catch (ivError) {
              console.log('[TOKEN ACCESS ERROR] Erreur de conversion de l\'IV:', ivError);
              throw new Error('Erreur lors du déchiffrement: IV invalide');
            }
          }
          
          // Vérifier que l'IV est valide
          if (!fileIv || fileIv.length !== 16) {
            console.log(`[TOKEN ACCESS ERROR] IV de longueur invalide: ${fileIv ? fileIv.length : 0} octets (attendu: 16)`);
            throw new Error('IV de format invalide');
          }
          
          const encryptedData = fileData.slice(newlineIndex + 1);
          console.log(`[TOKEN ACCESS] Données chiffrées extraites: ${encryptedData.length} octets`);
          
          console.log('[TOKEN ACCESS] Tentative de déchiffrement des données audio');
          
          try {
            // Déchiffrement des données audio avec la clé AES
            const audioDecipher = crypto.createDecipheriv('aes-256-cbc', aesKey, fileIv);
            let decryptedData;
            
            try {
              decryptedData = Buffer.concat([
                audioDecipher.update(encryptedData),
                audioDecipher.final()
              ]);
              
              console.log(`[TOKEN ACCESS] Données audio déchiffrées avec succès: ${decryptedData.length} octets`);
              
              // Vérifier le format des données déchiffrées
              let detectedFormat = 'unknown';
              
              // Vérifier si c'est un format WebM (commence par 1A 45 DF A3)
              if (decryptedData.length > 4 && 
                 decryptedData[0] === 0x1A && 
                 decryptedData[1] === 0x45 && 
                 decryptedData[2] === 0xDF && 
                 decryptedData[3] === 0xA3) {
                detectedFormat = 'webm';
              } 
              // Vérifier si c'est un format MP3 (commence par ID3 ou FF FB)
              else if (decryptedData.length > 3 && 
                      ((decryptedData[0] === 0x49 && decryptedData[1] === 0x44 && decryptedData[2] === 0x33) || 
                       (decryptedData[0] === 0xFF && (decryptedData[1] & 0xE0) === 0xE0))) {
                detectedFormat = 'mp3';
              }
              // Format OGG Vorbis (commence par "OggS")
              else if (decryptedData.length > 4 && 
                      decryptedData[0] === 0x4F && decryptedData[1] === 0x67 && 
                      decryptedData[2] === 0x67 && decryptedData[3] === 0x53) {
                detectedFormat = 'ogg';
              }
              // Format WAV (commence par "RIFF" suivi de "WAVE")
              else if (decryptedData.length > 12 && 
                      decryptedData[0] === 0x52 && decryptedData[1] === 0x49 && 
                      decryptedData[2] === 0x46 && decryptedData[3] === 0x46 &&
                      decryptedData[8] === 0x57 && decryptedData[9] === 0x41 && 
                      decryptedData[10] === 0x56 && decryptedData[11] === 0x45) {
                detectedFormat = 'wav';
              }
              
              console.log(`[TOKEN ACCESS] Format détecté après déchiffrement: ${detectedFormat}, premiers octets: ${decryptedData.slice(0, 16).toString('hex')}`);
              
              // Utiliser le format détecté s'il est connu, sinon utiliser celui des métadonnées
              if (detectedFormat !== 'unknown') {
                audioFormat = detectedFormat;
              }
            } catch (finalizeError) {
              console.log('[TOKEN ACCESS ERROR] Erreur lors de la finalisation du déchiffrement:', finalizeError);
              throw new Error('Erreur de déchiffrement: données audio corrompues ou mauvais secret');
            }
            
            // Incrémenter le compteur d'utilisation et mettre à jour la date de dernière utilisation
            try {
              await db.query(
                'UPDATE token_shared_recordings SET use_count = use_count + 1, last_used_date = NOW() WHERE id = ?',
                [share.id]
              );
              console.log(`[TOKEN ACCESS] Compteur d'utilisation incrémenté pour le partage ID ${share.id}`);
            } catch (updateError) {
              console.log('[TOKEN ACCESS WARNING] Erreur lors de la mise à jour du compteur:', updateError);
              // Ne pas bloquer l'accès si la mise à jour du compteur échoue
            }
            
            // S'assurer que owner_name n'est jamais undefined
            const ownerName = share.owner_name || share.owner_email.split('@')[0];
            
            // Retourner les données déchiffrées et les métadonnées
            return {
              audio: decryptedData,
              metadata: {
                id: share.recording_id,
                name: share.name,
                description: share.description,
                duration: share.duration,
                timestamp: share.timestamp,
                permissions: share.permissions,
                audioFormat: audioFormat,
                owner: {
                  id: share.owner_id,
                  email: share.owner_email,
                  name: ownerName
                }
              }
            };
          } catch (decryptError) {
            console.log('[TOKEN ACCESS ERROR] Erreur lors du déchiffrement des données audio:', decryptError);
            throw new Error('Erreur lors du déchiffrement des données audio: ' + (decryptError.message || 'Cause inconnue'));
          }
        } catch (fileError) {
          console.log('[TOKEN ACCESS ERROR] Erreur lors de la lecture ou du traitement du fichier audio:', fileError);
          if (fileError.code === 'ENOENT') {
            throw new Error('Fichier audio introuvable sur le serveur');
          }
          throw new Error('Erreur lors de la lecture du fichier audio: ' + (fileError.message || 'Cause inconnue'));
        }
      } catch (keyDecryptError) {
        console.log('[TOKEN ACCESS ERROR] Erreur lors du déchiffrement de la clé AES:', keyDecryptError);
        throw new Error('Secret d\'accès invalide ou erreur lors du déchiffrement');
      }
    } catch (error) {
      console.log(`[TOKEN ACCESS ERROR] Erreur globale:`, error);
      throw error;
    }
  }

  /**
   * Récupère les informations d'un enregistrement partagé par token (sans le déchiffrer)
   * @param {string} token Token d'accès unique
   * @returns {Promise<Object>} Métadonnées de l'enregistrement
   */
  static async getRecordingInfoWithToken(token) {
    // S'assurer que la table token_shared_recordings existe
    await this.ensureTokenSharedRecordingsTable();
    
    const [shares] = await db.query(
      `SELECT ts.permissions, ts.max_uses, ts.use_count, ts.expiration, ts.created_date,
              r.id as recording_id, r.name, r.description, r.duration, r.timestamp, 
              u.id as owner_id, u.email as owner_email, u.full_name as owner_name
       FROM token_shared_recordings ts
       JOIN recordings r ON ts.recording_id = r.id
       JOIN users u ON r.user_id = u.id
       WHERE ts.token = ?`,
      [token]
    );
    
    if (shares.length === 0) {
      throw new Error('Token de partage invalide');
    }
    
    const share = shares[0];
    
    // Vérifier si le partage a expiré
    if (share.expiration && new Date(share.expiration) < new Date()) {
      throw new Error('Ce partage a expiré');
    }
    
    // Vérifier si le nombre maximal d'utilisations est atteint
    if (share.max_uses !== null && share.use_count >= share.max_uses) {
      throw new Error('Le nombre maximal d\'utilisations de ce partage a été atteint');
    }
    
    // S'assurer que owner_name n'est jamais undefined
    const ownerName = share.owner_name || share.owner_email.split('@')[0];
    
    // Formater et retourner les métadonnées
    return {
      id: share.recording_id,
      name: share.name,
      description: share.description,
      duration: share.duration,
      timestamp: share.timestamp,
      permissions: share.permissions,
      owner: {
        id: share.owner_id,
        email: share.owner_email,
        name: ownerName // Utilisation de la valeur sécurisée
      },
      sharing: {
        created: share.created_date,
        maxUses: share.max_uses,
        useCount: share.use_count,
        expiration: share.expiration,
        requiresSecret: true
      }
    };
  }

  /**
   * Vérifie et crée la table token_shared_recordings si elle n'existe pas
   * @returns {Promise<boolean>} Vrai si la table existe ou a été créée
   */
  static async ensureTokenSharedRecordingsTable() {
    try {
      // Vérifier si la table token_shared_recordings existe
      const [tables] = await db.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = '${process.env.DB_NAME || 'moustass_web'}' 
        AND table_name = 'token_shared_recordings'
      `);
      
      if (tables[0].count === 0) {
        console.log('La table token_shared_recordings n\'existe pas, création...');
        
        // Créer la table token_shared_recordings
        await db.query(`
          CREATE TABLE IF NOT EXISTS token_shared_recordings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recording_id INT NOT NULL,
            source_user_id INT NOT NULL, -- Utilisateur propriétaire qui partage
            token VARCHAR(64) NOT NULL, -- Token d'accès unique
            access_secret VARCHAR(64) NOT NULL, -- Empreinte du secret pour vérification (stockée en hash)
            encrypted_key TEXT NOT NULL, -- Clé AES chiffrée avec une méthode spécifique à ce partage
            permissions VARCHAR(10) NOT NULL DEFAULT 'read', -- 'read' ou 'edit'
            max_uses INT DEFAULT NULL, -- Nombre maximal d'utilisations (NULL = illimité)
            use_count INT DEFAULT 0, -- Compteur d'utilisation
            expiration TIMESTAMP NULL DEFAULT NULL, -- Date d'expiration (NULL = pas d'expiration)
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_date TIMESTAMP NULL DEFAULT NULL,
            FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
            FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE INDEX (token) -- Index pour recherche rapide par token
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('Table token_shared_recordings créée avec succès');
      } else {
        console.log('La table token_shared_recordings existe déjà');
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification/création de la table token_shared_recordings:', error);
      return false;
    }
  }
}

module.exports = Recording; 