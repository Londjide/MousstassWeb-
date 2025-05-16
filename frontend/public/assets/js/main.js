/**
 * Fichier principal pour l'application Missié Moustass Web
 * Gère l'initialisation, l'UI et la coordination entre modules
 */

// Cache global pour les requêtes API
const apiCache = {
  data: {},
  ttl: 30000 // Par défaut 30 secondes
};

document.addEventListener('DOMContentLoaded', () => {
  // Synchroniser les tokens immédiatement (avant tout autre traitement)
  synchronizeTokens();
  
  // Initialiser le thème global
  if (utils && utils.initGlobalTheme) {
    utils.initGlobalTheme();
  }
  
  // Cacher l'indicateur de chargement et afficher l'application
  setTimeout(() => {
    // Masquer le loading indicator (si présent)
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // Afficher le contenu de l'application
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      appContainer.style.display = 'block';
      appContainer.style.opacity = '1';
    }
    
    console.log("Écran de chargement masqué, application affichée");
  }, 300);
  
  // Initialiser les événements généraux
  setupModalEvents();
  setupNavigation();
  
  // Vérifier si nous sommes sur la page d'enregistrement
  const recordingInterface = document.getElementById('recording-interface');
  if (recordingInterface) {
    initRecordingScreen();
  }
  
  // Vérifier si nous sommes sur la page de lecture
  const playerSection = document.getElementById('player-section');
  if (playerSection && playerSection.style.display !== 'none') {
    initPlayerScreen();
  }
  
  // Vérifier si l'utilisateur est connecté et appliquer l'UI correspondante
  checkAuthAndUpdateUI();
  
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

  // Ajouter un listener pour synchroniser les tokens à chaque changement de page
  window.addEventListener('beforeunload', synchronizeTokens);

  // Ajouter des écouteurs d'événements supplémentaires pour assurer la synchronisation
  window.addEventListener('visibilitychange', synchronizeTokens);
  
  // Synchroniser les tokens toutes les 30 secondes
  setInterval(synchronizeTokens, 30000);
  
  // Ajouter un écouteur spécifique pour les liens vers /recordings
  document.querySelectorAll('a[href*="/recordings"]').forEach(link => {
    link.addEventListener('click', (e) => {
      // Synchroniser les tokens avant de suivre le lien
      synchronizeTokens();
    });
  });
});

/**
 * Synchronise les tokens entre localStorage et cookies
 * Évite la multiplication des requêtes de synchronisation
 */
let lastTokenSync = 0;
const TOKEN_SYNC_INTERVAL = 5000; // Limite à 5 secondes entre les syncs

function synchronizeTokens() {
  const now = Date.now();
  // Limite la fréquence de synchronisation pour éviter des appels trop répétitifs
  if (now - lastTokenSync < TOKEN_SYNC_INTERVAL) {
    return;
  }
  
  lastTokenSync = now;
  const jwt = localStorage.getItem('moustass_token');
  
  if (jwt) {
    // Ne définissez les cookies que si le token n'existe pas déjà ou s'il est différent
    let needsUpdate = true;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('token=') || cookie.startsWith('moustass_token=')) {
        const cookieValue = cookie.split('=')[1];
        if (cookieValue === jwt) {
          // Le cookie existe déjà avec la bonne valeur
          needsUpdate = false;
          break;
        }
      }
    }
    
    if (needsUpdate) {
      document.cookie = `moustass_token=${jwt}; path=/; SameSite=Strict; max-age=604800`;
      document.cookie = `token=${jwt}; path=/; SameSite=Strict; max-age=604800`;
      console.log("Token JWT synchronisé du localStorage vers les cookies");
      // Mettre à jour l'avatar dans le header si l'utilisateur est connecté
      updateHeaderAvatar();
    }
  } else {
    // Vérifier si le token existe dans les cookies mais pas dans localStorage
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('moustass_token=') || cookie.startsWith('token=')) {
        const tokenValue = cookie.split('=')[1];
        if (tokenValue && tokenValue.length > 10) { // Vérification basique que c'est bien un token
          // Récupérer le token depuis les cookies et le mettre dans localStorage
          localStorage.setItem('moustass_token', tokenValue);
          console.log("Token JWT récupéré des cookies vers localStorage");
          break;
        }
      }
    }
  }
}

/**
 * Vérifie l'état d'authentification et met à jour l'UI
 */
function checkAuthAndUpdateUI() {
  const token = localStorage.getItem('moustass_token');
  const userDataStr = localStorage.getItem('moustass_user');
  
  if (token && userDataStr) {
    try {
      // Vérifier que les données utilisateur sont valides
      const userData = JSON.parse(userDataStr);
      if (userData && (userData.username || userData.full_name)) {
        // L'utilisateur est connecté
        showAuthenticatedUI();
        
        // Vérifier la validité du token avec le serveur
        verifyTokenValidity();
        return;
      }
    } catch (e) {
      console.error("Erreur lors de la lecture des données utilisateur:", e);
    }
  }
  
  // Si on arrive ici, l'utilisateur n'est pas correctement authentifié
  showUnauthenticatedUI();
}

/**
 * Vérifie la validité du token auprès du serveur
 */
async function verifyTokenValidity() {
  try {
    const token = localStorage.getItem('moustass_token');
    if (!token) return;
    
    const response = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success || !data.valid) {
      console.warn("Token invalide, déconnexion de l'utilisateur");
      handleLogout();
    } else if (data.user) {
      // Mettre à jour les informations utilisateur si disponibles
      localStorage.setItem('moustass_user', JSON.stringify(data.user));
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    // En cas d'erreur de connexion, on conserve le statut actuel
  }
}

/**
 * Configure les événements des modales
 */
function setupModalEvents() {
  // Fermeture des modales quand on clique sur le X
  const closeButtons = document.querySelectorAll('.close');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Fermeture des modales quand on clique en dehors
  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
}

/**
 * Configure la navigation entre les sections
 */
function setupNavigation() {
  // Navigation vers la section d'enregistrement
  const startRecordingBtn = document.getElementById('start-recording');
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener('click', () => {
      const recordingInterface = document.getElementById('recording-interface');
      if (recordingInterface) {
        document.querySelector('.hero').style.display = 'none';
        document.querySelector('.features').style.display = 'none';
        recordingInterface.style.display = 'block';
        initRecordingScreen();
      }
    });
  }
  
  // Navigation vers la section d'exploration
  const exploreButton = document.getElementById('explore-button');
  if (exploreButton) {
    exploreButton.addEventListener('click', () => {
      const recordingsSection = document.getElementById('recordings-section');
      if (recordingsSection) {
        // Vérifier l'authentification avant d'afficher les enregistrements
        const token = localStorage.getItem('moustass_token');
        if (token) {
          document.querySelector('.hero').style.display = 'none';
          document.querySelector('.features').style.display = 'none';
          recordingsSection.classList.remove('hidden');
          recordingsSection.style.display = 'block';
        } else {
          // Afficher la modale de connexion
          const loginModal = document.getElementById('login-modal');
          if (loginModal) loginModal.style.display = 'block';
        }
      }
    });
  }
  
  // Retour à l'écran principal depuis la page d'enregistrement
  const backFromRecordBtn = document.getElementById('back-to-recordings');
  if (backFromRecordBtn) {
    backFromRecordBtn.addEventListener('click', () => {
      const recorderSection = document.getElementById('recorder-section');
      const recordingsSection = document.getElementById('recordings-section');
      if (recorderSection && recordingsSection) {
        recorderSection.style.display = 'none';
        recordingsSection.style.display = 'block';
      }
    });
  }
  
  // Retour à l'écran principal depuis la page de lecture
  const backFromPlayerBtn = document.getElementById('back-from-player');
  if (backFromPlayerBtn) {
    backFromPlayerBtn.addEventListener('click', () => {
      const playerSection = document.getElementById('player-section');
      const recordingsSection = document.getElementById('recordings-section');
      if (playerSection && recordingsSection) {
        playerSection.style.display = 'none';
        recordingsSection.style.display = 'block';
      }
    });
  }
}

/**
 * Initialise l'écran d'enregistrement
 */
function initRecordingScreen() {
  // À implémenter si besoin
}

/**
 * Initialise l'écran de lecture
 */
function initPlayerScreen() {
  // À implémenter si besoin
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
  localStorage.removeItem('moustass_token');
  localStorage.removeItem('moustass_user');
  
  // Mettre à jour l'interface
  showUnauthenticatedUI();
  
  // Rediriger vers la page d'accueil
  window.location.href = '/';
}

/**
 * Met à jour l'avatar utilisateur dans l'en-tête
 */
async function updateHeaderAvatar() {
  const userAvatar = document.getElementById('user-avatar');
  const userProfile = document.getElementById('user-profile');
  
  if (!userAvatar || !userProfile) return;
  
  try {
    // Afficher l'élément de profil pendant le chargement
    userProfile.style.display = 'flex';
    
    // Récupérer le profil utilisateur depuis l'API
    const token = localStorage.getItem('moustass_token');
    const response = await fetch('http://localhost:3000/api/users/profile', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.user) {
      // Mis à jour du localStorage avec les données fraîches
      localStorage.setItem('moustass_user', JSON.stringify(data.user));
      
      // Mettre à jour l'avatar
      userAvatar.innerHTML = '';
      if (data.user.photo_url) {
        const img = document.createElement('img');
        img.src = data.user.photo_url + '?t=' + Date.now();
        img.alt = 'Photo de profil';
        img.className = 'profile-pic';
        userAvatar.appendChild(img);
        userAvatar.title = data.user.full_name || data.user.username;
      } else if (data.user.full_name) {
        const initials = data.user.full_name.trim().split(' ').map(p => p[0]).join('').toUpperCase();
        userAvatar.textContent = initials;
        userAvatar.title = data.user.full_name;
      } else if (data.user.username) {
        userAvatar.textContent = data.user.username.slice(0, 2).toUpperCase();
        userAvatar.title = data.user.username;
      } else {
        userAvatar.textContent = '?';
        userAvatar.title = 'Utilisateur';
      }
    } else {
      console.warn('Impossible de récupérer les données utilisateur:', data.message);
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'avatar:', error);
    
    // En cas d'erreur, essayer d'utiliser les données en cache
    const userData = localStorage.getItem('moustass_user');
    if (userData) {
      const user = JSON.parse(userData);
      userAvatar.innerHTML = '';
      if (user.photo_url) {
        const img = document.createElement('img');
        img.src = user.photo_url + '?t=' + Date.now();
        img.alt = 'Photo de profil';
        img.className = 'profile-pic';
        userAvatar.appendChild(img);
      } else if (user.full_name) {
        const initials = user.full_name.trim().split(' ').map(p => p[0]).join('').toUpperCase();
        userAvatar.textContent = initials;
      } else if (user.username) {
        userAvatar.textContent = user.username.slice(0, 2).toUpperCase();
      } else {
        userAvatar.textContent = '?';
      }
    }
  }
} 