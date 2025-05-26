#!/bin/bash

# Script de démarrage complet de MousstassWeb
echo "======================================================"
echo "        DÉMARRAGE COMPLET DE MOUSSTASSWEB             "
echo "======================================================"

# Vérification des prérequis
echo "[1/7] Vérification des prérequis..."
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Erreur: Docker et/ou Docker Compose ne sont pas installés."
    echo "Veuillez les installer avant de continuer."
    exit 1
fi

# Arrêt des conteneurs existants
echo "[2/7] Arrêt des conteneurs existants..."
docker-compose down

# Nettoyage des ressources Docker
echo "[3/7] Nettoyage des ressources Docker..."
docker system prune -f

# Génération des certificats SSL si nécessaire
echo "[4/7] Vérification des certificats SSL..."
if [ ! -f "apache/ssl/localhost.crt" ] || [ ! -f "apache/ssl/localhost.key" ]; then
    echo "Certificats SSL non trouvés. Génération en cours..."
    mkdir -p apache/ssl
    
    # Génération des certificats
    openssl genrsa -out apache/ssl/localhost.key 2048
    openssl req -new -x509 -key apache/ssl/localhost.key -out apache/ssl/localhost.crt -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi

# Création des répertoires pour les logs et rapports
echo "[5/7] Création des répertoires pour les logs et rapports..."
mkdir -p apache/logs
mkdir -p reports/goaccess
mkdir -p reports/performance

# Démarrage des conteneurs
echo "[6/7] Démarrage des conteneurs..."
docker-compose up -d

# Attente que les services soient prêts
echo "[7/7] Attente du démarrage des services..."
echo "Cette opération peut prendre quelques instants..."
sleep 10

# Vérification de l'état des services
echo "======================================================"
echo "              ÉTAT DES SERVICES                       "
echo "======================================================"
echo "Frontend (http://localhost:8080): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080 || echo "Non disponible"

echo "Backend API (http://localhost:3000/api/health): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health || echo "Non disponible"

echo "Apache (http://localhost:8081): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081 || echo "Non disponible"

echo "Apache SSL (https://localhost:8443): "
curl -s -k -o /dev/null -w "%{http_code}\n" https://localhost:8443 || echo "Non disponible"

echo "======================================================"
echo "             INSTALLATION DE GOACCESS                 "
echo "======================================================"
# Installation de GoAccess pour l'analyse des logs
docker exec -it mousstass_apache sh -c "
    apt-get update && \
    apt-get install -y wget libncursesw5-dev gcc make libgeoip-dev && \
    cd /tmp && \
    wget https://tar.goaccess.io/goaccess-1.7.2.tar.gz && \
    tar -xzvf goaccess-1.7.2.tar.gz && \
    cd goaccess-1.7.2/ && \
    ./configure --enable-utf8 --enable-geoip=legacy && \
    make && \
    make install && \
    mkdir -p /etc/goaccess && \
    echo \"
date-format %d/%b/%Y
time-format %H:%M:%S
log-format %h %^[%d:%t %^] \\\"%r\\\" %s %b \\\"%R\\\" \\\"%u\\\"
\" > /etc/goaccess/goaccess.conf
"

# Génération d'un rapport d'analyse des logs en arrière-plan
docker exec -d mousstass_apache sh -c "goaccess /usr/local/apache2/logs/access.log -o /usr/local/apache2/htdocs/report.html --real-time-html --config-file=/etc/goaccess/goaccess.conf"

# Affichage des URLs d'accès
echo "======================================================"
echo "          MOUSSTASSWEB EST PRÊT !                    "
echo "======================================================"
echo "URLs d'accès :"
echo "- Frontend: http://localhost:8080"
echo "- Backend API: http://localhost:3000/api"
echo "- Apache: http://localhost:8081"
echo "- Apache SSL: https://localhost:8443"
echo "- Analyse des logs (GoAccess): http://localhost:8081/report.html"
echo ""
echo "Pour arrêter l'application, utilisez la commande: docker-compose down" 