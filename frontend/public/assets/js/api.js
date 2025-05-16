/**
 * Module API pour les communications avec le serveur
 */
const api = {
  /**
   * URL de base de l'API
   */
  baseUrl: '/api',
  
  /**
   * Cache de vérification du token pour limiter les requêtes au serveur
   */
  tokenVerification: {
    isValid: null,
    timestamp: null,
    // Vérifier le token au maximum toutes les 60 secondes
    validityDuration: 60000
  },
  
  /**
   * Vérifie le format d'un token JWT
   * @param {string} token - Token à vérifier
   * @returns {boolean} Vrai si le format est valide
   */
  isValidTokenFormat(token) {
    // Vérification minimale du format (3 parties séparées par des points)
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Vérifier que chaque partie contient des caractères valides en base64url
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    return parts.every(part => base64UrlRegex.test(part));
  },
  
  /**
   * Récupère le token d'authentification du localStorage
   * @returns {string|null} Token JWT ou null
   */
  getToken() {
    const token = localStorage.getItem('moustass_token') || null;
    
    // Vérifier le format du token avant de le retourner
    if (token && !this.isValidTokenFormat(token)) {
      console.warn("Format de token invalide détecté, suppression du token");
      this.removeToken();
      return null;
    }
    
    console.log("API.getToken() appelé:", token ? `${token.substring(0, 10)}...` : "AUCUN TOKEN");
    return token;
  },
  
  /**
   * Définit le token d'authentification dans le localStorage
   * @param {string} token - Token JWT
   */
  setToken(token) {
    console.log("API.setToken() appelé avec token:", token ? `${token.substring(0, 10)}...` : "AUCUN TOKEN");
    
    if (!token) {
      console.log("Token vide ou null, suppression du token");
      this.removeToken();
      return;
    }
    
    try {
      // Stocker dans localStorage
      localStorage.setItem('moustass_token', token);
      console.log("Token stocké dans localStorage");
      
      // Synchroniser avec les cookies pour les requêtes de page
      // Utiliser max-age=604800 pour une durée de 7 jours
      document.cookie = `token=${token}; path=/; SameSite=Strict; max-age=604800`;
      document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; max-age=604800`;
      console.log("Token synchronisé dans les cookies (token et moustass_token) pour 7 jours");
      
      console.log("Token JWT synchronisé dans localStorage et cookies");

      // Réinitialiser le cache de vérification du token
      this.tokenVerification.isValid = true;
      this.tokenVerification.timestamp = Date.now();
    } catch (error) {
      console.error("Erreur lors du stockage du token:", error);
    }
  },
  
  /**
   * Supprime le token d'authentification du localStorage
   */
  removeToken() {
    console.log("API.removeToken() appelé");
    
    try {
      // Supprimer du localStorage
      localStorage.removeItem('moustass_token');
      console.log("Token supprimé du localStorage");
      
      // Supprimer des cookies en définissant une date d'expiration dans le passé
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "moustass_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      console.log("Token supprimé des cookies (token et moustass_token)");
      
      console.log("Token JWT supprimé de localStorage et cookies");

      // Réinitialiser le cache de vérification du token
      this.tokenVerification.isValid = false;
      this.tokenVerification.timestamp = Date.now();
    } catch (error) {
      console.error("Erreur lors de la suppression du token:", error);
    }
  },
  
  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean} Vrai si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!this.getToken();
  },
  
  /**
   * Vérifie la validité du token avec le serveur (avec mise en cache)
   * @returns {Promise<boolean>} Vrai si le token est valide
   */
  async verifyToken() {
    try {
      // Vérifier si le token existe
      const token = this.getToken();
      if (!token) {
        console.log("Aucun token trouvé, authentification invalide");
        this.tokenVerification.isValid = false;
        this.tokenVerification.timestamp = Date.now();
        return false;
      }
      
      // Vérifier si nous avons une réponse en cache récente
      const now = Date.now();
      if (this.tokenVerification.timestamp !== null && 
          (now - this.tokenVerification.timestamp < this.tokenVerification.validityDuration)) {
        console.log("Utilisation du cache de vérification du token:", 
          this.tokenVerification.isValid ? "VALIDE" : "INVALIDE");
        return this.tokenVerification.isValid;
      }
      
      // Sinon, vérifier avec le serveur
      console.log("Vérification du token avec le serveur...");
      const response = await this.get('/auth/verify');
      
      const isValid = response && response.valid === true;
      // Mettre en cache le résultat
      this.tokenVerification.isValid = isValid;
      this.tokenVerification.timestamp = now;
      
      console.log("Résultat de la vérification du token:", isValid ? "VALIDE" : "INVALIDE");
      return isValid;
    } catch (error) {
      console.error("Erreur lors de la vérification du token:", error);
      return false;
    }
  },
  
  /**
   * Effectue une requête GET
   * @param {string} endpoint - Point d'accès de l'API (sans /api)
   * @param {Object} params - Paramètres de requête (optionnel)
   * @returns {Promise<Object>} Réponse JSON
   */
  async get(endpoint, params = {}) {
    try {
      // Construire l'URL avec les paramètres
      const url = new URL(this.baseUrl + endpoint, window.location.origin);
      Object.keys(params).forEach(key => 
        url.searchParams.append(key, params[key])
      );
      
      // Préparer les en-têtes
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Ajouter le token d'authentification si disponible
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`API GET ${url}`);
      
      // Effectuer la requête
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Erreur lors de la requête');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Analyser la réponse JSON
      return await response.json();
    } catch (error) {
      console.error(`Erreur API GET ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête POST
   * @param {string} endpoint - Point d'accès de l'API (sans /api)
   * @param {Object} data - Données à envoyer
   * @returns {Promise<Object>} Réponse JSON
   */
  async post(endpoint, data = {}) {
    try {
      // Préparer les en-têtes
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Ajouter le token d'authentification si disponible
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`API POST ${this.baseUrl + endpoint}`, data);
      
      // Effectuer la requête
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Erreur lors de la requête');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Analyser la réponse JSON
      return await response.json();
    } catch (error) {
      console.error(`Erreur API POST ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête PUT
   * @param {string} endpoint - Point d'accès de l'API (sans /api)
   * @param {Object} data - Données à envoyer
   * @returns {Promise<Object>} Réponse JSON
   */
  async put(endpoint, data = {}) {
    try {
      // Préparer les en-têtes
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Ajouter le token d'authentification si disponible
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`API PUT ${this.baseUrl + endpoint}`);
      
      // Effectuer la requête
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Erreur lors de la requête');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Analyser la réponse JSON
      return await response.json();
    } catch (error) {
      console.error(`Erreur API PUT ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête DELETE
   * @param {string} endpoint - Point d'accès de l'API (sans /api)
   * @returns {Promise<Object>} Réponse JSON
   */
  async delete(endpoint) {
    try {
      // Préparer les en-têtes
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Ajouter le token d'authentification si disponible
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`API DELETE ${this.baseUrl + endpoint}`);
      
      // Effectuer la requête
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'DELETE',
        headers
      });
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Erreur lors de la requête');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Analyser la réponse JSON
      return await response.json();
    } catch (error) {
      console.error(`Erreur API DELETE ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Télécharge un fichier
   * @param {string} endpoint - Point d'accès de l'API (sans /api)
   * @param {Object} data - Données du formulaire
   * @returns {Promise<Object>} Réponse JSON
   */
  async upload(endpoint, formData) {
    try {
      // Préparer les en-têtes (sans Content-Type pour laisser le navigateur le définir)
      const headers = {
        'Accept': 'application/json'
      };
      
      // Ajouter le token d'authentification si disponible
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`API UPLOAD ${this.baseUrl + endpoint}`);
      
      // Effectuer la requête
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'POST',
        headers,
        body: formData
      });
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Erreur lors du téléchargement');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      // Analyser la réponse JSON
      return await response.json();
    } catch (error) {
      console.error(`Erreur API UPLOAD ${endpoint}:`, error);
      throw error;
    }
  }
};