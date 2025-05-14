/**
 * Module API pour les communications avec le serveur
 */
const api = {
  /**
   * URL de base de l'API
   */
  baseUrl: '/api',
  
  /**
   * Récupère le token d'authentification du localStorage
   * @returns {string|null} Token JWT ou null
   */
  getToken() {
    return localStorage.getItem(config.tokenKey) || null;
  },
  
  /**
   * Définit le token d'authentification dans le localStorage
   * @param {string} token - Token JWT
   */
  setToken(token) {
    localStorage.setItem(config.tokenKey, token);
  },
  
  /**
   * Supprime le token d'authentification du localStorage
   */
  removeToken() {
    localStorage.removeItem(config.tokenKey);
  },
  
  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean} Vrai si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!this.getToken();
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