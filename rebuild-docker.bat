@echo off
echo Arret des conteneurs en cours...
docker compose down

echo Suppression des volumes Docker...
docker volume prune -f

echo Nettoyage des images non utilisees...
docker system prune -f

echo Reconstruction des images sans cache...
docker compose build --no-cache

echo Demarrage des services...
docker compose up -d

echo Services demarres en arriere-plan. Pour voir les logs, utilisez: docker compose logs -f 