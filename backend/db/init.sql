-- Script d'initialisation de la base de données pour Missié Moustass Web
-- Base sur le schéma fourni dans la migration

-- Suppression des tables si elles existent déjà
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS shared_recordings;
DROP TABLE IF EXISTS recordings;
DROP TABLE IF EXISTS user_keys;
DROP TABLE IF EXISTS users;

-- Création des tables
-- Table des utilisateurs
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    full_name VARCHAR(100),
    username VARCHAR(50),
    photo_url VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des clés utilisateurs (RSA)
CREATE TABLE user_keys (
    user_id INT PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des enregistrements audio
CREATE TABLE recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INT,
    user_id INT NOT NULL,
    encryption_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des enregistrements partagés
CREATE TABLE shared_recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recording_id INT NOT NULL,
    source_user_id INT NOT NULL,
    target_user_id INT NOT NULL,
    encryption_key TEXT NOT NULL,
    permissions ENUM('read', 'edit') DEFAULT 'read',
    shared_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
    FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    recording_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE SET NULL
);

-- Ajout d'un utilisateur administrateur par défaut (mot de passe: admin)
-- Le hash et le sel seraient normalement générés par l'application
INSERT INTO users (email, full_name, username, password_hash, salt, is_admin) 
VALUES ('admin@mousstass.web', 
        'Administrateur',
        'admin',
        '$2b$10$X7GiK1XWbTx9vXM5A24Kou0A0xdcMIin7G.6Y6t3YV3SyL6G5S1Si', 
        '2b$10$X7GiK1XWbTx9vXM5A24Kou', 
        TRUE);

-- Création d'index pour optimiser les requêtes
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_shared_recordings_target_user ON shared_recordings(target_user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read); 