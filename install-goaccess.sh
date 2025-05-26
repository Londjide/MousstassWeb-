#!/bin/bash

# Script d'installation de GoAccess pour l'analyse des logs Apache
echo "Installation de GoAccess pour l'analyse des logs..."

# Création du répertoire pour les rapports
mkdir -p reports/goaccess

# Installation de GoAccess dans le conteneur Apache
docker exec -it mousstass_apache sh -c "
    # Installation des dépendances
    apt-get update && \
    apt-get install -y wget libncursesw5-dev gcc make libgeoip-dev

    # Téléchargement et extraction de GoAccess
    cd /tmp && \
    wget https://tar.goaccess.io/goaccess-1.7.2.tar.gz && \
    tar -xzvf goaccess-1.7.2.tar.gz && \
    cd goaccess-1.7.2/ && \
    
    # Configuration et installation
    ./configure --enable-utf8 --enable-geoip=legacy && \
    make && \
    make install && \
    
    # Création du fichier de configuration
    mkdir -p /etc/goaccess && \
    echo \"
date-format %d/%b/%Y
time-format %H:%M:%S
log-format %h %^[%d:%t %^] \"%r\" %s %b \"%R\" \"%u\"
\" > /etc/goaccess/goaccess.conf
"

echo "Installation terminée."
echo "Pour générer un rapport HTML en temps réel, exécutez:"
echo "docker exec -it mousstass_apache goaccess /usr/local/apache2/logs/access.log -o /usr/local/apache2/htdocs/report.html --real-time-html --config-file=/etc/goaccess/goaccess.conf"
echo "Puis accédez à: http://localhost:8081/report.html" 