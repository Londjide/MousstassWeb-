#!/bin/bash

# Afficher un message d'information
echo "Démarrage de l'application MousstassWeb via Docker..."

# Construire et démarrer les services
docker-compose up --build -d

# Attendre que les services démarrent
echo "Attente du démarrage des services..."
sleep 10

# Afficher l'état des services
docker-compose ps

# Afficher les URL d'accès
echo ""
echo "Application démarrée avec succès !"
echo "------------------------------------"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3000"
echo "Base de données: localhost:3306"
echo "------------------------------------"
echo "Logs des conteneurs:"
echo "docker-compose logs"
echo ""
echo "Pour arrêter l'application:"
echo "docker-compose down"
echo "------------------------------------" 