/**
 * Service de gestion du profil utilisateur
 */
const profileService = {
    /**
     * Récupère le profil de l'utilisateur
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getUserProfile() {
      try {
        const response = await fetch('/api/users/profile', {
          headers: { 
            'Authorization': 'Bearer ' + localStorage.getItem('moustass_token')
          }
        });
        
        if (!response.ok) {
          // Si le serveur est indisponible, indiquer clairement l'erreur
          if (response.status === 500) {
            throw new Error('Le serveur est actuellement indisponible. Impossible de récupérer votre profil.');
          }
          
          const data = await response.json();
          throw new Error(data.message || 'Erreur lors de la récupération du profil');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Erreur lors de la récupération du profil');
        }
        
        // Mettre à jour le cache local avec les données les plus récentes
        const currentUser = JSON.parse(localStorage.getItem('moustass_user') || '{}');
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem('moustass_user', JSON.stringify(updatedUser));
        
        return data.user;
      } catch (error) {
        console.error('Erreur lors de la récupération du profil', error);
        
        // Informer de l'erreur plutôt que d'utiliser des données en cache
        // Cependant, on peut utiliser le cache pour l'affichage initial et les infos non-sensibles
        const cachedUser = JSON.parse(localStorage.getItem('moustass_user') || '{}');
        
        if (!cachedUser || Object.keys(cachedUser).length === 0) {
          throw error; // Propager l'erreur originale
        }
        
        // Indiquer que les données sont en cache et peuvent être obsolètes
        return { 
          ...cachedUser, 
          _fromCache: true, 
          _cacheWarning: 'Données en cache. Certaines fonctionnalités peuvent être limitées.'
        };
      }
    },
  
    /**
     * Met à jour le profil de l'utilisateur
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<Object>} Réponse de l'API
     */
    async updateUserProfile(data) {
      try {
        // Ne soumettre que le nom complet (pas d'email)
        const updateData = {
          full_name: data.full_name
        };
        
        const response = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('moustass_token')
          },
          body: JSON.stringify(updateData)
        });
        
        // Gérer les erreurs serveur
        if (!response.ok) {
          if (response.status === 500) {
            throw new Error('Le serveur est actuellement indisponible. Impossible de mettre à jour votre profil.');
          }
          
          const responseData = await response.json();
          throw new Error(responseData.message || 'Erreur lors de la mise à jour du profil');
        }
        
        const responseData = await response.json();
        
        // Mettre à jour le stockage local seulement après confirmation du serveur
        const currentUser = JSON.parse(localStorage.getItem('moustass_user') || '{}');
        currentUser.full_name = data.full_name;
        localStorage.setItem('moustass_user', JSON.stringify(currentUser));
        
        return responseData;
      } catch (error) {
        console.error('Erreur lors de la mise à jour du profil', error);
        throw error;
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
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('moustass_token')
          },
          body: JSON.stringify({
            currentPassword,
            newPassword
          })
        });
        
        // Gérer les erreurs serveur
        if (!response.ok) {
          if (response.status === 500) {
            throw new Error('Le serveur est actuellement indisponible. Impossible de changer le mot de passe.');
          }
          
          const data = await response.json();
          throw new Error(data.message || 'Erreur lors du changement de mot de passe');
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Erreur lors du changement de mot de passe', error);
        throw error;
      }
    },
  
    /**
     * Met à jour les préférences utilisateur
     * @param {Object} preferences - Préférences à mettre à jour
     * @returns {Promise<Object>} Réponse de l'API
     */
    async updatePreferences(preferences) {
      try {
        // Enregistrer d'abord localement
        localStorage.setItem('moustass_preferences', JSON.stringify(preferences));
        
        // Tenter d'enregistrer également sur le serveur si une API existe
        const response = await fetch('/api/users/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('moustass_token')
          },
          body: JSON.stringify(preferences)
        }).catch(err => {
          console.warn('API de préférences non disponible, préférences enregistrées uniquement en local', err);
          return { ok: false };
        });
        
        // Si le serveur répond correctement, retourner sa réponse
        if (response.ok) {
          const data = await response.json();
          return { 
            ...data, 
            message: data.message || 'Préférences enregistrées sur le serveur et localement'
          };
        }
        
        // Sinon, indiquer que seul l'enregistrement local a fonctionné
        return { 
          success: true, 
          message: 'Préférences enregistrées localement uniquement' 
        };
      } catch (error) {
        console.error('Erreur lors de la mise à jour des préférences', error);
        // Confirmer l'enregistrement local même en cas d'erreur
        return { 
          success: true, 
          message: 'Préférences enregistrées localement uniquement (erreur serveur)' 
        };
      }
    },
  
    /**
     * Récupère les préférences utilisateur
     * @returns {Object} Préférences stockées
     */
    getPreferences() {
      try {
        return JSON.parse(localStorage.getItem('moustass_preferences') || '{}');
      } catch (error) {
        return {};
      }
    }
};

// JS pour la page profil utilisateur
document.addEventListener('DOMContentLoaded', () => {
  // Initialisation des onglets
  initTabs();
  
  // Initialisation du formulaire de profil
  initProfileForm();
  
  // Initialisation du formulaire de mot de passe
  initPasswordForm();
  
  // Initialisation du formulaire de préférences
  initPreferencesForm();
  
  // Initialisation de l'upload de photo
  initPhotoUpload();
});

/**
 * Initialise la gestion des onglets
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabSections = document.querySelectorAll('.profile-section');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Retirer la classe active de tous les boutons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      // Ajouter la classe active au bouton cliqué
      button.classList.add('active');
      
      // Masquer toutes les sections
      tabSections.forEach(section => section.classList.remove('active'));
      
      // Afficher la section correspondante
      const targetTab = button.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

/**
 * Initialise le formulaire de profil
 */
async function initProfileForm() {
  const profileForm = document.getElementById('profile-form');
  const fullnameInput = document.getElementById('profile-fullname');
  const usernameInput = document.getElementById('profile-username');
  const emailInput = document.getElementById('profile-email');
  const fullnameDisplay = document.getElementById('profile-fullname-display');
  const usernameDisplay = document.getElementById('profile-username-display');
  const statusMessage = document.getElementById('profile-status');
  const submitButton = profileForm ? profileForm.querySelector('button[type="submit"]') : null;
  
  try {
    // Charger les données du profil
    const user = await profileService.getUserProfile();
    
    // Vérifier si les données proviennent du cache
    const isFromCache = user._fromCache === true;
    
    // Remplir le formulaire
    if (fullnameInput) fullnameInput.value = user.full_name || '';
    if (usernameInput) usernameInput.value = user.username || '';
    if (emailInput) emailInput.value = user.email || '';
    
    // Mettre à jour l'affichage
    if (fullnameDisplay) fullnameDisplay.textContent = user.full_name || 'Utilisateur';
    if (usernameDisplay) usernameDisplay.textContent = '@' + (user.username || '');
    
    // Si les données proviennent du cache, afficher un avertissement et désactiver la modification
    if (isFromCache) {
      // Désactiver le formulaire pour les modifications
      if (fullnameInput) fullnameInput.disabled = true;
      if (submitButton) submitButton.disabled = true;
      
      // Afficher un message d'avertissement
      showStatus(statusMessage, 'Connexion au serveur impossible. Mode consultation uniquement.', 'warning');
    } else {
      // Gérer la soumission du formulaire
      if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          try {
            // Récupérer les données du formulaire - seulement le nom complet
            const formData = {
              full_name: fullnameInput.value.trim()
            };
            
            // Mettre à jour le profil
            const result = await profileService.updateUserProfile(formData);
            
            // Mettre à jour l'affichage
            if (fullnameDisplay) fullnameDisplay.textContent = formData.full_name || 'Utilisateur';
            
            // Afficher un message de succès
            showStatus(statusMessage, result.message || 'Profil mis à jour avec succès', 'success');
          } catch (error) {
            // Afficher un message d'erreur
            showStatus(statusMessage, error.message || 'Erreur lors de la mise à jour du profil', 'error');
          }
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error);
    
    // En cas d'erreur irrécupérable, afficher un message clair
    if (fullnameInput) fullnameInput.disabled = true;
    if (emailInput) emailInput.disabled = true;
    if (submitButton) submitButton.disabled = true;
    
    showStatus(statusMessage, error.message || 'Impossible de charger le profil. Veuillez réessayer plus tard.', 'error');
  }
}

/**
 * Initialise le formulaire de mot de passe
 */
function initPasswordForm() {
  const passwordForm = document.getElementById('password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const strengthBar = document.getElementById('password-strength-bar');
  const strengthText = document.getElementById('password-strength-text');
  const statusMessage = document.getElementById('password-status');
  
  if (!passwordForm) return;
  
  // Évaluer la force du mot de passe
  if (newPasswordInput && strengthBar && strengthText) {
    newPasswordInput.addEventListener('input', () => {
      const password = newPasswordInput.value;
      const strength = evaluatePasswordStrength(password);
      
      // Mise à jour de la barre de force
      strengthBar.style.width = `${strength.score * 25}%`;
      strengthText.textContent = strength.message;
    });
  }
  
  // Gérer la soumission du formulaire
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Vérifier que le mot de passe actuel est renseigné
    if (!currentPassword) {
      showStatus(statusMessage, 'Veuillez saisir votre mot de passe actuel', 'error');
      currentPasswordInput.focus();
      return;
    }
    
    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      showStatus(statusMessage, 'Les mots de passe ne correspondent pas', 'error');
      return;
    }
    
    // Vérifier la force du mot de passe
    const strength = evaluatePasswordStrength(newPassword);
    if (strength.score < 2) {
      showStatus(statusMessage, 'Le mot de passe est trop faible', 'error');
      return;
    }
    
    try {
      // Changer le mot de passe
      const result = await profileService.changePassword(currentPassword, newPassword);
      
      // Réinitialiser le formulaire
      passwordForm.reset();
      
      // Afficher un message de succès avec le message retourné par l'API
      showStatus(statusMessage, result.message || 'Mot de passe changé avec succès', 'success');
      
      // Réinitialiser la barre de force
      if (strengthBar) strengthBar.style.width = '0%';
      if (strengthText) strengthText.textContent = 'Force du mot de passe';
    } catch (error) {
      showStatus(statusMessage, error.message || 'Erreur lors du changement de mot de passe', 'error');
    }
  });
}

/**
 * Initialise le formulaire de préférences
 */
function initPreferencesForm() {
  const preferencesForm = document.getElementById('preferences-form');
  const darkModeToggle = document.getElementById('dark-mode');
  const notificationsToggle = document.getElementById('notifications');
  const statusMessage = document.getElementById('preferences-status');
  const submitButton = preferencesForm ? preferencesForm.querySelector('button[type="submit"]') : null;
  
  if (!preferencesForm) return;
  
  // Charger les préférences existantes
  const preferences = profileService.getPreferences();
  
  // Définir les valeurs initiales
  if (darkModeToggle) darkModeToggle.checked = preferences.dark_mode || false;
  if (notificationsToggle) notificationsToggle.checked = preferences.notifications || false;
  
  // Appliquer le thème sombre si activé (via utils pour cohérence globale)
  utils.initGlobalTheme();
  
  // Fonction de mise à jour des préférences
  const updatePreference = async (preference, value) => {
    try {
      const currentPreferences = profileService.getPreferences();
      const newPreferences = { ...currentPreferences, [preference]: value };
      
      // Appliquer immédiatement (interface utilisateur)
      if (preference === 'dark_mode') {
        if (value) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }
      
      // Enregistrer les préférences (local + serveur en arrière-plan)
      const result = await profileService.updatePreferences(newPreferences);
      
      // Afficher une notification discrète
      utils.showNotification(
        preference === 'dark_mode' 
          ? `Mode sombre ${value ? 'activé' : 'désactivé'}` 
          : `Notifications ${value ? 'activées' : 'désactivées'}`, 
        'info', 
        1500
      );
      
      // Masquer le bouton d'enregistrement puisque les changements sont appliqués automatiquement
      if (submitButton) submitButton.style.display = 'none';
      
      return result;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la préférence ${preference}:`, error);
      utils.showNotification('Erreur lors de l\'enregistrement de la préférence', 'error');
    }
  };
  
  // Appliquer le mode sombre immédiatement au changement
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', async () => {
      await updatePreference('dark_mode', darkModeToggle.checked);
    });
  }
  
  // Appliquer les notifications immédiatement au changement
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', async () => {
      await updatePreference('notifications', notificationsToggle.checked);
    });
  }
  
  // Conserver le formulaire pour compatibilité, mais il devient facultatif
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const newPreferences = {
          dark_mode: darkModeToggle.checked,
          notifications: notificationsToggle.checked
        };
        
        // Mettre à jour les préférences
        const result = await profileService.updatePreferences(newPreferences);
        
        // Afficher un message de succès avec l'information sur le type de stockage
        showStatus(statusMessage, result.message || 'Préférences enregistrées', 'success');
      } catch (error) {
        showStatus(statusMessage, error.message || 'Erreur lors de l\'enregistrement des préférences', 'error');
      }
    });
  }
}

/**
 * Initialise le formulaire d'upload de photo
 */
function initPhotoUpload() {
  const photoForm = document.getElementById('photo-upload-form');
  const photoInput = document.getElementById('photo');
  const avatarDiv = document.getElementById('profile-avatar');
  
  if (!photoForm || !photoInput || !avatarDiv) return;
  
  // Afficher l'avatar initial
  renderAvatar();
  
  // Gérer la soumission du formulaire
  photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!photoInput.files.length) return;
    
    try {
      const formData = new FormData();
      formData.append('photo', photoInput.files[0]);
      
      const response = await fetch('/api/users/photo', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('moustass_token')
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erreur lors de l\'upload de la photo');
      }
      
      // Mettre à jour l'utilisateur dans le localStorage
      const user = JSON.parse(localStorage.getItem('moustass_user') || '{}');
      user.photo_url = data.photo_url;
      localStorage.setItem('moustass_user', JSON.stringify(user));
      
      // Recharger l'avatar
      renderAvatar(data.photo_url);
      
      // Afficher une notification
      utils.showNotification('Photo de profil mise à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo', error);
      utils.showNotification(error.message || 'Erreur lors de l\'upload de la photo', 'error');
    }
  });
}

/**
 * Affiche l'avatar de l'utilisateur
 * @param {string} photoUrl - URL de la photo (optionnel)
 */
function renderAvatar(photoUrl) {
  const avatarDiv = document.getElementById('profile-avatar');
  const user = JSON.parse(localStorage.getItem('moustass_user') || '{}');
  
  if (!avatarDiv) return;
  
  // Vider le conteneur
  avatarDiv.innerHTML = '';
  
  // URL de la photo (priorité à celle passée en paramètre)
  const url = photoUrl || user.photo_url;
  
  if (url) {
    const img = document.createElement('img');
    img.src = url + '?t=' + Date.now(); // Ajouter un timestamp pour éviter le cache
    img.alt = 'Photo de profil';
    avatarDiv.appendChild(img);
  } else if (user.full_name) {
    const initials = user.full_name
      .trim()
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase();
    avatarDiv.textContent = initials;
  } else if (user.username) {
    avatarDiv.textContent = user.username.slice(0, 2).toUpperCase();
  } else {
    avatarDiv.textContent = '?';
  }
}

/**
 * Évalue la force d'un mot de passe
 * @param {string} password - Mot de passe à évaluer
 * @returns {Object} Score et message
 */
function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, message: 'Mot de passe non défini' };
  }
  
  let score = 0;
  
  // Longueur du mot de passe
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Complexité du mot de passe
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  // Maximum 4 points
  score = Math.min(score, 4);
  
  const messages = [
    'Très faible',
    'Faible',
    'Moyen',
    'Fort',
    'Très fort'
  ];
  
  return {
    score,
    message: messages[score]
  };
}

/**
 * Affiche un message de statut
 * @param {HTMLElement} element - Élément où afficher le message
 * @param {string} message - Message à afficher
 * @param {string} type - Type de message (success, error)
 */
function showStatus(element, message, type) {
  if (!element) return;
  
  // Définir le texte et la classe
  element.textContent = message;
  element.className = 'status-message';
  element.classList.add(type);
  
  // Afficher le message
  element.style.display = 'block';
  
  // Masquer le message après 5 secondes
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}