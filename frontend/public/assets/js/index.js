/**
 * Script spécifique à la page d'accueil
 */
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token') || getCookie('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user) {
        // Si l'utilisateur est connecté, personnaliser le message de bienvenue
        const welcomeTitle = document.querySelector('.card-title');
        if (welcomeTitle && welcomeTitle.textContent.includes('Bienvenue')) {
            welcomeTitle.textContent = `Bienvenue, ${user.username} !`;
        }
        
        // Mettre à jour l'interface pour les utilisateurs connectés
        const authRequiredElements = document.querySelectorAll('.auth-required');
        authRequiredElements.forEach(el => el.style.display = 'block');
        
        const authHiddenElements = document.querySelectorAll('.auth-hidden');
        authHiddenElements.forEach(el => el.style.display = 'none');
    }
    
    /**
     * Récupère la valeur d'un cookie
     * @param {string} name - Nom du cookie
     * @returns {string|null} - Valeur du cookie ou null
     */
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                return cookie.substring(name.length + 1);
            }
        }
        return null;
    }
}); 