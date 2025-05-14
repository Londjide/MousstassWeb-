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
  
  // Fermer la modal quand on clique sur le X
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

  let sharedData = [];

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
        avatarContent = `<img src="${item.owner_avatar}" alt="${item.owner_name}" class="avatar-img">`;
      } else {
        const ownerInitials = item.owner_name ? item.owner_name.substring(0, 2).toUpperCase() : '??';
        avatarContent = ownerInitials;
      }
      
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
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const index = parseInt(btn.getAttribute('data-index'));
        const item = sharedData[index];
        
        if (item) {
          // Remplir la modal avec les informations de l'enregistrement
          playerTitle.textContent = item.name;
          playerOwnerName.textContent = item.owner_name;
          
          // Configurer l'avatar
          if (item.owner_avatar) {
            playerAvatar.innerHTML = `<img src="${item.owner_avatar}" alt="${item.owner_name}" class="avatar-img">`;
          } else {
            const ownerInitials = item.owner_name ? item.owner_name.substring(0, 2).toUpperCase() : '??';
            playerAvatar.textContent = ownerInitials;
          }
          
          playerDescription.textContent = item.description || 'Aucune description';
          playerMeta.textContent = `Partagé le ${utils.formatDate(item.shared_at)} • Durée ${utils.formatDuration(item.duration)}`;
          
          // Configurer le lecteur audio
          audioPlayer.src = `/api/recordings/${id}/stream?token=${getToken()}`;
          
          // Configurer le bouton de téléchargement
          playerDownload.onclick = () => {
            window.open(`/api/recordings/${id}/stream?token=${getToken()}&download=true`, '_blank');
          };
          
          // Afficher la modal
          playerModal.style.display = 'block';
          
          // Lancer la lecture automatiquement
          audioPlayer.play().catch(error => {
            console.error('Erreur de lecture automatique:', error);
            utils.showNotification('Cliquez sur lecture pour écouter l\'enregistrement', 'info');
          });
        }
      });
    });
    
    // Téléchargement
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.open(`/api/recordings/${id}/stream?token=${getToken()}&download=true`, '_blank');
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