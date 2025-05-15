-- Migration: Création de la table shared_recordings
-- Cette table gère les partages d'enregistrements entre utilisateurs

CREATE TABLE IF NOT EXISTS shared_recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  source_user_id INT NOT NULL, -- Utilisateur qui partage
  target_user_id INT NOT NULL, -- Utilisateur avec qui l'enregistrement est partagé
  permissions VARCHAR(10) NOT NULL DEFAULT 'read', -- 'read' ou 'edit'
  encryption_key TEXT NOT NULL, -- Clé AES rechiffrée avec la clé publique du destinataire
  shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (recording_id, target_user_id) -- Empêche les doublons de partage
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Création d'un index pour optimiser les requêtes de listage des partages
CREATE INDEX idx_shared_recordings_target ON shared_recordings(target_user_id); 