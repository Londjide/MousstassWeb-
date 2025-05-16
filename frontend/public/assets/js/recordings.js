/**
 * Module de gestion des enregistrements pour Missié Moustass Web
 * Gère l'affichage, le filtrage et les actions sur les enregistrements
 */

// Cache des données pour réduire les requêtes au serveur
const recordingsCache = {
  data: null,
  timestamp: null,
  // Durée de validité du cache en millisecondes (30 secondes)
  validityDuration: 30000
};

document.addEventListener('DOMContentLoaded', () => {
  // Synchroniser les tokens immédiatement au chargement de la page /recordings
  synchronizeTokens();
  
  // Initialisation directe sans vérification d'authentification qui bloque tout
  initRecordingsList();
});

/**
 * Vérifie l'authentification de l'utilisateur
 * @returns {Promise<boolean>} Vrai si l'utilisateur est authentifié
 */
async function verifyAuthentication() {
  const token = localStorage.getItem('moustass_token');
  if (!token) return false;
  
  try {
    // Vérifier le format du token (validité minimale)
    if (!isValidTokenFormat(token)) {
      console.warn("Format de token invalide détecté");
      return false;
    }
    
    // Vérifier la validité du token avec le serveur
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'authentification:", error);
    return false;
  }
}

/**
 * Vérifie le format d'un token JWT
 * @param {string} token - Token à vérifier
 * @returns {boolean} Vrai si le format est valide
 */
function isValidTokenFormat(token) {
  // Vérification minimale du format (3 parties séparées par des points)
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Vérifier que chaque partie contient des caractères valides en base64url
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => base64UrlRegex.test(part));
}

/**
 * Fonction de synchronisation des tokens spécifique pour la page recordings
 * Cette fonction est une copie de celle dans main.js pour garantir une disponibilité locale
 */
function synchronizeTokens() {
  const jwt = localStorage.getItem('moustass_token');
  if (jwt) {
    document.cookie = `moustass_token=${jwt}; path=/; SameSite=Strict; max-age=86400`;
    document.cookie = `token=${jwt}; path=/; SameSite=Strict; max-age=86400`;
    console.log("Token JWT synchronisé du localStorage vers les cookies dans recordings.js");
  }
}

/**
 * Initialise la liste des enregistrements et les événements associés
 */
function initRecordingsList() {
  // Bouton pour créer un nouvel enregistrement
  const newRecordingBtn = document.getElementById('new-recording-btn');
  const emptyStateRecordBtn = document.getElementById('empty-state-record-btn');
  
  if (newRecordingBtn) {
    newRecordingBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  
  if (emptyStateRecordBtn) {
    emptyStateRecordBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  
  // Recherche et filtrage
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const sortSelect = document.getElementById('sort-select');
  
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        // Synchroniser les tokens avant de changer de page
        synchronizeTokens();
        window.location.href = `/recordings?search=${encodeURIComponent(searchTerm)}`;
      }
    });
    
    // Permettre la recherche avec la touche Entrée
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchButton.click();
      }
    });
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      // Récupérer les paramètres d'URL actuels
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('sort', sortSelect.value);
      
      // Synchroniser les tokens avant de rediriger
      synchronizeTokens();
      // Rediriger avec le nouveau tri
      window.location.href = `/recordings?${urlParams.toString()}`;
    });
    
    // Définir la valeur du tri depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const sortParam = urlParams.get('sort');
    if (sortParam) {
      sortSelect.value = sortParam;
    }
  }
  
  // Gestion des boutons d'action
  setupPlayButtons();
  setupShareButtons();
  setupEditButtons();
  setupDeleteButtons();
}

/**
 * Configure les boutons de lecture
 */
function setupPlayButtons() {
  const playButtons = document.querySelectorAll('.play-btn');
  
  console.log("setupPlayButtons: Trouvé", playButtons.length, "boutons de lecture");
  
  playButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      console.log("Bouton play cliqué");
      event.preventDefault();
      
      const recordingId = button.getAttribute('data-id');
      console.log("ID de l'enregistrement:", recordingId);
      
      if (!recordingId || recordingId === 'undefined') {
        alert("Erreur : l'identifiant de l'enregistrement est manquant ou invalide.");
        return;
      }
      
      try {
        // Récupérer les détails de l'enregistrement
        const token = api.getToken();
        console.log("Token utilisé:", token ? "Présent" : "Absent");
        
        if (!token) {
          alert('Vous devez être connecté pour écouter un enregistrement.');
          return;
        }
        
        // Vérifier si l'enregistrement est déjà en cache
        if (recordingsCache.data && recordingsCache.data.find) {
          const cachedRecording = recordingsCache.data.find(rec => rec.id.toString() === recordingId.toString());
          if (cachedRecording) {
            console.log("Utilisation des données en cache pour l'enregistrement", recordingId);
            showPlayerModal(cachedRecording);
            return;
          }
        } else {
          console.log("Pas de cache disponible, récupération depuis le serveur");
        }
        
        // Si pas en cache, récupérer depuis le serveur
        console.log(`Récupération de l'enregistrement ${recordingId} depuis le serveur`);
        
        // Utiliser l'API pour récupérer l'enregistrement
        const data = await api.get(`/recordings/${recordingId}`);
        console.log("Données reçues:", data);
        
        // Certains contrôleurs renvoient { success, recording }, d'autres { ...recording }
        const recording = data.recording || data;
        
        if (!recording || !recording.id) {
          throw new Error("Format de réponse invalide, pas d'enregistrement trouvé dans les données");
        }
        
        console.log("Enregistrement récupéré:", recording.name || recording.title);
        showPlayerModal(recording);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'enregistrement:', error);
        alert('Une erreur est survenue lors de la lecture de l\'enregistrement: ' + error.message);
      }
    });
  });
}

/**
 * Affiche la modale de lecture avec les détails de l'enregistrement
 */
function showPlayerModal(recording) {
  console.log("Ouverture de la modale de lecture pour:", recording.name || recording.title);
  
  const modal = document.getElementById('player-modal');
  const playerTitle = document.getElementById('player-title');
  const audioPlayer = document.getElementById('audio-player');
  const playerDescription = document.getElementById('player-description');
  const playerDate = document.getElementById('player-date');
  
  console.log("Éléments trouvés:", {
    modal: !!modal,
    playerTitle: !!playerTitle,
    audioPlayer: !!audioPlayer,
    playerDescription: !!playerDescription,
    playerDate: !!playerDate
  });
  
  if (modal && playerTitle && audioPlayer && playerDescription) {
    playerTitle.textContent = recording.title || recording.name || 'Enregistrement';
    playerDescription.textContent = recording.description || 'Pas de description';
    if (playerDate) {
      const date = new Date(recording.created_at || recording.timestamp);
      playerDate.textContent = isNaN(date.getTime()) ? '' : `Enregistré le ${date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }
    
    // Récupérer le token et le synchroniser avec les cookies
    const token = api.getToken();
    if (!token) {
      console.error("Token manquant pour la lecture audio");
      alert("Erreur d'authentification: veuillez vous reconnecter");
      return;
    }
    
    console.log("Synchronisation des cookies pour la lecture audio");
    // Synchronisation explicite des cookies avant toute lecture (7 jours = 604800 secondes)
    document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; max-age=604800`;
    document.cookie = `token=${token}; path=/; SameSite=Strict; max-age=604800`;
    
    // Configuration de l'URL de streaming (utilisez simplement l'URL sans token)
    const audioUrl = `/api/recordings/${recording.id}/stream`;
    console.log("URL audio configurée:", audioUrl);
    
    // Réinitialiser le lecteur audio
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.crossOrigin = "anonymous"; // Permet le streaming cross-domain
    
    // Événement pour détecter les erreurs de chargement
    audioPlayer.onerror = function(e) {
      console.error("Erreur de chargement audio:", e);
      alert("Erreur lors du chargement de l'audio. Veuillez réessayer ou actualiser la page.");
    };
    
    // Définir la source après avoir configuré les gestionnaires d'événements
    audioPlayer.src = audioUrl;
    
    // Charger le contenu audio
    audioPlayer.load();
    
    // Afficher la modale
    modal.style.display = 'block';
    
    // Ajouter un écouteur d'événements pour la fermeture de la modale
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = 'none';
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      };
    }
    
    // Fermer la modale en cliquant en dehors
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = 'none';
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
    };
    
    // Vérifier si le lecteur est prêt avant de lancer la lecture
    audioPlayer.oncanplay = function() {
      console.log("Audio prêt à être lu");
      try {
        audioPlayer.play()
          .then(() => console.log("Lecture démarrée avec succès"))
          .catch(error => {
            console.error("Erreur lors du démarrage de la lecture:", error);
            console.log("Utilisateur doit cliquer sur play manuellement");
          });
      } catch (e) {
        console.error("Exception lors de la tentative de lecture:", e);
      }
    };
  } else {
    console.error("Éléments manquants pour afficher la modale");
    alert("Erreur: impossible d'afficher le lecteur audio (éléments manquants dans le DOM)");
  }
}

/**
 * Récupère les enregistrements depuis le serveur avec mise en cache
 * @returns {Promise<Array>} Liste des enregistrements
 */
async function fetchRecordings() {
  // Vérifier si les données en cache sont valides
  const now = Date.now();
  if (recordingsCache.data && recordingsCache.timestamp && 
      (now - recordingsCache.timestamp < recordingsCache.validityDuration)) {
    console.log("Utilisation des données en cache pour les enregistrements");
    return recordingsCache.data;
  }
  
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!api.isAuthenticated()) {
      throw new Error('Vous devez être connecté pour accéder aux enregistrements');
    }
    
    console.log("Récupération des enregistrements depuis le serveur");
    const data = await api.get('/recordings');
    
    const recordings = data.recordings || data;
    
    // Mettre en cache les données
    recordingsCache.data = recordings;
    recordingsCache.timestamp = now;
    
    return recordings;
  } catch (error) {
    console.error('Erreur:', error);
    return [];
  }
}

/**
 * Configure les boutons de partage
 */
function setupShareButtons() {
  const shareButtons = document.querySelectorAll('.share-btn');
  const shareModal = document.getElementById('share-modal');
  const shareForm = document.getElementById('share-form');
  const recordingIdInput = document.getElementById('recording-id');
  
  shareButtons.forEach(button => {
    button.addEventListener('click', () => {
      const recordingId = button.getAttribute('data-id');
      if (recordingIdInput) {
        recordingIdInput.value = recordingId;
      }
      if (shareModal) {
        shareModal.style.display = 'block';
      }
    });
  });
  
  // Gestion du formulaire de partage
  if (shareForm) {
    shareForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const recipientEmail = document.getElementById('recipient-email').value;
      const permissions = document.getElementById('share-permissions').value;
      const recordingId = recordingIdInput.value;
      
      try {
        // Partager l'enregistrement
        const token = localStorage.getItem('moustass_token');
        if (!token) {
          alert('Vous devez être connecté pour partager un enregistrement.');
          return;
        }
        // 1. Chercher l'utilisateur par email
        const userRes = await fetch(`/api/users/by-email?email=${encodeURIComponent(recipientEmail)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) {
          throw new Error("Utilisateur destinataire introuvable");
        }
        const userData = await userRes.json();
        const targetUserId = userData.user && userData.user.id;
        if (!targetUserId) {
          alert("Aucun utilisateur trouvé avec cet email.");
          return;
        }
        // 2. Appeler l'API de partage avec l'ID utilisateur
        const response = await fetch(`/api/recordings/${recordingId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            target_user_id: targetUserId,
            permissions: permissions
          })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Erreur lors du partage de l\'enregistrement');
        }
        if (shareModal) {
          shareModal.style.display = 'none';
        }
        
        // Invalider le cache après un partage
        recordingsCache.timestamp = null;
        
        alert('Enregistrement partagé avec succès !');
        shareForm.reset();
      } catch (error) {
        console.error('Erreur:', error);
        alert(error.message || 'Une erreur est survenue lors du partage de l\'enregistrement.');
      }
    });
  }
}

/**
 * Configure les boutons d'édition
 */
function setupEditButtons() {
  // Ne rien faire ici, la gestion de la modale d'édition est déjà assurée par setupEditModal()
}

/**
 * Configure les boutons de suppression
 */
function setupDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const recordingId = button.getAttribute('data-id');
      if (!recordingId) return;
      if (!window.confirm('Voulez-vous vraiment supprimer cet enregistrement ? Cette action est irréversible.')) {
        return;
      }
      try {
        // Vérifier l'authentification
        if (!api.isAuthenticated()) {
          alert('Vous devez être connecté pour supprimer un enregistrement.');
          return;
        }
        
        // Utiliser l'API pour supprimer l'enregistrement
        const response = await api.delete(`/recordings/${recordingId}`);
        
        if (response.success) {
          // Invalider le cache après une suppression
          recordingsCache.timestamp = null;
          
          utils.showNotification('Enregistrement supprimé avec succès', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error(response.message || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur:', error);
        utils.showNotification(error.message || 'Une erreur est survenue lors de la suppression de l\'enregistrement.', 'error');
      }
    });
  });
}

function openShareModal(recordingId) {
  const shareModal = document.getElementById('share-modal');
  const recordingIdInput = document.getElementById('recording-id');
  if (recordingIdInput) recordingIdInput.value = recordingId;
  if (shareModal) shareModal.style.display = 'block';
}
function openDeleteModal(recordingId) {
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  if (deleteModal) deleteModal.style.display = 'block';
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
      try {
        // Vérifier l'authentification
        if (!api.isAuthenticated()) {
          alert('Vous devez être connecté pour supprimer un enregistrement.');
          return;
        }
        
        // Utiliser l'API pour supprimer l'enregistrement
        const response = await api.delete(`/recordings/${recordingId}`);
        
        if (response.success) {
          deleteModal.style.display = 'none';
          
          // Invalider le cache après une suppression
          recordingsCache.timestamp = null;
          
          utils.showNotification('Enregistrement supprimé avec succès', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error(response.message || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur:', error);
        utils.showNotification(error.message || 'Une erreur est survenue lors de la suppression de l\'enregistrement.', 'error');
      }
    };
  }
}

// Gestion de la modale d'édition
function setupEditModal() {
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const closeBtn = editModal && editModal.querySelector('.close');
  let currentId = null;

  if (!editModal || !editForm) {
    console.log("Éléments de la modale d'édition non trouvés");
    return;
  }

  // Ouvrir la modale et pré-remplir
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      currentId = btn.getAttribute('data-id');
      
      // Récupérer les infos de l'enregistrement (depuis le DOM ou via API)
      const card = btn.closest('.recording-card');
      const title = card.querySelector('.recording-title').textContent.trim();
      const description = card.querySelector('.recording-description').textContent.trim();
      
      document.getElementById('edit-recording-id').value = currentId;
      document.getElementById('edit-title').value = title;
      document.getElementById('edit-description').value = description || '';
      
      editModal.style.display = 'block';
    });
  });

  // Fermer la modale
  if (closeBtn) {
    closeBtn.onclick = () => { editModal.style.display = 'none'; };
  }
  window.onclick = (event) => { if (event.target === editModal) editModal.style.display = 'none'; };

  // Soumission du formulaire
  editForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-recording-id').value;
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    
    try {
      // Utiliser l'API pour mettre à jour l'enregistrement
      const data = await api.put(`/recordings/${id}`, { 
        name: title, 
        description 
      });
      
      if (data.success) {
        // Invalider le cache après une modification
        recordingsCache.timestamp = null;
        
        utils.showNotification('Enregistrement modifié avec succès', 'success');
        editModal.style.display = 'none';
        setTimeout(() => window.location.reload(), 800);
      } else {
        utils.showNotification(data.message || 'Erreur lors de la modification', 'error');
      }
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      utils.showNotification(err.message || 'Erreur réseau', 'error');
    }
  };
}

// Appeler la fonction d'initialisation après le DOMContentLoaded ou dans initRecordingsList
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEditModal);
} else {
  setupEditModal();
}
