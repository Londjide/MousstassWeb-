@echo off
echo Demarrage de l'application Moustass...

REM Arrêt des conteneurs existants
docker compose down

REM Nettoyage des ressources Docker
docker system prune -f

REM Démarrage des conteneurs
docker compose up -d

echo Application demarree !
echo.
echo URLs d'acces :
echo - Frontend : http://localhost:8080
echo - Backend API : http://localhost:3000/api
echo - Apache : http://localhost:8081
echo - Apache SSL : https://localhost:8443
echo.

REM Test simple pour vérifier l'accessibilité des services
echo Test d'accessibilite en cours...
timeout /t 5 /nobreak > nul
echo.

REM Test du service frontend
curl -s -o nul -w "Frontend (8080): %%{http_code}\n" http://localhost:8080

REM Test du service backend
curl -s -o nul -w "Backend (3000): %%{http_code}\n" http://localhost:3000/api/health

REM Test du service apache
curl -s -o nul -w "Apache (8081): %%{http_code}\n" http://localhost:8081

echo.
echo Pour arreter l'application, utilisez la commande : docker compose down

pause 