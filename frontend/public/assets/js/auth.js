/**
 * Service de gestion de l'authentification
 */
const authService = {
    /**
     * Stocke les informations de l'utilisateur connecté
     * @param {Object} user - Données utilisateur
     */
    setCurrentUser(user) {
      // Ne stocker que les infos nécessaires
      const minimalUser = {
        full_name: user.full_name,
        username: user.username
      };
      localStorage.setItem('moustass_user', JSON.stringify(minimalUser));
    },
  
    /**
     * Récupère les informations de l'utilisateur connecté
     * @returns {Object|null} Données utilisateur ou null si non disponible
     */
    getCurrentUser() {
      const userData = localStorage.getItem('moustass_user');
      return userData ? JSON.parse(userData) : null;
    },
  
    /**
     * Supprime les informations de l'utilisateur
     */
    clearCurrentUser() {
      localStorage.removeItem('moustass_user');
    },
  
    /**
     * Connecte un utilisateur
     * @param {string} username - Nom d'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} Réponse de l'API
     */
    async login(username, password) {
      try {
        const response = await api.post('/auth/login', { username, password });
        
        // Stockage du token et des informations utilisateur
        api.setToken(response.token);
        this.setCurrentUser(response.user);
        
        return response;
      } catch (error) {
        console.error('Erreur de connexion', error);
        throw error;
      }
    },
  
    /**
     * Inscrit un nouvel utilisateur
     * @param {Object} userData - Données d'inscription
     * @returns {Promise<Object>} Réponse de l'API
     */
    async register(userData) {
      try {
        return await api.post('/auth/register', userData);
      } catch (error) {
        console.error('Erreur d\'inscription', error);
        throw error;
      }
    },
  
    /**
     * Déconnecte l'utilisateur
     * @returns {Promise<Object>} Réponse de l'API
     */
    async logout() {
      try {
        // Appel API de déconnexion
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Erreur lors de la déconnexion', error);
      } finally {
        // Suppression des données locales même en cas d'erreur
        api.removeToken();
        this.clearCurrentUser();
      }
    },
  
    /**
     * Change le mot de passe de l'utilisateur
     * @param {string} currentPassword - Mot de passe actuel
     * @param {string} newPassword - Nouveau mot de passe
     * @returns {Promise<Object>} Réponse de l'API
     */
    async changePassword(currentPassword, newPassword) {
      try {
        return await api.post('/auth/change-password', {
          currentPassword,
          newPassword
        });
      } catch (error) {
        console.error('Erreur lors du changement de mot de passe', error);
        throw error;
      }
    },
  
    /**
     * Vérifie la validité du token
     * @returns {Promise<boolean>} Vrai si le token est valide
     */
    async verifyToken() {
      try {
        if (!api.isAuthenticated()) {
          return false;
        }
        
        // Appel API pour vérifier le token
        const response = await api.get('/auth/verify');
        return response.valid === true;
      } catch (error) {
        console.error('Token invalide', error);
        return false;
      }
    }
  };

/**
 * Module de gestion de l'authentification
 */
class Auth {
  constructor() {
    // Ne pas rechercher les éléments directement dans le constructeur
    // pour éviter les avertissements si les éléments n'existent pas encore
    
    // Initialisation des événements
    this.setupEventListeners();
    
    // Vérification automatique de l'authentification au chargement de la page
    this.initAuthentication();
  }
  
  /**
   * Initialise l'authentification de manière asynchrone
   */
  initAuthentication() {
    // Appeler checkAuthentication mais en asynchrone pour éviter les problèmes
    setTimeout(async () => {
      await this.checkAuthentication();
    }, 100);
  }
  
  /**
   * Récupère un élément DOM ou null s'il n'existe pas
   * @param {string} id - ID de l'élément à récupérer
   * @returns {Element|null} - Élément DOM ou null
   */
  getElement(id) {
    return document.getElementById(id);
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Boutons pour ouvrir les modales
    const loginBtn = this.getElement('login-btn');
    const registerBtn = this.getElement('register-btn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const loginModal = this.getElement('login-modal');
        if (loginModal) loginModal.style.display = 'block';
      });
    }
    
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        const registerModal = this.getElement('register-modal');
        if (registerModal) registerModal.style.display = 'block';
      });
    }
    
    // Fermeture des modales
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) modal.style.display = 'none';
      });
    });
    
    // Gestion des formulaires
    const loginForm = this.getElement('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    const registerForm = this.getElement('form-register');
    if (registerForm) {
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }
    
    // Basculement entre formulaires de connexion et d'inscription
    const switchToLoginBtn = this.getElement('switch-to-login');
    if (switchToLoginBtn) {
      switchToLoginBtn.addEventListener('click', this.showLoginForm.bind(this));
    }
    
    const switchToRegisterBtn = this.getElement('switch-to-register');
    if (switchToRegisterBtn) {
      switchToRegisterBtn.addEventListener('click', this.showRegisterForm.bind(this));
    }
    
    // Déconnexion
    const logoutBtn = this.getElement('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }
  
  /**
   * Vérifie si l'utilisateur est connecté en vérifiant le token stocké
   */
  async checkAuthentication() {
    console.log("=== DEBUG AUTH - DÉBUT checkAuthentication() ===");
    
    // Récupérer le token des différentes sources
    let token = null;
    let tokenSource = "aucune";
    
    // Fonction auxiliaire pour vérifier si un token semble valide (format minimal)
    const isTokenValid = (t) => {
      return t && typeof t === 'string' && t.length > 20 && t.split('.').length === 3;
    };
    
    // 1. Essayer localStorage (prioritaire)
    try {
      token = localStorage.getItem('moustass_token');
      if (isTokenValid(token)) {
        console.log("Token valide trouvé dans localStorage");
        tokenSource = "localStorage";
      } else if (token) {
        console.log("Token trouvé dans localStorage mais format invalide");
        token = null;
      }
    } catch (e) {
      console.error("Erreur lors de l'accès à localStorage:", e);
    }
    
    // 2. Si pas de token valide dans localStorage, essayer sessionStorage
    if (!token) {
      try {
        const sessionToken = sessionStorage.getItem('moustass_token');
        if (isTokenValid(sessionToken)) {
          token = sessionToken;
          tokenSource = "sessionStorage";
          console.log("Token valide trouvé dans sessionStorage");
          // Tenter de restaurer dans localStorage
          try {
            localStorage.setItem('moustass_token', token);
            console.log("Token restauré dans localStorage depuis sessionStorage");
          } catch (err) {
            console.error("Impossible de restaurer le token dans localStorage:", err);
          }
        } else if (sessionToken) {
          console.log("Token trouvé dans sessionStorage mais format invalide");
        }
      } catch (e) {
        console.error("Erreur lors de l'accès à sessionStorage:", e);
      }
    }
    
    // 3. Si toujours pas de token valide, essayer les cookies
    if (!token) {
      console.log("Recherche de token dans les cookies...");
      try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith('token=') || cookie.startsWith('moustass_token=')) {
            const cookieToken = cookie.split('=')[1];
            if (isTokenValid(cookieToken)) {
              token = cookieToken;
              tokenSource = "cookies";
              console.log(`Token valide trouvé dans les cookies: ${token.substring(0, 10)}...`);
              // Restaurer dans les autres stockages
              try { localStorage.setItem('moustass_token', token); } catch (e) {}
              try { sessionStorage.setItem('moustass_token', token); } catch (e) {}
              console.log("Token restauré dans localStorage/sessionStorage depuis les cookies");
              break;
            } else if (cookieToken) {
              console.log("Token trouvé dans les cookies mais format invalide");
            }
          }
        }
      } catch (e) {
        console.error("Erreur lors de l'accès aux cookies:", e);
      }
    }
    
    // Récupérer les données utilisateur
    let user = null;
    try {
      const userJson = localStorage.getItem('moustass_user');
      if (userJson) {
        user = JSON.parse(userJson);
        console.log("Données utilisateur trouvées:", user.username || user.full_name || "données incomplètes");
      }
    } catch (e) {
      console.error("Erreur lors de la récupération des données utilisateur:", e);
    }
    
    // Vérifier état des tokens
    console.log("Résultat de la recherche de token:", token ? `${token.substring(0, 10)}... (source: ${tokenSource})` : "ABSENT");
    
    // Vérifier si nous avons un token après la récupération
    if (!token) {
      console.log("Aucun token valide trouvé, définition de l'état non authentifié");
      this.setUnauthenticatedState();
      console.log("=== DEBUG AUTH - FIN checkAuthentication() (non authentifié) ===");
      return;
    }
    
    try {
      // Utiliser la méthode verifyToken de l'API qui utilise un cache
      // plutôt qu'une vérification directe à chaque fois
      console.log("Vérification de la validité du token avec cache...");
      
      // Vérifier si le module api est disponible
      if (typeof api !== 'undefined' && api.verifyToken) {
        const isValid = await api.verifyToken();
        console.log("Réponse du cache/serveur pour la vérification du token:", isValid ? "SUCCÈS" : "ÉCHEC");
        
        if (isValid) {
          console.log("Token validé, configuration de l'interface authentifiée");
          // Resynchroniser le token dans tous les stockages
          try { localStorage.setItem('moustass_token', token); } catch (e) {}
          try { sessionStorage.setItem('moustass_token', token); } catch (e) {}
          
          // Mise à jour des cookies avec une durée plus longue (7 jours)
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7);
          document.cookie = `token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          
          // Token valide, configurer l'interface authentifiée
          if (user && (user.full_name || user.username)) {
            console.log("Utilisation des données utilisateur en cache pour configurer l'interface");
            this.setAuthenticatedState(user);
          } else {
            console.log("Pas de données utilisateur en cache, récupération depuis le serveur");
            // Token valide mais pas d'utilisateur en cache, récupérer les infos
            this.setAuthenticatedState();
          }
        } else {
          console.log("Token invalide selon le cache/serveur, nettoyage des données locales");
          this.cleanupAuthentication();
          this.setUnauthenticatedState();
        }
        
        console.log("=== DEBUG AUTH - FIN checkAuthentication() ===");
        return;
      }
      
      // Fallback: vérification directe si l'API n'est pas disponible
      console.log("Module API non disponible, utilisation de la vérification directe");
      const response = await fetch('http://localhost:3000/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Réponse du serveur pour la vérification du token:", data.valid ? "SUCCÈS" : "ÉCHEC");
        
        if (data.valid) {
          console.log("Token validé par le serveur, configuration de l'interface authentifiée");
          // Resynchroniser le token dans tous les stockages
          try { localStorage.setItem('moustass_token', token); } catch (e) {}
          try { sessionStorage.setItem('moustass_token', token); } catch (e) {}
          
          // Mise à jour des cookies avec une durée plus longue (7 jours)
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7);
          document.cookie = `token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          
          // Token valide, configurer l'interface authentifiée
          if (user && (user.full_name || user.username)) {
            console.log("Utilisation des données utilisateur en cache pour configurer l'interface");
            this.setAuthenticatedState(user);
          } else {
            console.log("Pas de données utilisateur en cache, récupération depuis le serveur");
            // Token valide mais pas d'utilisateur en cache, récupérer les infos
            this.setAuthenticatedState();
          }
        } else {
          console.log("Token invalide selon le serveur, nettoyage des données locales");
          this.cleanupAuthentication();
          this.setUnauthenticatedState();
        }
      } else {
        console.log("Réponse serveur en erreur, nettoyage des données locales");
        this.cleanupAuthentication();
        this.setUnauthenticatedState();
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du token:", error);
      console.log("Impossible de contacter le serveur, on fait confiance au token local");
      // En cas d'erreur de connexion, on fait confiance au token local
      if (token && user && (user.full_name || user.username)) {
        console.log("Token et données utilisateur présents localement, configuration de l'interface authentifiée");
        this.setAuthenticatedState(user);
      } else {
        console.log("Données locales insuffisantes, configuration de l'interface non authentifiée");
        this.setUnauthenticatedState();
      }
    }
    console.log("=== DEBUG AUTH - FIN checkAuthentication() ===");
  }
  
  /**
   * Nettoie toutes les données d'authentification
   */
  cleanupAuthentication() {
    console.log("Nettoyage des données d'authentification");
    try { localStorage.removeItem('moustass_token'); } catch (e) {}
    try { localStorage.removeItem('moustass_user'); } catch (e) {}
    try { sessionStorage.removeItem('moustass_token'); } catch (e) {}
    
    // Expiration immédiate des cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "moustass_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    console.log("Données d'authentification nettoyées");
  }
  
  /**
   * Configure l'interface pour un utilisateur authentifié
   * @param {Object} user - Données de l'utilisateur
   */
  async setAuthenticatedState() {
    console.log("=== DEBUG AUTH - DÉBUT setAuthenticatedState() ===");
    // Récupérer dynamiquement le profil utilisateur
    const token = localStorage.getItem('moustass_token');
    if (!token) {
      console.log("Token absent lors de la tentative de configuration de l'interface authentifiée");
      this.setUnauthenticatedState();
      return;
    }
    try {
      console.log("Récupération du profil utilisateur depuis le serveur...");
      const res = await fetch('http://localhost:3000/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("Réponse du serveur pour le profil:", data.success ? "SUCCÈS" : "ÉCHEC");
      if (data.success && data.user) {
        const user = data.user;
        console.log("Données utilisateur reçues:", user.username || user.full_name || "données incomplètes");
        
        // Affichage dans le header
        const userProfile = this.getElement('user-profile');
        const userAvatar = this.getElement('user-avatar');
        if (userProfile) {
          userProfile.style.display = 'flex';
          console.log("Élément user-profile affiché");
        } else {
          console.log("ERREUR: Élément user-profile introuvable dans le DOM");
        }
        
        if (userAvatar) {
          userAvatar.innerHTML = '';
          if (user.photo_url) {
            // Ajouter un timestamp pour éviter le cache
            const img = document.createElement('img');
            img.src = user.photo_url + '?t=' + Date.now();
            img.alt = 'Photo de profil';
            img.className = 'profile-pic';
            userAvatar.appendChild(img);
            img.title = user.full_name || user.username;
            console.log("Avatar de l'utilisateur avec photo configuré");
          } else if (user.full_name) {
            const initials = user.full_name.trim().split(' ').map(p => p[0]).join('').toUpperCase();
            userAvatar.textContent = initials;
            userAvatar.title = user.full_name;
            console.log("Avatar de l'utilisateur avec initiales configuré:", initials);
          } else if (user.username) {
            userAvatar.textContent = user.username.slice(0,2).toUpperCase();
            userAvatar.title = user.username;
            console.log("Avatar de l'utilisateur avec initiales du nom d'utilisateur configuré");
          } else {
            userAvatar.textContent = '?';
            userAvatar.title = 'Utilisateur';
            console.log("Avatar de l'utilisateur par défaut configuré");
          }
        } else {
          console.log("ERREUR: Élément user-avatar introuvable dans le DOM");
        }
        
        // Masquer le nom à côté de l'avatar
        const userName = this.getElement('user-name');
        if (userName) userName.textContent = '';
        
        // Afficher le bouton de déconnexion
        const logoutBtn = this.getElement('logout-btn');
        if (logoutBtn) {
          logoutBtn.style.display = 'block';
          console.log("Bouton de déconnexion affiché");
        } else {
          console.log("ERREUR: Bouton de déconnexion introuvable dans le DOM");
        }
        
        // Masquer les boutons Connexion/Inscription
        const loginBtn = this.getElement('login-btn');
        const registerBtn = this.getElement('register-btn');
        if (loginBtn) {
          loginBtn.style.display = 'none';
          console.log("Bouton de connexion masqué");
        }
        if (registerBtn) registerBtn.style.display = 'none';
      } else {
        console.log("Échec de récupération du profil, configuration de l'interface non authentifiée");
        this.setUnauthenticatedState();
      }
    } catch (e) {
      console.error("Erreur lors de la récupération du profil:", e);
      console.log("Exception lors de la récupération du profil, configuration de l'interface non authentifiée");
      this.setUnauthenticatedState();
    }
    console.log("=== DEBUG AUTH - FIN setAuthenticatedState() ===");
  }
  
  /**
   * Configure l'interface pour un utilisateur non authentifié
   */
  setUnauthenticatedState() {
    console.log("=== DEBUG AUTH - DÉBUT setUnauthenticatedState() ===");
    // Masquer les sections d'utilisateur connecté
    const recordingsSection = this.getElement('recordings-section');
    const navLoggedIn = this.getElement('nav-logged-in');
    const authSection = this.getElement('auth-section');
    const navLoggedOut = this.getElement('nav-logged-out');
    
    if (recordingsSection) {
      recordingsSection.classList.add('hidden');
      console.log("Section des enregistrements masquée");
    } else {
      console.log("Section des enregistrements introuvable dans le DOM (normal si sur la page d'accueil)");
    }
    
    if (navLoggedIn) {
      navLoggedIn.classList.add('hidden');
      console.log("Navigation utilisateur connecté masquée");
    } else {
      console.log("Navigation utilisateur connecté introuvable dans le DOM (normal selon la page)");
    }
    
    // Afficher les éléments d'authentification
    if (authSection) {
      authSection.classList.remove('hidden');
      console.log("Section d'authentification affichée");
    } else {
      console.log("Section d'authentification introuvable dans le DOM (normal selon la page)");
    }
    
    if (navLoggedOut) {
      navLoggedOut.classList.remove('hidden');
      console.log("Navigation utilisateur déconnecté affichée");
    } else {
      console.log("Navigation utilisateur déconnecté introuvable dans le DOM (normal selon la page)");
    }
    
    // Masquer le bouton de déconnexion
    const logoutBtn = this.getElement('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
      console.log("Bouton de déconnexion masqué");
    } else {
      console.log("Bouton de déconnexion introuvable dans le DOM");
    }
    
    // Masquer le profil utilisateur
    const userProfile = this.getElement('user-profile');
    if (userProfile) {
      userProfile.style.display = 'none';
      console.log("Profil utilisateur masqué");
    } else {
      console.log("Profil utilisateur introuvable dans le DOM");
    }
    
    // Afficher les boutons Connexion/Inscription
    const loginBtn = this.getElement('login-btn');
    const registerBtn = this.getElement('register-btn');
    if (loginBtn) {
      loginBtn.style.display = 'inline-block';
      console.log("Bouton de connexion affiché");
    } else {
      console.log("Bouton de connexion introuvable dans le DOM");
    }
    
    if (registerBtn) {
      registerBtn.style.display = 'inline-block';
      console.log("Bouton d'inscription affiché");
    } else {
      console.log("Bouton d'inscription introuvable dans le DOM");
    }
    console.log("=== DEBUG AUTH - FIN setUnauthenticatedState() ===");
  }
  
  /**
   * Affiche le formulaire de connexion
   * @param {Event} event - Événement déclencheur (optionnel)
   */
  showLoginForm(event) {
    if (event) event.preventDefault();
    
    const loginModal = this.getElement('login-modal');
    const registerModal = this.getElement('register-modal');
    
    if (loginModal) loginModal.style.display = 'block';
    if (registerModal) registerModal.style.display = 'none';
  }
  
  /**
   * Affiche le formulaire d'inscription
   * @param {Event} event - Événement déclencheur (optionnel)
   */
  showRegisterForm(event) {
    if (event) event.preventDefault();
    
    const loginModal = this.getElement('login-modal');
    const registerModal = this.getElement('register-modal');
    
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'block';
  }
  
  /**
   * Gère la soumission du formulaire de connexion
   * @param {Event} event - Événement de soumission du formulaire
   */
  async handleLogin(event) {
    event.preventDefault();
    
    // Support pour les deux noms de champs possibles (username ou email)
    const emailField = this.getElement('login-email') || this.getElement('login-username');
    const passwordField = this.getElement('login-password');
    
    if (!emailField || !passwordField) {
      utils.showNotification('Formulaire incomplet', 'error');
      return;
    }
    
    const email = emailField.value;
    const password = passwordField.value;
    
    if (!email || !password) {
      utils.showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }
    
    try {
      console.log("Tentative de connexion avec email:", email);
      
      // Appel direct à l'API sans passer par le module api
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur de connexion');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Connexion réussie, stockage du token...");
        
        // Extraction du token et des données utilisateur
        const token = data.token;
        const user = data.user;
        
        // Stockage du token dans TOUTES les méthodes de stockage disponibles
        try {
          // 1. localStorage (principal)
          localStorage.setItem('moustass_token', token);
          console.log("Token stocké dans localStorage");
          
          // 2. sessionStorage (secours)
          sessionStorage.setItem('moustass_token', token);
          console.log("Token stocké dans sessionStorage");
          
          // 3. Cookie sécurisé (pour les requêtes de page)
          // Longue durée (7 jours)
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7);
          document.cookie = `token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          console.log("Token stocké dans les cookies (7 jours)");
          
          // 4. Stockage des données utilisateur
          if (user) {
            localStorage.setItem('moustass_user', JSON.stringify(user));
            console.log("Données utilisateur stockées");
          }
          
        } catch (storageError) {
          console.error("Erreur lors du stockage du token:", storageError);
          // Continuer même en cas d'erreur de stockage
        }
        
        // Vérification immédiate que les tokens ont bien été stockés
        console.log("Vérification du stockage:");
        console.log("- localStorage:", localStorage.getItem('moustass_token') ? "OK" : "ÉCHEC");
        console.log("- sessionStorage:", sessionStorage.getItem('moustass_token') ? "OK" : "ÉCHEC");
        console.log("- cookies:", document.cookie.includes("token=") ? "OK" : "ÉCHEC");
        
        // Mise à jour de l'interface utilisateur
        this.setAuthenticatedState(user);
        
        // Afficher un message de succès
        utils.showNotification('Connexion réussie', 'success');
        
        // Réinitialiser le formulaire
        const loginForm = this.getElement('form-login');
        if (loginForm) {
          loginForm.reset();
        }
        
        // Fermer les modales
        const loginModal = this.getElement('login-modal');
        if (loginModal) {
          loginModal.style.display = 'none';
        }
        
        // Redirection ou actualisation
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } else {
        utils.showNotification(data.message || 'Erreur de connexion', 'error');
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      utils.showNotification('Erreur de connexion: ' + (error.message || error), 'error');
    }
  }
  
  /**
   * Gère la soumission du formulaire d'inscription
   * @param {Event} event - Événement de soumission du formulaire
   */
  async handleRegister(event) {
    event.preventDefault();
    
    const usernameField = this.getElement('register-username');
    const fullNameField = this.getElement("register-full_name");
    const emailField = this.getElement('register-email');
    const passwordField = this.getElement('register-password');
    const passwordConfirmField = this.getElement('register-confirm-password');
    
    if (!usernameField || !fullNameField || !emailField || !passwordField || !passwordConfirmField) {
      utils.showNotification('Formulaire incomplet', 'error');
      return;
    }
    
    const username = usernameField.value;
    const full_name = fullNameField.value;
    const email = emailField.value;
    const password = passwordField.value;
    const passwordConfirm = passwordConfirmField.value;
    
    // Vérification des données
    if (!username || !full_name || !email || !password || !passwordConfirm) {
      utils.showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }
    
    if (password !== passwordConfirm) {
      utils.showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    
    if (password.length < 6) {
      utils.showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }
    
    try {
      console.log("Tentative d'inscription pour:", email);
      
      // Appel direct à l'API sans passer par le module api
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, full_name, email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'inscription");
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Inscription réussie, stockage du token...");
        
        // Extraction du token et des données utilisateur
        const token = data.token;
        const user = data.user;
        
        // Stockage du token dans TOUTES les méthodes de stockage disponibles
        try {
          // 1. localStorage (principal)
          localStorage.setItem('moustass_token', token);
          console.log("Token stocké dans localStorage");
          
          // 2. sessionStorage (secours)
          sessionStorage.setItem('moustass_token', token);
          console.log("Token stocké dans sessionStorage");
          
          // 3. Cookie sécurisé (pour les requêtes de page)
          // Longue durée (7 jours)
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7);
          document.cookie = `token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; expires=${expiration.toUTCString()}`;
          console.log("Token stocké dans les cookies (7 jours)");
          
          // 4. Stockage des données utilisateur
          if (user) {
            localStorage.setItem('moustass_user', JSON.stringify(user));
            console.log("Données utilisateur stockées");
          }
          
        } catch (storageError) {
          console.error("Erreur lors du stockage du token:", storageError);
          // Continuer même en cas d'erreur de stockage
        }
        
        // Vérification immédiate que les tokens ont bien été stockés
        console.log("Vérification du stockage:");
        console.log("- localStorage:", localStorage.getItem('moustass_token') ? "OK" : "ÉCHEC");
        console.log("- sessionStorage:", sessionStorage.getItem('moustass_token') ? "OK" : "ÉCHEC");
        console.log("- cookies:", document.cookie.includes("token=") ? "OK" : "ÉCHEC");
        
        // Mettre à jour l'interface
        this.setAuthenticatedState(user);
        
        // Afficher un message de succès
        utils.showNotification('Inscription réussie', 'success');
        
        // Vider le formulaire
        const registerForm = this.getElement('form-register');
        if (registerForm) {
          registerForm.reset();
        }
        
        // Fermer la modale
        const registerModal = this.getElement('register-modal');
        if (registerModal) {
          registerModal.style.display = 'none';
        }
        
        // Redirection vers la page d'accueil après une courte pause
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        utils.showNotification(data.message || 'Erreur d\'inscription', 'error');
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      utils.showNotification('Erreur d\'inscription: ' + (error.message || error), 'error');
    }
  }
  
  /**
   * Gère la déconnexion de l'utilisateur
   */
  handleLogout() {
    console.log("=== DÉBUT handleLogout() ===");
    
    // Nettoyage de tous les mécanismes de stockage
    this.cleanupAuthentication();
    
    // Mettre à jour l'interface
    this.setUnauthenticatedState();
    
    // Journaliser la déconnexion côté serveur (facultatif - peut échouer)
    try {
      fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(err => console.log("Erreur non bloquante lors de la journalisation de déconnexion:", err));
    } catch (e) {
      // Ignorer les erreurs - la déconnexion est principalement côté client
      console.log("Erreur lors de l'appel de déconnexion:", e);
    }
    
    // Afficher un message de confirmation
    utils.showNotification('Vous êtes déconnecté', 'info');
    
    // Rediriger vers la page d'accueil après une courte pause
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
    
    console.log("=== FIN handleLogout() ===");
  }
}

// Création d'une instance pour l'utilisation globale
const auth = new Auth();