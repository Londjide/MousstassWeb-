const mysql = require('mysql2/promise');

// Configuration de la connexion à la base de données
const config = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'moustass_web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Création du pool de connexions
const pool = mysql.createPool(config);

// Test de la connexion
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connexion à la base de données établie avec succès!');
    connection.release();
    return true;
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    return false;
  }
};

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  getConnection: () => pool.getConnection(),
  testConnection
}; 