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
    const { name, userId, duration, description } = recordingData;
    const timestamp = new Date();
    
    // Génération d'une clé AES pour chiffrer l'enregistrement
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Chiffrement des données audio avec AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(audioBuffer),
      cipher.final()
    ]);
    
    // Création du répertoire des enregistrements si nécessaire
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Génération d'un nom de fichier unique
    const fileName = `${userId}_${Date.now()}.enc`;
    const filePath = path.join(uploadDir, fileName);
    
    // Ajout de l'IV au début du fichier pour le déchiffrement
    const fileData = Buffer.concat([
      Buffer.from(iv.toString('hex')), // Stocker l'IV en hexadécimal
      Buffer.from('\n'), // Séparateur
      encryptedData
    ]);
    
    // Écriture du fichier chiffré
    await fs.writeFile(filePath, fileData);
    
    // Chiffrement de la clé AES avec la clé publique de l'utilisateur
    const [rows] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('Clé publique introuvable pour cet utilisateur');
    }
    
    const publicKey = rows[0].public_key;
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      aesKey
    ).toString('base64');
    
    // Sauvegarde en base de données
    const [result] = await db.query(
      'INSERT INTO recordings (name, file_path, timestamp, duration, user_id, encryption_key, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, fileName, timestamp, duration, userId, encryptedKey, description || null]
    );
    
    return {
      id: result.insertId,
      name,
      timestamp,
      duration,
      userId,
      description: description || null
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
    // Vérifier si l'enregistrement est partagé (pas propriétaire)
    const isShared = recording.user_id !== recording.target_user_id;
    
    // Vérifier si l'utilisateur est le propriétaire original
    const isOwner = recording.user_id === recording.target_user_id;
    
    // Si l'enregistrement est partagé et que ce n'est pas un auto-partage, vérifier la signature
    if (isShared && !isOwner && !signature) {
      throw new Error('Une signature est requise pour accéder à cet enregistrement partagé');
    }
    
    // Si une signature est fournie et que ce n'est pas un auto-partage, la vérifier
    if (isShared && !isOwner && signature) {
      const isValid = await this.verifySignature(recording.id, signature, recording.target_user_id);
      if (!isValid) {
        throw new Error('Signature invalide pour cet enregistrement');
      }
    }
    
    // Lecture du fichier chiffré (binaire)
    const filePath = path.join(__dirname, '../../uploads', recording.file_path);
    const fileData = await fs.readFile(filePath); // pas d'encodage
    // Extraction de l'IV et des données chiffrées
    const newlineIndex = fileData.indexOf(0x0A); // 0x0A = '\n'
    const ivHex = fileData.slice(0, newlineIndex).toString();
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = fileData.slice(newlineIndex + 1);
    // Déchiffrement de la clé AES avec la clé privée
    const encryptedKey = recording.proper_key;
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    );
    // Déchiffrement des données audio
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    return decryptedData;
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
}

module.exports = Recording; 