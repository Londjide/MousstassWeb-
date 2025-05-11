/**
 * Module pour gérer les appels API
 */
const api = {
  /**
   * Effectue une requête GET
   * @param {string} endpoint - Point de terminaison API
   * @param {Object} params - Paramètres de requête (optionnels)
   * @returns {Promise<Object>} - Réponse JSON
   */
  async get(endpoint, params = {}) {
    try {
      // Construire l'URL avec les paramètres
      const url = new URL(`${config.apiUrl}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      // Construire les options de la requête
      const options = {
        method: 'GET',
        headers: this.getHeaders()
      };
      
      // Effectuer la requête
      return await this.sendRequest(url, options);
    } catch (error) {
      console.error('Erreur API GET:', error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête POST
   * @param {string} endpoint - Point de terminaison API
   * @param {Object} data - Données à envoyer
   * @returns {Promise<Object>} - Réponse JSON
   */
  async post(endpoint, data = {}) {
    try {
      const url = `${config.apiUrl}${endpoint}`;
      const options = {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      };
      
      return await this.sendRequest(url, options);
    } catch (error) {
      console.error('Erreur API POST:', error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête PUT
   * @param {string} endpoint - Point de terminaison API
   * @param {Object} data - Données à envoyer
   * @returns {Promise<Object>} - Réponse JSON
   */
  async put(endpoint, data = {}) {
    try {
      const url = `${config.apiUrl}${endpoint}`;
      const options = {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      };
      
      return await this.sendRequest(url, options);
    } catch (error) {
      console.error('Erreur API PUT:', error);
      throw error;
    }
  },
  
  /**
   * Effectue une requête DELETE
   * @param {string} endpoint - Point de terminaison API
   * @returns {Promise<Object>} - Réponse JSON
   */
  async delete(endpoint) {
    try {
      const url = `${config.apiUrl}${endpoint}`;
      const options = {
        method: 'DELETE',
        headers: this.getHeaders()
      };
      
      return await this.sendRequest(url, options);
    } catch (error) {
      console.error('Erreur API DELETE:', error);
      throw error;
    }
  },
  
  /**
   * Télécharge un fichier audio
   * @param {string} endpoint - Point de terminaison API
   * @returns {Promise<Blob>} - Blob audio
   */
  async getAudio(endpoint) {
    try {
      const url = `${config.apiUrl}${endpoint}`;
      const options = {
        method: 'GET',
        headers: this.getHeaders(false), // Pas de Content-Type pour les réponses binaires
      };
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Erreur API getAudio:', error);
      throw error;
    }
  },
  
  /**
   * Télécharge un fichier audio vers le serveur
   * @param {string} endpoint - Point de terminaison API
   * @param {FormData} formData - Données multipart avec le fichier audio
   * @returns {Promise<Object>} - Réponse JSON
   */
  async uploadAudio(endpoint, formData) {
    try {
      const url = `${config.apiUrl}${endpoint}`;
      const options = {
        method: 'POST',
        headers: this.getHeaders(false), // Pas de Content-Type pour FormData
        body: formData
      };
      
      // Ajouter le token d'authentification
      const token = localStorage.getItem(config.tokenKey);
      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }
      
      return await this.sendRequest(url, options);
    } catch (error) {
      console.error('Erreur API uploadAudio:', error);
      throw error;
    }
  },
  
  /**
   * Envoie une requête et gère la réponse
   * @param {string} url - URL complète
   * @param {Object} options - Options fetch
   * @returns {Promise<Object>} - Réponse JSON
   */
  async sendRequest(url, options) {
    const response = await fetch(url, options);
    
    // Si la réponse est 401 (non autorisé), déconnecter l'utilisateur
    if (response.status === 401) {
      localStorage.removeItem(config.tokenKey);
      localStorage.removeItem(config.userKey);
      
      // Rediriger vers la page de connexion si l'utilisateur était connecté
      if (auth && typeof auth.setUnauthenticatedState === 'function') {
        auth.setUnauthenticatedState();
      }
      
      utils.showNotification('Session expirée. Veuillez vous reconnecter.', 'warning');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erreur API');
    }
    
    return data;
  },
  
  /**
   * Récupère les en-têtes HTTP pour les requêtes
   * @param {boolean} includeContentType - Inclure l'en-tête Content-Type
   * @returns {Object} - En-têtes HTTP
   */
  getHeaders(includeContentType = true) {
    const headers = {};
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Ajouter le token d'authentification s'il existe
    const token = localStorage.getItem(config.tokenKey);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
};