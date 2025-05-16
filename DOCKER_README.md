# Configuration Docker pour MousstassWeb

Ce document explique comment utiliser Docker pour développer et déboguer l'application MousstassWeb.

## Prérequis

- Docker Desktop installé et démarré
- Docker Compose installé (généralement inclus avec Docker Desktop)

## Architecture

L'architecture Docker se compose de trois services principaux :

1. **Backend** : API REST Node.js avec Express
2. **Frontend** : Application web servie par Node.js
3. **DB** : Base de données MySQL

## Structure des fichiers

- `docker-compose.yml` : Configuration de l'orchestration des services
- `backend/Dockerfile` : Configuration du conteneur backend
- `frontend/Dockerfile` : Configuration du conteneur frontend
- `start-docker.sh` et `start-docker.bat` : Scripts de démarrage pour Linux/Mac et Windows

## Démarrage rapide

### Sur Windows :

```bash
.\start-docker.bat
```

### Sur Linux/Mac :

```bash
./start-docker.sh
```

## URLs d'accès

- **Frontend** : http://localhost
- **Backend API** : http://localhost:3000
- **Base de données** : localhost:3306 (utilisateur: moustass, mot de passe: moustass_password)

## Commandes utiles

### Afficher les logs des conteneurs

```bash
docker-compose logs
```

Pour suivre les logs en temps réel :

```bash
docker-compose logs -f
```

### Accéder au shell d'un conteneur

```bash
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec db bash
```

### Redémarrer un service

```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db
```

### Arrêter tous les services

```bash
docker-compose down
```

## Débogage

Le backend expose le débogueur Node.js sur le port 9229. Vous pouvez vous y connecter depuis votre IDE :

- **VS Code** : Configurez un fichier `launch.json` avec l'option "Attach to Node.js" pointant vers localhost:9229
- **WebStorm/IntelliJ** : Créez une configuration de débogage à distance pointant vers localhost:9229

## Volumes pour le développement

Les fichiers locaux sont montés dans les conteneurs, ce qui permet de voir les changements en temps réel sans reconstruire les images :

- Backend : `./backend` est monté dans `/usr/src/app`
- Frontend : `./frontend` est monté dans `/usr/src/app`

## Base de données

La base de données est initialisée avec les scripts de migration situés dans `./backend/db/migrations`. Les données persistent même après l'arrêt des conteneurs grâce au volume Docker nommé `mysql_data`. 