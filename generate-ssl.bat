@echo off
echo Génération des certificats SSL auto-signés...

REM Création des répertoires si nécessaires
mkdir apache\ssl 2>nul

REM Générer une clé privée
openssl genrsa -out apache\ssl\localhost.key 2048

REM Générer un certificat auto-signé
openssl req -new -x509 -key apache\ssl\localhost.key -out apache\ssl\localhost.crt -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo Certificats générés avec succès!
echo - Clé privée: apache\ssl\localhost.key
echo - Certificat: apache\ssl\localhost.crt 