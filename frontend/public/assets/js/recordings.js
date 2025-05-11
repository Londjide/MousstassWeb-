/**
 * Module de gestion des enregistrements pour Missié Moustass Web
 * Gère l'affichage, le filtrage et les actions sur les enregistrements
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialisation
  initRecordingsList();
});

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
  
  playButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const recordingId = button.getAttribute('data-id');
      
      try {
        // Récupérer les détails de l'enregistrement
        const token = localStorage.getItem(config.tokenKey);
        if (!token) {
          alert('Vous devez être connecté pour écouter un enregistrement.');
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/recordings/${recordingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'enregistrement');
        }
        
        const recording = await response.json();
        
        // Afficher la modale de lecture
        showPlayerModal(recording);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la lecture de l\'enregistrement.');
      }
    });
  });
}

/**
 * Affiche la modale de lecture avec les détails de l'enregistrement
 */
function showPlayerModal(recording) {
  const modal = document.getElementById('player-modal');
  const playerTitle = document.getElementById('player-title');
  const audioPlayer = document.getElementById('audio-player');
  const playerDescription = document.getElementById('player-description');
  const playerDate = document.getElementById('player-date');
  
  if (modal && playerTitle && audioPlayer && playerDescription && playerDate) {
    // Définir les informations de l'enregistrement
    playerTitle.textContent = recording.title;
    playerDescription.textContent = recording.description || 'Pas de description';
    
    // Formater la date
    const date = new Date(recording.created_at);
    playerDate.textContent = `Enregistré le ${date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    
    // Définir la source audio
    audioPlayer.src = `${config.apiUrl}/recordings/${recording.id}/stream`;
    audioPlayer.load();
    
    // Afficher la modale
    modal.style.display = 'block';
    
    // Lancer la lecture automatiquement
    audioPlayer.play();
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
      
      // Définir l'ID de l'enregistrement dans le formulaire
      if (recordingIdInput) {
        recordingIdInput.value = recordingId;
      }
      
      // Afficher la modale
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
        const token = localStorage.getItem(config.tokenKey);
        if (!token) {
          alert('Vous devez être connecté pour partager un enregistrement.');
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/recordings/${recordingId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: recipientEmail,
            permissions: permissions
          })
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors du partage de l\'enregistrement');
        }
        
        // Fermer la modale et afficher un message de succès
        if (shareModal) {
          shareModal.style.display = 'none';
        }
        
        alert('Enregistrement partagé avec succès !');
        
        // Réinitialiser le formulaire
        shareForm.reset();
      } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors du partage de l\'enregistrement.');
      }
    });
  }
}

/**
 * Configure les boutons d'édition
 */
function setupEditButtons() {
  const editButtons = document.querySelectorAll('.edit-btn');
  
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const recordingId = button.getAttribute('data-id');
      window.location.href = `/recordings/${recordingId}/edit`;
    });
  });
}

/**
 * Configure les boutons de suppression
 */
function setupDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-btn');
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  
  let currentRecordingId = null;
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Stocker l'ID de l'enregistrement à supprimer
      currentRecordingId = button.getAttribute('data-id');
      
      // Afficher la modale de confirmation
      if (deleteModal) {
        deleteModal.style.display = 'block';
      }
    });
  });
  
  // Bouton de confirmation de suppression
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        // Supprimer l'enregistrement
        const token = localStorage.getItem(config.tokenKey);
        if (!token) {
          alert('Vous devez être connecté pour supprimer un enregistrement.');
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/recordings/${currentRecordingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression de l\'enregistrement');
        }
        
        // Fermer la modale
        if (deleteModal) {
          deleteModal.style.display = 'none';
        }
        
        // Rafraîchir la page pour mettre à jour la liste
        window.location.reload();
      } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la suppression de l\'enregistrement.');
      }
    });
  }
  
  // Bouton d'annulation de suppression
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      // Fermer la modale
      if (deleteModal) {
        deleteModal.style.display = 'none';
      }
      
      // Réinitialiser l'ID de l'enregistrement
      currentRecordingId = null;
    });
  }
} 