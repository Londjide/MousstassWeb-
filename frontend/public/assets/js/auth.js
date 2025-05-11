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
      localStorage.setItem(config.userKey, JSON.stringify(minimalUser));
    },
  
    /**
     * Récupère les informations de l'utilisateur connecté
     * @returns {Object|null} Données utilisateur ou null si non disponible
     */
    getCurrentUser() {
      const userData = localStorage.getItem(config.userKey);
      return userData ? JSON.parse(userData) : null;
    },
  
    /**
     * Supprime les informations de l'utilisateur
     */
    clearCurrentUser() {
      localStorage.removeItem(config.userKey);
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
    this.checkAuthentication();
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
  checkAuthentication() {
    const token = localStorage.getItem(config.tokenKey);
    const user = JSON.parse(localStorage.getItem(config.userKey) || '{}');
    
    // if (token && user.id) {
    if (token && user && (user.full_name || user.username)) {
      this.setAuthenticatedState(user);
    } else {
      this.setUnauthenticatedState();
    }
  }
  
  /**
   * Configure l'interface pour un utilisateur authentifié
   * @param {Object} user - Données de l'utilisateur
   */
  async setAuthenticatedState() {
    // Récupérer dynamiquement le profil utilisateur
    const token = localStorage.getItem(config.tokenKey);
    if (!token) {
      this.setUnauthenticatedState();
      return;
    }
    try {
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success && data.user) {
        const user = data.user;
        // Affichage dans le header
        const userProfile = this.getElement('user-profile');
        const userAvatar = this.getElement('user-avatar');
        if (userProfile) userProfile.style.display = '';
        if (userAvatar) {
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
            userAvatar.textContent = user.username.slice(0,2).toUpperCase();
          } else {
            userAvatar.textContent = '?';
          }
        }
        // Masquer le nom à côté de l'avatar
        const userName = this.getElement('user-name');
        if (userName) userName.textContent = '';
        // Afficher le bouton de déconnexion
        const logoutBtn = this.getElement('logout-btn');
        if (logoutBtn) logoutBtn.style.display = 'block';
        // Masquer les boutons Connexion/Inscription
        const loginBtn = this.getElement('login-btn');
        const registerBtn = this.getElement('register-btn');
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
      } else {
        this.setUnauthenticatedState();
      }
    } catch (e) {
      this.setUnauthenticatedState();
    }
  }
  
  /**
   * Configure l'interface pour un utilisateur non authentifié
   */
  setUnauthenticatedState() {
    // Masquer les sections d'utilisateur connecté
    const recordingsSection = this.getElement('recordings-section');
    const navLoggedIn = this.getElement('nav-logged-in');
    const authSection = this.getElement('auth-section');
    const navLoggedOut = this.getElement('nav-logged-out');
    
    if (recordingsSection) recordingsSection.classList.add('hidden');
    if (navLoggedIn) navLoggedIn.classList.add('hidden');
    
    // Afficher les éléments d'authentification
    if (authSection) authSection.classList.remove('hidden');
    if (navLoggedOut) navLoggedOut.classList.remove('hidden');
    
    // Masquer le bouton de déconnexion
    const logoutBtn = this.getElement('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    // Masquer le profil utilisateur
    const userProfile = this.getElement('user-profile');
    if (userProfile) userProfile.style.display = 'none';
    
    // Afficher les boutons Connexion/Inscription
    const loginBtn = this.getElement('login-btn');
    const registerBtn = this.getElement('register-btn');
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (registerBtn) registerBtn.style.display = 'inline-block';
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
      const response = await api.post('/auth/login', { email, password });
      
      if (response.success) {
        // Sauvegarder le token et les informations utilisateur
        localStorage.setItem(config.tokenKey, response.token);
        localStorage.setItem(config.userKey, JSON.stringify(response.user));
        
        // CRUCIAL: Définir aussi le token comme cookie pour l'authentification des vues
        document.cookie = `token=${response.token}; path=/; SameSite=Strict`;
        console.log("Token JWT stocké à la fois dans localStorage et les cookies");
        
        // Mettre à jour l'interface
        this.setAuthenticatedState(response.user);
        
        // Afficher un message de succès
        utils.showNotification('Connexion réussie', 'success');
        
        // Vider le formulaire
        const loginForm = this.getElement('form-login');
        if (loginForm) {
          loginForm.reset();
        }
        
        // Fermer les modales
        const loginModal = this.getElement('login-modal');
        if (loginModal) {
          loginModal.style.display = 'none';
        }
        
        // Charger les enregistrements si l'application est disponible
        if (typeof app !== 'undefined' && app.loadRecordings) {
          app.loadRecordings();
        }
      } else {
        utils.showNotification(response.message || 'Erreur de connexion', 'error');
      }
    } catch (error) {
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
      const response = await api.post('/auth/register', { username, full_name, email, password });
      
      if (response.success) {
        // Sauvegarder le token et les informations utilisateur
        localStorage.setItem(config.tokenKey, response.token);
        localStorage.setItem(config.userKey, JSON.stringify(response.user));
        
        // Mettre à jour l'interface
        this.setAuthenticatedState(response.user);
        
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
      } else {
        utils.showNotification(response.message || 'Erreur d\'inscription', 'error');
      }
    } catch (error) {
      utils.showNotification('Erreur d\'inscription: ' + (error.message || error), 'error');
    }
  }
  
  /**
   * Gère la déconnexion de l'utilisateur
   */
  handleLogout() {
    // Supprimer le token et les informations utilisateur du localStorage
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.userKey);
    
    // Supprimer également le cookie token
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Mettre à jour l'interface
    this.setUnauthenticatedState();
    
    // Afficher un message de confirmation
    utils.showNotification('Vous êtes déconnecté', 'info');
  }
}

// Création d'une instance pour l'utilisation globale
const auth = new Auth();