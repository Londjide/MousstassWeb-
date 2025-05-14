/**
 * Module de gestion des enregistrements pour Missié Moustass Web
 * Gère l'affichage, le filtrage et les actions sur les enregistrements
 */

// const config = {
//   apiUrl: '/api',
//   tokenKey: 'moustass_token'
// };

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
      if (!recordingId || recordingId === 'undefined') {
        alert("Erreur : l'identifiant de l'enregistrement est manquant ou invalide.");
        return;
      }
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
        const data = await response.json();
        // Certains contrôleurs renvoient { success, recording }, d'autres { ...recording }
        const recording = data.recording || data;
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
    playerTitle.textContent = recording.title || recording.name || 'Enregistrement';
    playerDescription.textContent = recording.description || 'Pas de description';
    const date = new Date(recording.created_at || recording.timestamp);
    playerDate.textContent = isNaN(date.getTime()) ? '' : `Enregistré le ${date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    // Ajout du token JWT dans l'URL pour la balise audio
    const token = localStorage.getItem(config.tokenKey);
    audioPlayer.src = `${config.apiUrl}/recordings/${recording.id}/stream?token=${token}`;
    audioPlayer.load();
    modal.style.display = 'block';
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
        const token = localStorage.getItem(config.tokenKey);
        if (!token) {
          alert('Vous devez être connecté pour partager un enregistrement.');
          return;
        }
        // 1. Chercher l'utilisateur par email
        const userRes = await fetch(`${config.apiUrl}/users/by-email?email=${encodeURIComponent(recipientEmail)}`, {
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
        const response = await fetch(`${config.apiUrl}/recordings/${recordingId}/share`, {
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
        const token = localStorage.getItem(config.tokenKey);
        if (!token) {
          alert('Vous devez être connecté pour supprimer un enregistrement.');
          return;
        }
        const response = await fetch(`${config.apiUrl}/recordings/${recordingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression de l\'enregistrement');
        }
        window.location.reload();
      } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la suppression de l\'enregistrement.');
      }
    });
  });
}

/**
 * Délégation d'événement pour les boutons d'action sur la liste des enregistrements
 */
// document.addEventListener('DOMContentLoaded', () => {
//   const recordingsList = document.querySelector('.recordings-list');
//   if (recordingsList) {
//     recordingsList.addEventListener('click', (e) => {
//       const playBtn = e.target.closest('.play-btn');
//       if (playBtn) {
//         const recordingId = playBtn.getAttribute('data-id');
//         if (recordingId) playRecording(recordingId);
//         return;
//       }
//       const shareBtn = e.target.closest('.share-btn');
//       if (shareBtn) {
//         const recordingId = shareBtn.getAttribute('data-id');
//         if (recordingId) openShareModal(recordingId);
//         return;
//       }
//       const editBtn = e.target.closest('.edit-btn');
//       if (editBtn) {
//         const recordingId = editBtn.getAttribute('data-id');
//         if (recordingId) window.location.href = `/recordings/${recordingId}/edit`;
//         return;
//       }
//       const deleteBtn = e.target.closest('.delete-btn');
//       if (deleteBtn) {
//         const recordingId = deleteBtn.getAttribute('data-id');
//         if (recordingId) openDeleteModal(recordingId);
//         return;
//       }
//     });
//   }
// });

// // Fonctions d'action (à adapter si besoin)
// function playRecording(recordingId) {
//   // ... logique existante pour lecture ...
//   const token = localStorage.getItem(config.tokenKey);
//   if (!token) {
//     alert('Vous devez être connecté pour écouter un enregistrement.');
//     return;
//   }
//   fetch(`${config.apiUrl}/recordings/${recordingId}`, {
//     headers: { 'Authorization': `Bearer ${token}` }
//   })
//     .then(res => res.json())
//     .then(data => {
//       const recording = data.recording || data;
//       showPlayerModal(recording);
//     })
//     .catch(() => alert('Erreur lors de la récupération de l\'enregistrement.'));
// }
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
      const token = localStorage.getItem(config.tokenKey);
      if (!token) {
        alert('Vous devez être connecté pour supprimer un enregistrement.');
        return;
      }
      const response = await fetch(`${config.apiUrl}/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        deleteModal.style.display = 'none';
        window.location.reload();
      } else {
        alert('Erreur lors de la suppression de l\'enregistrement.');
      }
    };
  }
}console.log('Attachement listeners edit/delete');
const editButtons = document.querySelectorAll('.edit-btn');
const deleteButtons = document.querySelectorAll('.delete-btn');
console.log('Edit buttons trouvés:', editButtons.length);
console.log('Delete buttons trouvés:', deleteButtons.length);

editButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('Click sur edit', btn.getAttribute('data-id'));
  });
});
deleteButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('Click sur delete', btn.getAttribute('data-id'));
  });
});

// Gestion de la modale d'édition
function setupEditModal() {
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const closeBtn = editModal.querySelector('.close');
  let currentId = null;

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
      document.getElementById('edit-description').value = description;
      editModal.style.display = 'block';
    });
  });

  // Fermer la modale
  closeBtn.onclick = () => { editModal.style.display = 'none'; };
  window.onclick = (event) => { if (event.target === editModal) editModal.style.display = 'none'; };

  // Soumission du formulaire
  editForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-recording-id').value;
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-description').value;
    try {
      const token = localStorage.getItem(config.tokenKey);
      const res = await fetch(`/api/recordings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name: title, description })
      });
      const data = await res.json();
      if (data.success) {
        utils.showNotification('Enregistrement modifié avec succès', 'success');
        editModal.style.display = 'none';
        setTimeout(() => window.location.reload(), 800);
      } else {
        utils.showNotification(data.message || 'Erreur lors de la modification', 'error');
      }
    } catch (err) {
      utils.showNotification('Erreur réseau', 'error');
    }
  };
}

// Appeler la fonction d'initialisation après le DOMContentLoaded ou dans initRecordingsList
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEditModal);
} else {
  setupEditModal();
}
