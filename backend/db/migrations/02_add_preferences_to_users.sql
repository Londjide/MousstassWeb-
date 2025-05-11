-- Migration : Ajout d'une colonne de préférences à la table utilisateurs

-- Vérifier si la colonne existe déjà
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "preferences";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1", -- La colonne existe déjà, ne rien faire
  "ALTER TABLE users ADD COLUMN preferences JSON DEFAULT NULL COMMENT 'Préférences utilisateur stockées en JSON'"
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ajouter un index pour accélérer les recherches par certaines préférences si nécessaire
-- (désactivé par défaut car il faudrait spécifier des préférences spécifiques à indexer)
-- CREATE INDEX idx_user_dark_mode ON users((JSON_EXTRACT(preferences, '$.dark_mode'))); 