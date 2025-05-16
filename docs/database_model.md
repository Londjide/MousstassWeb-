# Modèle Relationnel - MousstassWeb

Ce document décrit le modèle relationnel de la base de données utilisée par l'application MousstassWeb.

## Vue d'ensemble

MousstassWeb utilise une base de données MySQL pour stocker les informations sur les utilisateurs, les enregistrements audio, les partages et les préférences.

## Tables principales

### Users (Utilisateurs)
Table centrale qui stocke les informations des utilisateurs.

| Champ | Type | Description |
|-------|------|-------------|
| id | INT | Identifiant unique, clé primaire |
| username | VARCHAR(50) | Nom d'utilisateur unique |
| password | VARCHAR(255) | Mot de passe hashé |
| email | VARCHAR(100) | Email unique |
| full_name | VARCHAR(100) | Nom complet |
| created_at | TIMESTAMP | Date de création du compte |
| updated_at | TIMESTAMP | Date de dernière modification |
| photo_url | VARCHAR(255) | URL de la photo de profil |
| role | ENUM | Rôle (user, admin) |
| status | ENUM | Statut (active, suspended, deleted) |
| preferences | JSON | Préférences utilisateur (colonne ajoutée ultérieurement) |

### User_Keys (Clés utilisateur)
Stocke les paires de clés cryptographiques pour chaque utilisateur.

| Champ | Type | Description |
|-------|------|-------------|
| id | INT | Identifiant unique |
| user_id | INT | Référence à l'utilisateur (foreign key) |
| public_key | TEXT | Clé publique de l'utilisateur |
| private_key | TEXT | Clé privée de l'utilisateur (chiffrée) |
| created_at | TIMESTAMP | Date de création des clés |

### Recordings (Enregistrements)
Contient les métadonnées des enregistrements audio.

| Champ | Type | Description |
|-------|------|-------------|
| id | INT | Identifiant unique |
| name | VARCHAR(255) | Nom de l'enregistrement |
| file_path | VARCHAR(255) | Chemin du fichier |
| timestamp | TIMESTAMP | Date de création |
| duration | INT | Durée en secondes |
| user_id | INT | Référence à l'utilisateur propriétaire |
| encryption_key | TEXT | Clé AES chiffrée avec la clé publique du propriétaire |
| description | TEXT | Description de l'enregistrement |

### Shared_Recordings (Enregistrements partagés)
Gère les partages d'enregistrements entre utilisateurs.

| Champ | Type | Description |
|-------|------|-------------|
| id | INT | Identifiant unique |
| recording_id | INT | Référence à l'enregistrement partagé |
| source_user_id | INT | Utilisateur qui partage |
| target_user_id | INT | Utilisateur avec qui l'enregistrement est partagé |
| permissions | VARCHAR(10) | Permissions accordées (read, edit) |
| encryption_key | TEXT | Clé AES rechiffrée avec la clé publique du destinataire |
| shared_date | TIMESTAMP | Date du partage |

### Notifications
Gère les notifications aux utilisateurs.

| Champ | Type | Description |
|-------|------|-------------|
| id | INT | Identifiant unique |
| user_id | INT | Utilisateur destinataire |
| message | TEXT | Contenu de la notification |
| is_read | BOOLEAN | État de lecture |
| created_at | TIMESTAMP | Date de création |
| recording_id | INT | Référence optionnelle à un enregistrement |

## Relations

1. Un **utilisateur** peut avoir plusieurs **clés** (1:1 actuellement, potentiellement 1:N)
2. Un **utilisateur** peut posséder plusieurs **enregistrements** (1:N)
3. Un **utilisateur** peut partager ses **enregistrements** avec d'autres utilisateurs (M:N via shared_recordings)
4. Un **utilisateur** peut recevoir plusieurs **notifications** (1:N)

## Sécurité des données

- Les mots de passe sont stockés sous forme hashée (bcrypt)
- Les enregistrements audio sont chiffrés avec AES
- Chaque utilisateur a sa propre paire de clés pour le chiffrement asymétrique
- Les clés de chiffrement AES sont rechiffrées lors du partage

## Indexation

- Index sur les clés primaires (automatique)
- Index unique sur username et email
- Index sur target_user_id dans shared_recordings pour optimiser les requêtes de listage 