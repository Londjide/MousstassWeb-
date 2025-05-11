/**
 * Utilitaires généraux pour l'application Missié Moustass Web
 */
const utils = {
  /**
   * Affiche une notification à l'utilisateur
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification (success, error, warning, info)
   * @param {number} duration - Durée d'affichage en ms (par défaut 3000ms)
   */
  showNotification(message, type = 'info', duration = 3000) {
    // Créer l'élément de notification s'il n'existe pas
    let notifContainer = document.getElementById('notifications-container');
    
    if (!notifContainer) {
      notifContainer = document.createElement('div');
      notifContainer.id = 'notifications-container';
      notifContainer.style.position = 'fixed';
      notifContainer.style.top = '20px';
      notifContainer.style.right = '20px';
      notifContainer.style.zIndex = '9999';
      document.body.appendChild(notifContainer);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Styles de base
    notification.style.padding = '10px 15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    // Styles selon le type
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#28a745';
        notification.style.color = 'white';
        break;
      case 'error':
        notification.style.backgroundColor = '#dc3545';
        notification.style.color = 'white';
        break;
      case 'warning':
        notification.style.backgroundColor = '#ffc107';
        notification.style.color = '#212529';
        break;
      default: // info
        notification.style.backgroundColor = '#17a2b8';
        notification.style.color = 'white';
    }
    
    // Ajouter au container
    notifContainer.appendChild(notification);
    
    // Animation d'apparition
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Supprimer après la durée spécifiée
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notifContainer.removeChild(notification);
      }, 300);
    }, duration);
  },
  
  /**
   * Échappe les caractères HTML spéciaux
   * @param {string} text - Texte à échapper
   * @returns {string} - Texte échappé
   */
  escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  
  /**
   * Formate une date en format lisible
   * @param {string|Date} date - Date à formater
   * @returns {string} - Date formatée
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Formate une durée en secondes en format mm:ss
   * @param {number} seconds - Durée en secondes
   * @returns {string} - Durée formatée
   */
  formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  /**
   * Attends que le DOM soit chargé
   * @param {Function} callback - Fonction à exécuter
   */
  onDomReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  },
  
  /**
   * Formate une date en chaîne de caractères lisible
   * @param {string|Date} dateStr - Date à formater
   * @returns {string} - Date formatée
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },
  
  /**
   * Tronque un texte à une longueur maximale
   * @param {string} text - Texte à tronquer
   * @param {number} maxLength - Longueur maximale
   * @returns {string} - Texte tronqué
   */
  truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  },
  
  /**
   * Crée un élément HTML avec des attributs et du contenu
   * @param {string} tag - Nom de la balise HTML
   * @param {Object} attributes - Attributs de l'élément
   * @param {string|Node|Array} content - Contenu de l'élément
   * @returns {HTMLElement} - Élément créé
   */
  createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Ajouter les attributs
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Ajouter le contenu
    if (content) {
      if (typeof content === 'string') {
        element.textContent = content;
      } else if (content instanceof Node) {
        element.appendChild(content);
      } else if (Array.isArray(content)) {
        content.forEach(item => {
          if (typeof item === 'string') {
            element.appendChild(document.createTextNode(item));
          } else if (item instanceof Node) {
            element.appendChild(item);
          }
        });
      }
    }
    
    return element;
  },
  
  /**
   * Génère un identifiant unique
   * @returns {string} - Identifiant unique
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },
  
  /**
   * Décode les entités HTML
   * @param {string} html - Texte avec entités HTML
   * @returns {string} - Texte décodé
   */
  decodeHtml(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  },
  
  /**
   * Affiche une boîte de dialogue de confirmation
   * @param {string} message - Message à afficher
   * @returns {Promise<boolean>} Résultat de la confirmation
   */
  confirmDialog(message) {
    return new Promise((resolve) => {
      // Création de la modal
      const modal = document.createElement('div');
      modal.className = 'modal-container';
      modal.style.display = 'flex';
      
      // Contenu de la modal
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Confirmation</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-content">
            <p>${this.escapeHTML(message)}</p>
            <div class="form-buttons">
              <button class="btn btn-primary" id="confirm-yes">Confirmer</button>
              <button class="btn btn-secondary" id="confirm-no">Annuler</button>
            </div>
          </div>
        </div>
      `;
      
      // Ajout au DOM
      document.body.appendChild(modal);
      
      // Gestion des événements
      const closeBtn = modal.querySelector('.modal-close');
      const yesBtn = modal.querySelector('#confirm-yes');
      const noBtn = modal.querySelector('#confirm-no');
      
      const close = (result) => {
        modal.remove();
        resolve(result);
      };
      
      closeBtn.addEventListener('click', () => close(false));
      yesBtn.addEventListener('click', () => close(true));
      noBtn.addEventListener('click', () => close(false));
    });
  },
  
  /**
   * Génère une pagination
   * @param {number} currentPage - Page actuelle
   * @param {number} totalPages - Nombre total de pages
   * @param {Function} onPageChange - Fonction appelée lors du changement de page
   * @returns {HTMLElement} Élément de pagination
   */
  createPagination(currentPage, totalPages, onPageChange) {
    // Création du conteneur
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // Fonction pour créer un élément de pagination
    const createPageItem = (page, label, isActive = false, isDisabled = false) => {
      const item = document.createElement('div');
      item.className = `pagination-item${isActive ? ' active' : ''}`;
      item.textContent = label;
      
      if (!isDisabled) {
        item.addEventListener('click', () => onPageChange(page));
      } else {
        item.classList.add('disabled');
      }
      
      return item;
    };
    
    // Bouton précédent
    pagination.appendChild(createPageItem(
      currentPage - 1,
      '«',
      false,
      currentPage === 1
    ));
    
    // Pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Première page si nécessaire
    if (startPage > 1) {
      pagination.appendChild(createPageItem(1, '1'));
      if (startPage > 2) {
        pagination.appendChild(createPageItem(null, '...', false, true));
      }
    }
    
    // Pages visibles
    for (let i = startPage; i <= endPage; i++) {
      pagination.appendChild(createPageItem(i, i.toString(), i === currentPage));
    }
    
    // Dernière page si nécessaire
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pagination.appendChild(createPageItem(null, '...', false, true));
      }
      pagination.appendChild(createPageItem(totalPages, totalPages.toString()));
    }
    
    // Bouton suivant
    pagination.appendChild(createPageItem(
      currentPage + 1,
      '»',
      false,
      currentPage === totalPages
    ));
    
    return pagination;
  },
  
  /**
   * Initialise le thème global de l'application à partir des préférences utilisateur
   * Doit être appelé sur toutes les pages pour assurer la cohérence du thème
   */
  initGlobalTheme() {
    try {
      // Récupérer les préférences utilisateur du localStorage
      const preferences = JSON.parse(localStorage.getItem('moustass_preferences') || '{}');
      
      // Appliquer le thème sombre si activé
      if (preferences.dark_mode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du thème', error);
    }
  },
  
  /**
   * Convertit un Blob en Base64
   * @param {Blob} blob - Blob à convertir
   * @returns {Promise<string>} Chaîne Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};

// Initialiser le thème global lorsque le DOM est chargé
utils.onDomReady(() => {
  utils.initGlobalTheme();
});