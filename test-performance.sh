#!/bin/bash

# Script de test de performance avec Apache Benchmark (ab)
echo "Test de performance avec Apache Benchmark (ab)"
echo "----------------------------------------------"

# Vérification si Apache Benchmark est installé
if ! command -v ab &> /dev/null; then
    echo "Apache Benchmark (ab) n'est pas installé."
    echo "Installation en cours..."
    
    # Détection du système d'exploitation et installation
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y apache2-utils
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install httpd
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "Sur Windows, veuillez installer Apache Benchmark manuellement."
        echo "Vous pouvez télécharger Apache pour Windows et utiliser ab.exe."
        exit 1
    else
        echo "Système d'exploitation non supporté. Veuillez installer Apache Benchmark manuellement."
        exit 1
    fi
fi

# Création du répertoire pour les rapports
mkdir -p reports/performance

# Définition des cibles et paramètres de test
TARGET_HTTP="http://localhost:8080/"
TARGET_HTTPS="https://localhost:8443/"
TARGET_API="http://localhost:3000/api/health"

# Nombre de requêtes et concurrence
REQUESTS=1000
CONCURRENCY=10

# Fonction pour exécuter les tests et enregistrer les résultats
run_test() {
    local target=$1
    local name=$2
    local output_file="reports/performance/${name}_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Test de $name (cible: $target)"
    echo "- $REQUESTS requêtes avec une concurrence de $CONCURRENCY"
    echo "- Résultats enregistrés dans $output_file"
    
    # Exécution du test avec ab
    ab -n $REQUESTS -c $CONCURRENCY -k -H "Accept-Encoding: gzip, deflate" $target > $output_file
    
    # Extraction et affichage des informations importantes
    echo "Résultats:"
    grep "Requests per second" $output_file
    grep "Time per request" $output_file | head -n 1
    grep "Transfer rate" $output_file
    echo ""
}

# Exécution des tests
echo "Démarrage des tests..."
run_test $TARGET_HTTP "frontend_http"
run_test $TARGET_HTTPS "frontend_https"
run_test $TARGET_API "backend_api"

echo "Tests terminés. Rapports disponibles dans le dossier reports/performance/" 