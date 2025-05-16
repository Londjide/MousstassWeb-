# Stop any existing containers
Write-Host "Arrêt des conteneurs existants..."
docker compose -f "$PSScriptRoot\docker-compose.yml" down

# Clean up
Write-Host "Nettoyage des ressources Docker non utilisées..."
docker system prune -f

# Start the services
Write-Host "Démarrage des services..."
docker compose -f "$PSScriptRoot\docker-compose.yml" up -d

Write-Host "Services démarrés en arrière-plan."
Write-Host "L'application est accessible aux URLs suivantes :"
Write-Host "- Frontend: http://localhost:8080"
Write-Host "- Backend API: http://localhost:3001/api"
Write-Host "- Apache: http://localhost:8081"
Write-Host "- Apache SSL: https://localhost:8443" 