const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Variables de connexion
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = process.env.DB_NAME || 'moustass_web';

let pool = null;

/**
 * Initialise le pool de connexions à la base de données
 * @returns {Promise<void>}
 */
const initDb = async () => {
  try {
    console.log('Initialisation de la connexion à la base de données...');
    console.log(`Connexion à MySQL sur ${DB_HOST}:${DB_PORT} avec l'utilisateur ${DB_USER}`);
    
    // Création du pool de connexions
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test de connexion
    const connection = await pool.getConnection();
    console.log('Connexion à la base de données établie avec succès');
    connection.release();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error.message);
    
    // Si la base de données n'existe pas, on tente de la créer
    if (error.errno === 1049) {
      try {
        console.log('La base de données n\'existe pas. Tentative de création...');
        await createDatabase();
        return await initDb(); // Appel récursif pour réinitialiser le pool
      } catch (createError) {
        console.error('Échec de création de la base de données:', createError.message);
        return Promise.reject(createError);
      }
    }
    
    return Promise.reject(error);
  }
};

/**
 * Crée la base de données si elle n'existe pas
 * @returns {Promise<void>}
 */
const createDatabase = async () => {
  const rootPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 1
  });
  
  try {
    await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} 
                         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Base de données ${DB_NAME} créée avec succès`);
    await rootPool.end();
  } catch (error) {
    await rootPool.end();
    throw error;
  }
};

/**
 * Exécute une requête SQL avec les paramètres fournis
 * @param {string} sql Requête SQL à exécuter
 * @param {Array} params Paramètres pour la requête préparée
 * @returns {Promise<Array>} Résultat de la requête
 */
const query = async (sql, params = []) => {
  if (!pool) {
    await initDb();
  }
  
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error.message);
    throw error;
  }
};

/**
 * Récupère une connexion depuis le pool
 * @returns {Promise<Object>} Connexion MySQL
 */
const getConnection = async () => {
  if (!pool) {
    await initDb();
  }
  
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Erreur de récupération de connexion:', error);
    throw error;
  }
};

/**
 * Teste la connexion à la base de données
 * @returns {Promise<boolean>} Vrai si la connexion est établie
 */
const testConnection = async () => {
  if (!pool) {
    await initDb();
  }
  
  try {
    const [result] = await pool.query('SELECT 1 as test');
    console.log('Test de connexion réussi:', result);
    return true;
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    throw error;
  }
};

/**
 * Initialise la base de données avec les tables nécessaires
 * @returns {Promise<boolean>} Vrai si l'initialisation est réussie
 */
const initDatabase = async () => {
  try {
    // Vérifier si le fichier d'initialisation existe
    const initFilePath = path.join(__dirname, '../../db/migrations/init.sql');
    
    try {
      await fs.access(initFilePath);
    } catch (err) {
      console.log('Fichier d\'initialisation non trouvé:', initFilePath);
      // Créer les tables de base si le fichier init.sql n'existe pas
      return await createBasicTables();
    }
    
    // Lire et exécuter le script d'initialisation
    const initScript = await fs.readFile(initFilePath, 'utf8');
    
    const connection = await getConnection();
    
    try {
      console.log('Exécution du script d\'initialisation...');
      
      // Désactiver temporairement les contraintes de clé étrangère
      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      
      // Exécuter le script par blocs
      const statements = initScript
        .split(';')
        .filter(stmt => stmt.trim() !== '');
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          await connection.query(stmt + ';');
        }
      }
      
      // Réactiver les contraintes
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      
      console.log('Base de données initialisée avec succès');
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
};

/**
 * Crée les tables de base si le fichier init.sql n'existe pas
 * @returns {Promise<boolean>} Vrai si les tables ont été créées
 */
const createBasicTables = async () => {
  const connection = await getConnection();
  
  try {
    // Créer la table users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Créer la table audio_records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audio_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        duration INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Tables de base créées avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la création des tables de base:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  initDb,
  query,
  getConnection,
  testConnection,
  initDatabase,
  createBasicTables
};