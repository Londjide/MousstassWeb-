# Missié Moustass Web

Application web sécurisée pour l'enregistrement et le partage audio avec chiffrement hybride AES/RSA.

## Fonctionnalités

- **Enregistrement audio** : Capture et stockage d'enregistrements audio
- **Lecture sécurisée** : Lecture des enregistrements avec déchiffrement à la volée
- **Chiffrement hybride** : Protection des données par chiffrement AES/RSA
- **Partage d'enregistrements** : Partage entre utilisateurs avec gestion des clés
- **Gestion des notifications** : Alertes lors de nouveaux partages

## Prérequis

- Node.js (v14 ou supérieur)
- MySQL (v5.7 ou supérieur)

## Installation

1. Cloner le dépôt :
   ```
   git clone https://github.com/votre-nom/missie-moustass-web.git
   cd missie-moustass-web
   ```

2. Installer les dépendances :
   ```
   npm install
   ```

3. Configurer la base de données :
   - Créer une base de données MySQL nommée `moustass_web`
   - Modifier le fichier `.env` si nécessaire pour ajuster les paramètres de connexion

4. Démarrer l'application :
   - Sous Windows : double-cliquer sur `start.bat`
   - Sous Linux/Mac : `./start.sh`
   - Ou manuellement : `npm start`

5. Accéder à l'application :
   - Ouvrir `frontend/public/index.html` dans votre navigateur
   - Ou accéder à `http://localhost:3000` si vous avez configuré un serveur pour le frontend

## Structure du projet

- `backend/` : Serveur API Express.js
  - `db/` : Scripts d'initialisation de la base de données
  - `src/` : Code source du backend
    - `controllers/` : Contrôleurs pour les routes API
    - `middleware/` : Middleware Express (authentification, etc.)
    - `models/` : Modèles de données et logique métier
    - `routes/` : Routes API
    - `utils/` : Utilitaires divers
  - `uploads/` : Stockage des fichiers audio chiffrés
  - `temp/` : Stockage temporaire pour les uploads

- `frontend/` : Interface utilisateur
  - `public/` : Contenu statique
    - `assets/` : Ressources (CSS, JS, images)
    - `index.html` : Page principale

## Sécurité

L'application utilise un chiffrement hybride pour protéger les données audio :
- Chiffrement AES-256 pour les fichiers audio
- Chiffrement RSA pour les clés AES
- Clés de chiffrement uniques par enregistrement et par partage
- Authentification par JWT (JSON Web Tokens)

## Licence

MIT