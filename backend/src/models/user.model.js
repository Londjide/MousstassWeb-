const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Modèle pour la gestion des utilisateurs
 */
class User {
  /**
   * Crée un nouvel utilisateur
   * @param {Object} userData Données de l'utilisateur (email, password)
   * @returns {Promise<Object>} Utilisateur créé
   */
  static async create(userData) {
    const {email, password } = userData;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insertion de l'utilisateur
      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)',
        [email, passwordHash, salt]
      );
      
      const userId = result.insertId;
      
      // Génération de paires de clés RSA pour cet utilisateur
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Stockage des clés
      await connection.query(
        'INSERT INTO user_keys (user_id, public_key, private_key) VALUES (?, ?, ?)',
        [userId, publicKey, privateKey]
      );
      
      await connection.commit();
      
      return this.findById(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Vérifie les identifiants d'un utilisateur
   * @param {string} email Email de l'utilisateur
   * @param {string} password Mot de passe en clair
   * @returns {Promise<Object|null>} Utilisateur si authentifié, null sinon
   */
  static async authenticate(email, password) {
    const [rows] = await db.query(
      'SELECT id, email, username, full_name, password_hash, is_admin FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    // Ne pas retourner le hash du mot de passe
    delete user.password_hash;
    return user;
  }

  /**
   * Récupère un utilisateur par son ID
   * @param {number} id ID de l'utilisateur
   * @returns {Promise<Object|null>} Utilisateur trouvé ou null
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT id, email, username, full_name, is_admin, created_at, photo_url, password_hash FROM users WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Récupère la clé publique d'un utilisateur
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<string|null>} Clé publique ou null
   */
  static async getPublicKey(userId) {
    const [rows] = await db.query(
      'SELECT public_key FROM user_keys WHERE user_id = ?',
      [userId]
    );
    
    return rows.length > 0 ? rows[0].public_key : null;
  }

  /**
   * Récupère la clé privée d'un utilisateur
   * @param {number} userId ID de l'utilisateur
   * @returns {Promise<string|null>} Clé privée ou null
   */
  static async getPrivateKey(userId) {
    const [rows] = await db.query(
      'SELECT private_key FROM user_keys WHERE user_id = ?',
      [userId]
    );
    
    return rows.length > 0 ? rows[0].private_key : null;
  }

  /**
   * Liste tous les utilisateurs
   * @returns {Promise<Array>} Liste des utilisateurs
   */
  static async findAll() {
    const [rows] = await db.query(
      'SELECT id, email, is_admin, created_at FROM users'
    );
    
    return rows;
  }

  /**
   * Recherche un utilisateur par email
   * @param {string} email
   * @returns {Promise<Object|null>} Utilisateur trouvé ou null
   */
  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT id, email, password_hash, is_admin, created_at FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Met à jour l'URL de la photo de profil de l'utilisateur
   * @param {number} userId
   * @param {string} photoUrl
   * @returns {Promise<void>}
   */
  static async updatePhotoUrl(userId, photoUrl) {
    await db.query('UPDATE users SET photo_url = ? WHERE id = ?', [photoUrl, userId]);
  }

  /**
   * Récupère les préférences d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Préférences de l'utilisateur
   */
  static async getPreferences(userId) {
    try {
      const query = `
        SELECT preferences FROM users WHERE id = ?
      `;
      const [rows] = await db.execute(query, [userId]);
      
      if (rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Si aucune préférence n'existe, retourner des valeurs par défaut
      if (!rows[0].preferences) {
        return {
          dark_mode: false,
          notifications: true
        };
      }
      
      try {
        // Les préférences sont stockées en JSON dans la base de données
        return JSON.parse(rows[0].preferences);
      } catch (e) {
        // En cas d'erreur de parsing, retourner des valeurs par défaut
        console.error('Erreur lors du parsing des préférences:', e);
        return {
          dark_mode: false,
          notifications: true
        };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour les préférences d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} preferences - Préférences à mettre à jour
   * @returns {Promise<boolean>} Succès de l'opération
   */
  static async updatePreferences(userId, preferences) {
    try {
      // Vérifier si l'utilisateur existe
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Récupérer les préférences actuelles
      let currentPreferences = {};
      try {
        if (user.preferences) {
          currentPreferences = JSON.parse(user.preferences);
        }
      } catch (e) {
        console.warn('Erreur lors du parsing des préférences existantes, utilisation des valeurs par défaut');
      }
      
      // Fusionner avec les nouvelles préférences
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences
      };
      
      // Mettre à jour les préférences
      const query = `
        UPDATE users SET preferences = ? WHERE id = ?
      `;
      
      await db.execute(query, [
        JSON.stringify(updatedPreferences),
        userId
      ]);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} newPassword - Nouveau mot de passe en clair
   * @returns {Promise<boolean>} Succès de l'opération
   */
  static async changePassword(userId, newPassword) {
    try {
      console.log('Début de changePassword dans le modèle User pour userId:', userId);
      
      if (!userId || !newPassword) {
        console.error('Erreur: userId ou newPassword manquant', { 
          userIdProvided: !!userId, 
          newPasswordProvided: !!newPassword 
        });
        throw new Error('ID utilisateur ou nouveau mot de passe manquant');
      }

      // Hacher le nouveau mot de passe avec bcrypt (qui génère son propre salt)
      try {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        console.log('Nouveau hash généré avec succès');
        
        // Mettre à jour le mot de passe dans la base de données
        try {
          const [result] = await db.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
          );
          
          console.log('Résultat de la mise à jour:', result ? JSON.stringify(result) : 'null');
          
          const success = result && result.affectedRows > 0;
          console.log('Mise à jour réussie:', success);
          
          return success;
        } catch (dbError) {
          console.error('Erreur lors de la mise à jour du mot de passe en base:', dbError);
          throw new Error('Erreur lors de la mise à jour en base de données: ' + dbError.message);
        }
      } catch (hashError) {
        console.error('Erreur lors du hachage du mot de passe:', hashError);
        throw new Error('Erreur lors du hachage du mot de passe: ' + hashError.message);
      }
    } catch (error) {
      console.error('Erreur globale lors du changement de mot de passe:', error);
      throw error;
    }
  }
}

module.exports = User;