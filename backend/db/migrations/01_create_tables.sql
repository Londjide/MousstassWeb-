-- Script d'initialisation de la base de données MousstassWeb
-- Ce script crée les tables nécessaires pour l'application

-- Suppression des tables si elles existent déjà (pour réinitialisation)
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS shares;
DROP TABLE IF EXISTS recordings;
DROP TABLE IF EXISTS users;

-- Table des utilisateurs
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des enregistrements
CREATE TABLE recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    duration INT,
    is_encrypted BOOLEAN DEFAULT TRUE,
    encryption_key VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    access_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des partages
CREATE TABLE shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recording_id INT NOT NULL,
    shared_by INT NOT NULL,
    shared_with INT,
    shared_email VARCHAR(100),
    access_token VARCHAR(255) NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des préférences utilisateurs
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'light',
    auto_encryption BOOLEAN DEFAULT TRUE,
    default_share_expires INT DEFAULT 7,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertion de données de test
INSERT INTO users (username, email, password) VALUES 
('admin', 'admin@mousstassweb.com', '$2b$10$EIVeJWHmsUuXPH.UwcP6XOW9NUFr7ERXhtpjdtW2qvB2VcR0jLBwO'), -- mot de passe: admin123
('user1', 'user1@example.com', '$2b$10$A9OeRk2OJLcTiA8aA2uY6.LcG9qpcojGpL37/7IBchBbQ2SYJHE3W'); -- mot de passe: password123

-- Insertion des préférences pour les utilisateurs
INSERT INTO user_preferences (user_id, theme) VALUES
(1, 'dark'),
(2, 'light'); 