const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Configuration de la connexion à la base de données
 * Les paramètres sont récupérés du fichier .env
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'moustass_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Exécute une requête SQL avec les paramètres fournis
 * @param {string} sql Requête SQL à exécuter
 * @param {Array} params Paramètres pour la requête préparée
 * @returns {Promise<Array>} Résultat de la requête
 */
const query = async (sql, params = []) => {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error('Erreur d\'exécution de la requête SQL:', error);
    throw error;
  }
};

/**
 * Récupère une connexion depuis le pool
 * @returns {Promise<Object>} Connexion MySQL
 */
const getConnection = async () => {
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
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    throw error;
  }
};

/**
 * Initialise la base de données avec le script SQL
 * @returns {Promise<boolean>} Vrai si l'initialisation est réussie
 */
const initDatabase = async () => {
  try {
    // Créer la base de données si elle n'existe pas
    const rootPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });
    
    await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'moustass_web'} 
                          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    // Lire le script d'initialisation
    const initScript = await fs.readFile(
      path.join(__dirname, '../../db/init.sql'),
      'utf8'
    );
    
    // Exécuter le script
    const connection = await getConnection();
    
    try {
      const statements = initScript
        .split(';')
        .filter(stmt => stmt.trim() !== '');
      
      for (const stmt of statements) {
        await connection.query(stmt + ';');
      }
      
      console.log('Base de données initialisée avec succès.');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
};

module.exports = {
  query,
  getConnection,
  testConnection,
  initDatabase
};