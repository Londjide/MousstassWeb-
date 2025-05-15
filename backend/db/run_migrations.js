// Script pour exécuter les migrations de base de données
const fs = require('fs').promises;
const path = require('path');
const db = require('../src/models/db');

// Helper pour nettoyer et diviser le SQL en instructions
function splitSqlStatements(sql) {
  // Retirer les commentaires et espaces inutiles
  const cleanedSql = sql
    .replace(/--.*$/mg, '') // Retirer les commentaires de ligne
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Retirer les commentaires de bloc
  
  // Diviser en instructions SQL (séparées par des points-virgules)
  const statements = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < cleanedSql.length; i++) {
    const char = cleanedSql[i];
    const nextChar = cleanedSql[i + 1];
    
    // Gérer les chaînes de caractères (ne pas considérer les ; à l'intérieur comme délimiteurs)
    if ((char === "'" || char === '"') && (i === 0 || cleanedSql[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    // Ajouter le caractère à l'instruction courante
    currentStatement += char;
    
    // Si on trouve un point-virgule et qu'on n'est pas dans une chaîne, terminer l'instruction
    if (char === ';' && !inString) {
      const trimmedStatement = currentStatement.trim();
      if (trimmedStatement) {
        statements.push(trimmedStatement);
      }
      currentStatement = '';
    }
  }
  
  // Ajouter la dernière instruction si elle n'est pas vide et ne se termine pas par ;
  const trimmedStatement = currentStatement.trim();
  if (trimmedStatement && !trimmedStatement.endsWith(';')) {
    statements.push(trimmedStatement + ';');
  }
  
  return statements.filter(stmt => stmt.trim().length > 0);
}

async function runMigrations() {
  try {
    console.log('Exécution des migrations de base de données...');
    
    // Dossier des migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Lire les fichiers de migration triés par nom
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        // Tri par numéro de migration (extrait du préfixe du nom de fichier)
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });
    
    if (sqlFiles.length === 0) {
      console.log('Aucun fichier de migration trouvé.');
      return;
    }
    
    console.log(`${sqlFiles.length} migrations trouvées.`);
    
    // Créer la table de migrations si elle n'existe pas
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (name)
      )
    `);
    
    // Récupérer les migrations déjà exécutées
    const [executedMigrations] = await db.query('SELECT name FROM migrations');
    const executedNames = executedMigrations.map(row => row.name);
    
    // Exécuter les migrations non exécutées
    for (const file of sqlFiles) {
      // Vérifier si la migration a déjà été exécutée
      if (executedNames.includes(file)) {
        console.log(`Migration ${file} déjà exécutée, ignorée.`);
        continue;
      }
      
      // Lire et exécuter le fichier SQL
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Extraire les instructions SQL individuelles
      const statements = splitSqlStatements(sql);
      
      console.log(`Exécution de la migration ${file} (${statements.length} instructions)...`);
      
      try {
        // Commencer une transaction
        await db.query('START TRANSACTION');
        
        // Exécuter chaque instruction
        for (const statement of statements) {
          try {
            await db.query(statement);
          } catch (stmtError) {
            console.error(`Erreur dans l'instruction SQL: ${statement}`);
            throw stmtError;
          }
        }
        
        // Enregistrer la migration comme exécutée
        await db.query('INSERT INTO migrations (name) VALUES (?)', [file]);
        
        // Valider la transaction
        await db.query('COMMIT');
        
        console.log(`Migration ${file} exécutée avec succès.`);
      } catch (error) {
        // Annuler la transaction en cas d'erreur
        await db.query('ROLLBACK');
        throw error;
      }
    }
    
    console.log('Toutes les migrations ont été exécutées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'exécution des migrations :', error);
    throw error;
  }
}

// Exécuter les migrations si ce script est appelé directement
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Terminé.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Échec des migrations :', err);
      process.exit(1);
    });
} else {
  // Exporter la fonction pour l'utiliser dans d'autres scripts
  module.exports = runMigrations;
} 