@echo off
echo Demarrage de l'application MousstassWeb via Docker...

REM Construire et demarrer les services
docker-compose up --build -d

REM Attendre que les services demarrent
echo Attente du demarrage des services...
timeout /t 10 /nobreak > nul

REM Afficher l'etat des services
docker-compose ps

REM Afficher les URL d'acces
echo.
echo Application demarree avec succes !
echo ------------------------------------
echo Frontend: http://localhost
echo Backend API: http://localhost:3000
echo Base de donnees: localhost:3306
echo ------------------------------------
echo Logs des conteneurs:
echo docker-compose logs
echo.
echo Pour arreter l'application:
echo docker-compose down
echo ------------------------------------

pause 