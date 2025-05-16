document.addEventListener('DOMContentLoaded', () => {
  const sharedList = document.getElementById('shared-list');
  const sharedSpinner = document.getElementById('shared-spinner');
  const sharedEmpty = document.getElementById('shared-empty');
  const searchInput = document.getElementById('search-shared');
  const filterOwner = document.getElementById('filter-owner');
  const filterPerm = document.getElementById('filter-perm');
  
  // Éléments du lecteur modal
  const playerModal = document.getElementById('player-modal');
  const playerTitle = document.getElementById('player-title');
  const playerOwnerName = document.getElementById('player-owner-name');
  const playerAvatar = document.getElementById('player-avatar');
  const playerDescription = document.getElementById('player-description');
  const playerMeta = document.getElementById('player-meta');
  const audioPlayer = document.getElementById('audio-player');
  const playerDownload = document.getElementById('player-download');
  
  // Éléments de la modale d'édition
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const editRecordingId = document.getElementById('edit-recording-id');
  const editTitle = document.getElementById('edit-title');
  const editDescription = document.getElementById('edit-description');
  
  // Fermer toutes les modales quand on clique sur le X
  const closeButtons = document.querySelectorAll('.modal .close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (playerModal) {
        playerModal.style.display = 'none';
        // Arrêter la lecture audio quand on ferme la modal
        if (audioPlayer) {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        }
      }
      if (editModal) {
        editModal.style.display = 'none';
      }
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => modal.style.display = 'none');
    });
  });
  
  // Fermer la modal quand on clique en dehors
  window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
        // Arrêter la lecture audio si c'est la modal du lecteur
        if (modal === playerModal && audioPlayer) {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        }
      }
    });
  });

  // Fermer la modale d'édition quand on clique sur Annuler
  const cancelEditButtons = document.querySelectorAll('.cancel-edit');
  cancelEditButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (editModal) {
        editModal.style.display = 'none';
      }
    });
  });
  
  // Gérer la soumission du formulaire d'édition
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = editRecordingId.value;
      const title = editTitle.value;
      const description = editDescription.value;
      
      try {
        const response = await api.put(`/recordings/${id}`, {
          name: title,
          description: description
        });
        
        if (response.success) {
          // Mettre à jour l'élément dans les données
          const index = sharedData.findIndex(item => item.id.toString() === id.toString());
          if (index !== -1) {
            sharedData[index].name = title;
            sharedData[index].description = description;
            
            // Rafraîchir l'affichage
            renderShared(sharedData);
          }
          
          // Fermer la modale
          editModal.style.display = 'none';
          
          // Afficher une notification de succès
          utils.showNotification('Enregistrement mis à jour avec succès', 'success');
        } else {
          throw new Error(response.message || 'Erreur lors de la mise à jour');
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        utils.showNotification(error.message || 'Erreur lors de la mise à jour', 'error');
      }
    });
  }

  let sharedData = [];
  
  // Stockage des signatures générées (en mémoire)
  const signatures = {};

  // Spinner on
  sharedSpinner.style.display = 'block';
  sharedList.innerHTML = '';
  sharedEmpty.style.display = 'none';

  // Récupérer les enregistrements partagés
  fetchSharedRecordings();

  // Filtres dynamiques
  if (searchInput && filterOwner && filterPerm) {
    [searchInput, filterOwner, filterPerm].forEach(el => {
      el.addEventListener('input', () => {
        const filtered = filterShared();
        renderShared(filtered);
      });
    });
  }

  function fetchSharedRecordings() {
    // Utilisation de l'API pour récupérer les enregistrements partagés
    api.get('/recordings/shared')
      .then(data => {
        sharedSpinner.style.display = 'none';
        if (!data.success || !data.shared || data.shared.length === 0) {
          sharedEmpty.style.display = 'block';
          return;
        }
        sharedData = data.shared;
        renderOwnerOptions(sharedData);
        renderShared(sharedData);
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des enregistrements partagés:", error);
        sharedSpinner.style.display = 'none';
        sharedEmpty.style.display = 'block';
        
        // Vérifier si c'est une erreur d'authentification
        if (error.status === 401) {
          utils.showNotification("Vous devez être connecté pour accéder à cette page", "error");
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      });
  }

  function filterShared() {
    if (!searchInput || !filterOwner || !filterPerm) return sharedData;
    
    const search = searchInput.value.trim().toLowerCase();
    const owner = filterOwner.value;
    const perm = filterPerm.value;
    return sharedData.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(search) ||
        (item.owner_name && item.owner_name.toLowerCase().includes(search));
      const matchOwner = !owner || item.owner_id == owner;
      const matchPerm = !perm || item.permissions === perm;
      return matchSearch && matchOwner && matchPerm;
    });
  }

  function renderOwnerOptions(data) {
    if (!filterOwner) return;
    
    const owners = Array.from(new Set(data.map(item => `${item.owner_id}|${item.owner_name}`)));
    filterOwner.innerHTML = '<option value="">Tous les propriétaires</option>' +
      owners.map(o => {
        const [id, name] = o.split('|');
        return `<option value="${id}">${name}</option>`;
      }).join('');
  }

  function renderShared(data) {
    if (!sharedList) return;
    
    sharedList.innerHTML = '';
    if (!data.length) {
      if (sharedEmpty) sharedEmpty.style.display = 'block';
      return;
    }
    if (sharedEmpty) sharedEmpty.style.display = 'none';
    
    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shared-card';
      
      // Générer l'avatar ou utiliser la photo si disponible
      let avatarContent;
      if (item.owner_avatar) {
        avatarContent = `<img src="${item.owner_avatar}?t=${Date.now()}" alt="${item.owner_name}" class="avatar-img">`;
      } else {
        const ownerInitials = item.owner_name ? item.owner_name.substring(0, 2).toUpperCase() : '??';
        avatarContent = ownerInitials;
      }
      
      // Préparer les boutons d'action basés sur les permissions
      const editButton = item.permissions === 'edit' 
        ? `<button class="shared-action-btn edit-btn" data-id="${item.id}" data-index="${data.indexOf(item)}">✏️ Éditer</button>` 
        : '';
      
      card.innerHTML = `
        <div class="shared-owner">
          <div class="shared-avatar">${avatarContent}</div>
          <span class="shared-owner-name">${item.owner_name}</span>
          <span class="shared-badge-perm">${permLabel(item.permissions)}</span>
        </div>
        <div class="shared-title">${utils.escapeHTML(item.name)}</div>
        <div class="shared-desc">${utils.escapeHTML(item.description || 'Aucune description')}</div>
        <div class="shared-meta">Partagé le ${utils.formatDate(item.shared_at)} &bull; Durée ${utils.formatDuration(item.duration)}</div>
        <div class="shared-actions">
          <button class="shared-action-btn play-btn" data-id="${item.id}" data-index="${data.indexOf(item)}">▶ Écouter</button>
          ${editButton}
          <button class="shared-action-btn download-btn" data-id="${item.id}">⬇ Télécharger</button>
        </div>
      `;
      sharedList.appendChild(card);
    });
    setupActionButtons();
  }

  function setupActionButtons() {
    // Lecture
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const index = parseInt(btn.getAttribute('data-index'));
        const item = sharedData[index];
        
        if (item) {
          try {
            // Afficher la modal avec un indicateur de chargement
            playerTitle.textContent = item.name;
            playerOwnerName.textContent = item.owner_name;
            
            // Configurer l'avatar
            if (item.owner_avatar) {
              playerAvatar.innerHTML = `<img src="${item.owner_avatar}?t=${Date.now()}" alt="${item.owner_name}" class="avatar-img">`;
            } else {
              const ownerInitials = item.owner_name ? item.owner_name.substring(0, 2).toUpperCase() : '??';
              playerAvatar.textContent = ownerInitials;
            }
            
            playerDescription.textContent = item.description || 'Aucune description';
            playerMeta.textContent = `Partagé le ${utils.formatDate(item.shared_at)} • Durée ${utils.formatDuration(item.duration)}`;
            playerModal.style.display = 'block';
            
            // Vérifier si c'est un auto-partage
            const isSelfShared = item.is_self_shared;
            let audioUrl = `/api/recordings/${id}/stream?token=${getToken()}`;
            
            // Si ce n'est pas un auto-partage, obtenir une signature
            if (!isSelfShared) {
              // Vérifier si nous avons déjà une signature valide
              let signature = signatures[id];
              const now = new Date();
              
              // Si la signature n'existe pas ou elle est expirée, en obtenir une nouvelle
              if (!signature || (signature.expiration && new Date(signature.expiration) <= now)) {
                // Montrer un message de chargement pendant la génération de la signature
                utils.showNotification('Sécurisation de l\'accès à l\'enregistrement...', 'info');
                
                // Générer une nouvelle signature
                const response = await api.get(`/recordings/${id}/signature`);
                if (!response.success) {
                  throw new Error(response.message || 'Erreur lors de la génération de la signature');
                }
                
                // Stocker la signature avec son expiration
                signatures[id] = {
                  value: response.signature,
                  expiration: response.expiration
                };
                signature = signatures[id];
              }
              
              // Ajouter la signature à l'URL
              audioUrl += `&signature=${encodeURIComponent(signature.value)}`;
              
              // Configurer le bouton de téléchargement avec signature
              playerDownload.onclick = () => {
                window.open(`${audioUrl}&download=true`, '_blank');
              };
            } else {
              // Pour les auto-partages, pas besoin de signature
              playerDownload.onclick = () => {
                window.open(`${audioUrl}&download=true`, '_blank');
              };
            }
            
            // Configurer le lecteur audio
            audioPlayer.src = audioUrl;
            
            // Lancer la lecture automatiquement
            audioPlayer.play().catch(error => {
              console.error('Erreur de lecture automatique:', error);
              utils.showNotification('Cliquez sur lecture pour écouter l\'enregistrement', 'info');
            });
          } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            utils.showNotification(error.message || 'Erreur lors de la lecture', 'error');
            
            // Si la modale est déjà affichée, la cacher en cas d'erreur
            if (playerModal.style.display === 'block') {
              playerModal.style.display = 'none';
            }
          }
        }
      });
    });
    
    // Édition
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const index = parseInt(btn.getAttribute('data-index'));
        const item = sharedData[index];
        
        if (item && editModal && editRecordingId && editTitle && editDescription) {
          // Remplir le formulaire d'édition
          editRecordingId.value = item.id;
          editTitle.value = item.name || '';
          editDescription.value = item.description || '';
          
          // Afficher la modale d'édition
          editModal.style.display = 'block';
        }
      });
    });
    
    // Téléchargement
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const index = parseInt(btn.getAttribute('data-index'));
        const item = sharedData[index];
        
        try {
          // Vérifier si c'est un auto-partage
          const isSelfShared = item && item.is_self_shared;
          let downloadUrl = `/api/recordings/${id}/stream?token=${getToken()}&download=true`;
          
          // Si ce n'est pas un auto-partage, obtenir une signature
          if (!isSelfShared) {
            // Vérifier si nous avons déjà une signature valide
            let signature = signatures[id];
            const now = new Date();
            
            // Si la signature n'existe pas ou elle est expirée, en obtenir une nouvelle
            if (!signature || (signature.expiration && new Date(signature.expiration) <= now)) {
              // Montrer un message de chargement
              utils.showNotification('Sécurisation du téléchargement...', 'info');
              
              // Générer une nouvelle signature
              const response = await api.get(`/recordings/${id}/signature`);
              if (!response.success) {
                throw new Error(response.message || 'Erreur lors de la génération de la signature');
              }
              
              // Stocker la signature avec son expiration
              signatures[id] = {
                value: response.signature,
                expiration: response.expiration
              };
              signature = signatures[id];
            }
            
            // Ajouter la signature à l'URL de téléchargement
            downloadUrl += `&signature=${encodeURIComponent(signature.value)}`;
          }
          
          // Ouvrir la fenêtre de téléchargement
          window.open(downloadUrl, '_blank');
        } catch (error) {
          console.error('Erreur lors du téléchargement:', error);
          utils.showNotification(error.message || 'Erreur lors du téléchargement', 'error');
        }
      });
    });
  }

  function permLabel(perm) {
    if (perm === 'edit') return 'Édition';
    return 'Lecture seule';
  }

  function getToken() {
    return localStorage.getItem(config.tokenKey) || '';
  }
}); 