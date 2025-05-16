#!/bin/bash

echo "Arrêt des conteneurs en cours..."
docker-compose down

echo "Suppression des volumes Docker..."
docker volume prune -f

echo "Nettoyage des images non utilisées..."
docker system prune -f

echo "Reconstruction des images sans cache..."
docker-compose build --no-cache

echo "Démarrage des services..."
docker-compose up -d

echo "Services démarrés en arrière-plan. Pour voir les logs, utilisez: docker-compose logs -f" 