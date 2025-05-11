# Frontend - Moustass Web

Interface web pour l'application Moustass Web, permettant aux utilisateurs de gérer leurs enregistrements audio et leurs données financières.

## Structure du projet

```
frontend/
├── public/              # Fichiers statiques
│   ├── index.html       # Page HTML principale
│   ├── assets/          # Ressources
│   │   ├── css/         # Feuilles de style
│   │   ├── js/          # Scripts JavaScript
│   │   └── images/      # Images et icônes
└── README.md            # Documentation
```

## Fonctionnalités

- **Authentification**
  - Inscription et connexion des utilisateurs
  - Gestion des sessions avec JWT
  - Déconnexion sécurisée

- **Gestion des enregistrements audio**
  - Enregistrement audio via l'API MediaRecorder
  - Lecture des enregistrements
  - Chiffrement AES-256 des données audio
  - Gestion CRUD complète (création, lecture, mise à jour, suppression)

- **Gestion des données financières**
  - Stockage sécurisé des données financières
  - Chiffrement AES-256 du contenu
  - Catégorisation par type (investissement, revenus, dépenses, projections)
  - Gestion CRUD complète

- **Profil utilisateur**
  - Affichage et modification des informations personnelles
  - Changement de mot de passe sécurisé

## Technologies utilisées

- **HTML5**
  - Templates pour le chargement dynamique du contenu
  - Structure sémantique

- **CSS3**
  - Design responsive
  - Variables CSS pour une cohérence visuelle
  - Animations et transitions

- **JavaScript (Vanilla)**
  - Programmation orientée objet
  - API fetch pour les requêtes HTTP
  - API MediaRecorder pour l'enregistrement audio
  - Gestion locale du stockage (localStorage)

## Configuration

L'application est configurée pour communiquer avec une API REST sur le port 3000. Les paramètres de configuration se trouvent dans le fichier `assets/js/config.js`.

## Sécurité

- **Authentification**
  - Stockage sécurisé des tokens JWT
  - Vérification de l'expiration des tokens
  - Protection contre la CSRF

- **Données sensibles**
  - Toutes les données sensibles sont chiffrées (AES-256)
  - Vérification d'intégrité (SHA-256)
  - Communication sécurisée via HTTPS

## Déploiement

L'application est conçue pour être servie par Apache HTTP Server dans un conteneur Docker. Les fichiers statiques sont copiés dans le répertoire `/usr/local/apache2/htdocs/` de l'image Docker.

## Développement

Pour le développement local, vous pouvez simplement ouvrir les fichiers HTML dans un navigateur ou utiliser un serveur web local comme Live Server (extension VS Code).