/**
 * Fichier principal pour l'application Missié Moustass Web
 * Gère l'initialisation, l'UI et la coordination entre modules
 */

document.addEventListener('DOMContentLoaded', () => {
  // Synchroniser le token du localStorage vers le cookie 'moustass_token' pour l'accès backend
  const jwt = localStorage.getItem('moustass_token');
  if (jwt) {
    document.cookie = `moustass_token=${jwt}; path=/;`;
  }
  
  // Initialiser le thème global
  if (utils && utils.initGlobalTheme) {
    utils.initGlobalTheme();
  }
  
  // Simulation du chargement
  setTimeout(() => {
    hideLoadingScreen();
  }, 1000);
  
  // Initialisation des modules
  initUI();
  
  // Vérifier si l'utilisateur est connecté
  const token = localStorage.getItem(config.tokenKey);
  if (token) {
    showAuthenticatedUI();
  } else {
    showUnauthenticatedUI();
  }
  
  // Mécanisme de sécurité pour forcer la disparition de l'écran de chargement
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen && loadingScreen.style.display !== 'none') {
      console.warn("Forçage de la disparition de l'écran de chargement après délai maximal");
      loadingScreen.style.display = 'none';
      
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.display = 'block';
        appContainer.style.opacity = '1';
      }
    }
  }, 3000);
});

/**
 * Masque l'écran de chargement et affiche l'application
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  const appContainer = document.getElementById('app-container');
  
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 300);
  }
  
  if (appContainer) {
    appContainer.style.display = 'block';
    appContainer.style.opacity = '1';
  }
  
  console.log("Écran de chargement masqué, application affichée");
}

/**
 * Initialise l'interface utilisateur
 */
function initUI() {
  // Gestion des boutons d'authentification
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const logoutButton = document.getElementById('logout-button');
  
  if (loginButton) {
    loginButton.addEventListener('click', showLoginModal);
  }
  
  if (registerButton) {
    registerButton.addEventListener('click', showRegisterModal);
  }
  
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
  
  // Gestion des modals
  setupModals();
  
  // Gestion des boutons d'action
  const startRecordingButton = document.getElementById('start-recording');
  const exploreButton = document.getElementById('explore-button');
  
  if (startRecordingButton) {
    startRecordingButton.addEventListener('click', showRecordingInterface);
  }
  
  if (exploreButton) {
    exploreButton.addEventListener('click', scrollToFeatures);
  }
}

/**
 * Configure les modales de l'application
 */
function setupModals() {
  // Sélectionner toutes les modales
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close');
  
  // Configurer les boutons de fermeture
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modals.forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });
  
  // Fermer la modale en cliquant à l'extérieur
  window.addEventListener('click', (event) => {
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * Affiche la modale de connexion
 */
function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Affiche la modale d'inscription
 */
function showRegisterModal() {
  const modal = document.getElementById('register-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Affiche l'interface pour les utilisateurs connectés
 */
function showAuthenticatedUI() {
  // Masquer les boutons de connexion/inscription
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const logoutButton = document.getElementById('logout-button');
  
  if (loginButton) loginButton.style.display = 'none';
  if (registerButton) registerButton.style.display = 'none';
  if (logoutButton) logoutButton.style.display = 'inline-block';
  
  // Afficher les liens de navigation protégés
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = 'block';
  });
}

/**
 * Affiche l'interface pour les utilisateurs non connectés
 */
function showUnauthenticatedUI() {
  // Afficher les boutons de connexion/inscription
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const logoutButton = document.getElementById('logout-button');
  
  if (loginButton) loginButton.style.display = 'inline-block';
  if (registerButton) registerButton.style.display = 'inline-block';
  if (logoutButton) logoutButton.style.display = 'none';
  
  // Masquer les liens de navigation protégés
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = 'none';
  });
}

/**
 * Gère la déconnexion de l'utilisateur
 */
function handleLogout() {
  // Supprimer le token et les infos utilisateur
  localStorage.removeItem(config.tokenKey);
  localStorage.removeItem(config.userKey);
  
  // Mettre à jour l'interface
  showUnauthenticatedUI();
  
  // Rediriger vers la page d'accueil
  window.location.href = '/';
}

/**
 * Affiche l'interface d'enregistrement
 */
function showRecordingInterface() {
  const recordingInterface = document.getElementById('recording-interface');
  const heroSection = document.querySelector('.hero');
  const featuresSection = document.querySelector('.features');
  
  if (recordingInterface && heroSection && featuresSection) {
    heroSection.style.display = 'none';
    featuresSection.style.display = 'none';
    recordingInterface.style.display = 'block';
    
    // Initialiser l'enregistrement si la fonction existe
    if (typeof initRecording === 'function') {
      initRecording();
    }
  }
}

/**
 * Fait défiler la page jusqu'à la section des fonctionnalités
 */
function scrollToFeatures() {
  const featuresSection = document.querySelector('.features');
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' });
  }
} 