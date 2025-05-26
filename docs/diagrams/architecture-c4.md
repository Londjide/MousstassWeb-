# Diagrammes C4 pour MousstassWeb

## Niveau 1: Diagramme de Contexte

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_WITH_LEGEND()

title Diagramme de Contexte pour MousstassWeb

Person(utilisateur, "Utilisateur", "Personne souhaitant enregistrer, chiffrer et partager des conversations audio")
Person(utilisateur_externe, "Utilisateur Externe", "Personne recevant un lien de partage pour accéder à un enregistrement")

System(mousstass, "MousstassWeb", "Application web permettant l'enregistrement vocal, le chiffrement et le partage sécurisé")

Rel(utilisateur, mousstass, "Utilise pour enregistrer, chiffrer et partager des conversations")
Rel(utilisateur_externe, mousstass, "Accède aux enregistrements partagés")

@enduml
```

## Niveau 2: Diagramme de Conteneurs

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_WITH_LEGEND()

title Diagramme de Conteneurs pour MousstassWeb

Person(utilisateur, "Utilisateur", "Personne souhaitant enregistrer, chiffrer et partager des conversations audio")
Person(utilisateur_externe, "Utilisateur Externe", "Personne recevant un lien de partage")

System_Boundary(mousstass, "MousstassWeb") {
    Container(frontend, "Frontend", "HTML, CSS, JavaScript, EJS", "Interface utilisateur pour l'enregistrement et le partage")
    Container(apache, "Apache", "httpd 2.4", "Serveur web, reverse proxy et terminaison SSL")
    Container(backend, "Backend API", "Node.js, Express", "API REST pour la gestion des enregistrements et utilisateurs")
    ContainerDb(db, "Base de données", "MySQL 8.0", "Stocke les utilisateurs, enregistrements et métadonnées")
}

System_Ext(email, "Serveur Email", "Permet d'envoyer des liens de partage")

Rel(utilisateur, apache, "Accède via HTTPS", "HTTPS")
Rel(utilisateur_externe, apache, "Accède via HTTPS", "HTTPS")
Rel(apache, frontend, "Sert les pages statiques", "HTTP")
Rel(apache, backend, "Forward les requêtes API", "HTTP")
Rel(frontend, backend, "Appelle", "JSON/HTTPS")
Rel(backend, db, "Lit et écrit", "SQL")
Rel(backend, email, "Envoie des emails", "SMTP")

@enduml
```

## Niveau 3: Diagramme de Composants

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

LAYOUT_WITH_LEGEND()

title Diagramme de Composants pour MousstassWeb - Backend API

Container(frontend, "Frontend", "HTML, CSS, JavaScript, EJS", "Interface utilisateur")
ContainerDb(db, "Base de données", "MySQL 8.0", "Données")

Container_Boundary(backend, "Backend API") {
    Component(auth_controller, "Contrôleur d'Authentification", "Express.js", "Gestion de l'authentification et des utilisateurs")
    Component(recording_controller, "Contrôleur d'Enregistrements", "Express.js", "Gestion des enregistrements audio")
    Component(sharing_controller, "Contrôleur de Partage", "Express.js", "Gestion du partage des enregistrements")
    Component(auth_middleware, "Middleware d'Authentification", "Express.js", "Vérification des tokens JWT")
    Component(crypto_service, "Service de Cryptographie", "crypto", "Chiffrement AES-256 et hachage SHA-256")
    Component(storage_service, "Service de Stockage", "fs", "Gestion du stockage des fichiers")
    Component(db_service, "Service de Base de Données", "mysql2", "Interface avec la base de données")
}

Rel(frontend, auth_controller, "Utilise", "JSON/HTTPS")
Rel(frontend, recording_controller, "Utilise", "JSON/HTTPS")
Rel(frontend, sharing_controller, "Utilise", "JSON/HTTPS")

Rel(auth_controller, auth_middleware, "Utilise")
Rel(recording_controller, auth_middleware, "Utilise")
Rel(sharing_controller, auth_middleware, "Utilise")

Rel(auth_controller, crypto_service, "Utilise pour hacher les mots de passe")
Rel(recording_controller, crypto_service, "Utilise pour chiffrer les enregistrements")
Rel(recording_controller, storage_service, "Utilise pour stocker les fichiers")
Rel(sharing_controller, db_service, "Utilise pour gérer les droits d'accès")

Rel(auth_controller, db_service, "Utilise")
Rel(recording_controller, db_service, "Utilise")
Rel(sharing_controller, db_service, "Utilise")
Rel(db_service, db, "Lit et écrit", "SQL")

@enduml
```

## Modèle Relationnel

```sql
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
``` 