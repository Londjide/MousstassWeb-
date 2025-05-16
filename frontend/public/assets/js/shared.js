document.addEventListener('DOMContentLoaded', () => {
  // Vérifier l'authentification avant d'initialiser
  verifyAuthentication().then(isAuthenticated => {
    if (isAuthenticated) {
      initSharedPage();
    } else {
      // Rediriger vers la page d'accueil si non authentifié
      window.location.href = '/?auth=required';
    }
  });
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
 * Initialise la page de partages
 */
function initSharedPage() {
  const sharedList = document.getElementById('shared-list');
  const sharedSpinner = document.getElementById('shared-spinner');
  const sharedEmpty = document.getElementById('shared-empty');
  const searchInput = document.getElementById('search-shared');
  const filterOwner = document.getElementById('filter-owner');
  const filterPerm = document.getElementById('filter-perm');
  
  // Cache des données partagées pour réduire les requêtes au serveur
  const sharedDataCache = {
    data: null,
    timestamp: null,
    // Durée de validité du cache en millisecondes (30 secondes)
    validityDuration: 30000
  };
  
  // Stockage des signatures générées (en mémoire)
  const signatures = {};

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
          
          // Invalider le cache après modification
          sharedDataCache.timestamp = null;
          
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

  // Spinner on
  if (sharedSpinner) sharedSpinner.style.display = 'block';
  if (sharedList) sharedList.innerHTML = '';
  if (sharedEmpty) sharedEmpty.style.display = 'none';

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

  async function fetchSharedRecordings() {
    // Vérifier si les données en cache sont valides
    const now = Date.now();
    if (sharedDataCache.data && sharedDataCache.timestamp && 
        (now - sharedDataCache.timestamp < sharedDataCache.validityDuration)) {
      console.log("Utilisation des données en cache pour les enregistrements partagés");
      if (sharedSpinner) sharedSpinner.style.display = 'none';
      sharedData = sharedDataCache.data;
      renderOwnerOptions(sharedData);
      renderShared(sharedData);
      return;
    }
    
    // Utilisation de fetch directement avec en-tête d'autorisation pour éviter les problèmes d'API
    const token = localStorage.getItem('moustass_token');
    document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; max-age=86400`;
    document.cookie = `token=${token}; path=/; SameSite=Strict; max-age=86400`;
    
    try {
      console.log("Récupération des enregistrements partagés depuis le serveur");
      const response = await fetch('/api/recordings/shared', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, message: 'Non autorisé' };
        }
        throw new Error('Erreur lors de la récupération des enregistrements');
      }
      
      const data = await response.json();
      if (sharedSpinner) sharedSpinner.style.display = 'none';
      
      if (!data.success || !data.shared || data.shared.length === 0) {
        if (sharedEmpty) sharedEmpty.style.display = 'block';
        return;
      }
      
      // Mettre en cache les données
      sharedDataCache.data = data.shared;
      sharedDataCache.timestamp = now;
      
      sharedData = data.shared;
      renderOwnerOptions(sharedData);
      renderShared(sharedData);
    } catch (error) {
      console.error("Erreur lors de la récupération des enregistrements partagés:", error);
      if (sharedSpinner) sharedSpinner.style.display = 'none';
      if (sharedEmpty) sharedEmpty.style.display = 'block';

      // Vérifier si c'est une erreur d'authentification
      if (error.status === 401) {
        utils.showNotification("Vous devez être connecté pour accéder à cette page", "error");
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    }
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
    console.log("setupActionButtons: Configuration des boutons d'action");
    const playBtns = document.querySelectorAll('.play-btn');
    console.log(`setupActionButtons: Trouvé ${playBtns.length} boutons de lecture`);
    
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        console.log("Bouton play cliqué dans shared.js");
        event.preventDefault();
        
        const id = btn.getAttribute('data-id');
        const index = parseInt(btn.getAttribute('data-index'));
        console.log(`Lecture de l'enregistrement ID=${id}, index=${index}`);
        
        const item = sharedData[index];
        console.log("Données de l'item:", item ? "Trouvées" : "Manquantes");
        
        if (item) {
          try {
            console.log("Préparation de la lecture pour:", item.name);
            
            // Vérifier que tous les éléments du DOM sont disponibles
            if (!playerModal || !playerTitle || !playerOwnerName || !playerAvatar || 
                !playerDescription || !playerMeta || !audioPlayer || !playerDownload) {
              console.error("Éléments DOM manquants:", {
                playerModal: !!playerModal,
                playerTitle: !!playerTitle,
                playerOwnerName: !!playerOwnerName,
                playerAvatar: !!playerAvatar,
                playerDescription: !!playerDescription,
                playerMeta: !!playerMeta,
                audioPlayer: !!audioPlayer,
                playerDownload: !!playerDownload
              });
              alert("Erreur: éléments du lecteur audio manquants");
              return;
            }
            
            // Afficher la modal avec les informations
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
            
            // Récupérer le token et vérifier qu'il existe
            const token = getToken();
            if (!token) {
              console.error("Token manquant pour la lecture audio");
              alert("Erreur d'authentification: veuillez vous reconnecter");
              return;
            }
            console.log("Token utilisé pour la lecture:", token ? "Présent" : "Absent");
            
            // Synchronisation explicite des cookies avant toute lecture (7 jours = 604800 secondes)
            document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; max-age=604800`;
            document.cookie = `token=${token}; path=/; SameSite=Strict; max-age=604800`;
            console.log("Cookies synchronisés avant lecture audio");
            
            // URL de base pour le streaming
            let audioUrl = `/api/recordings/${id}/stream`;
            let downloadUrl = `/api/recordings/${id}/stream?download=true`;
            
            // Vérifier si c'est un auto-partage
            const isSelfShared = item.is_self_shared;
            console.log("Auto-partage:", isSelfShared ? "Oui" : "Non");
            
            // Si ce n'est pas un auto-partage, obtenir une signature
            if (!isSelfShared) {
              console.log("Récupération d'une signature pour contenu partagé");
              
              // Vérifier si nous avons déjà une signature valide
              let signature = signatures[id];
              const now = new Date();
              
              // Si la signature n'existe pas ou elle est expirée, en obtenir une nouvelle
              if (!signature || (signature.expiration && new Date(signature.expiration) <= now)) {
                // Montrer un message de chargement pendant la génération de la signature
                utils.showNotification('Sécurisation de l\'accès à l\'enregistrement...', 'info');
                
                try {
                  // Générer une nouvelle signature via l'API
                  console.log("Appel API pour obtenir une signature");
                  const response = await api.get(`/recordings/${id}/signature`);
                  console.log("Réponse signature:", response);
                  
                  if (!response.success) {
                    throw new Error(response.message || 'Erreur lors de la génération de la signature');
                  }
                  
                  // Stocker la signature avec son expiration
                  signatures[id] = {
                    value: response.signature,
                    expiration: response.expiration
                  };
                  signature = signatures[id];
                  console.log("Nouvelle signature générée avec succès:", signature.value);
                } catch (signatureError) {
                  console.error("Erreur lors de la génération de la signature:", signatureError);
                  throw new Error("Impossible d'obtenir une signature d'accès: " + signatureError.message);
                }
              } else {
                console.log("Utilisation d'une signature en cache valide:", signature.value);
              }
              
              // Ajouter la signature à l'URL (respecter la syntaxe URL)
              audioUrl = `${audioUrl}?signature=${encodeURIComponent(signature.value)}`;
              downloadUrl = `${downloadUrl}&signature=${encodeURIComponent(signature.value)}`;
            }
            
            console.log("URL audio configurée:", audioUrl);
            
            // Configurer le bouton de téléchargement
            playerDownload.onclick = () => {
              window.open(downloadUrl, '_blank');
            };
            
            // Afficher la modale
            playerModal.style.display = 'block';
            
            // Réinitialiser le lecteur audio
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.crossOrigin = "anonymous"; // Permet le streaming cross-domain
            
            // Événement pour détecter les erreurs de chargement
            audioPlayer.onerror = function(e) {
              console.error("Erreur de chargement audio:", e);
              alert("Erreur lors du chargement de l'audio. Veuillez réessayer ou actualiser la page.");
            };
            
            // Définir la source après avoir configuré les événements
            audioPlayer.src = audioUrl;
            
            // Charger le contenu audio
            audioPlayer.load();
            
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
          } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            utils.showNotification(error.message || 'Erreur lors de la lecture', 'error');
            
            // Si la modale est déjà affichée, la cacher en cas d'erreur
            if (playerModal && playerModal.style.display === 'block') {
              playerModal.style.display = 'none';
            }
          }
        } else {
          console.error("Item non trouvé dans sharedData avec l'index:", index);
          utils.showNotification("Enregistrement non trouvé", "error");
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
          const token = getToken();
          if (!token) {
            alert('Vous devez être connecté pour télécharger un enregistrement.');
            return;
          }
          
          // Synchroniser le token dans les cookies
          document.cookie = `moustass_token=${token}; path=/; SameSite=Strict; max-age=604800`;
          document.cookie = `token=${token}; path=/; SameSite=Strict; max-age=604800`;
          
          let downloadUrl = `/api/recordings/${id}/stream?download=true`;
          
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

  // Fonction pour afficher le libellé des permissions
  function permLabel(perm) {
    switch(perm) {
      case 'read': return 'Lecture seule';
      case 'edit': return 'Édition';
      default: return perm;
    }
  }

  // Fonction pour récupérer le token
  function getToken() {
    return localStorage.getItem('moustass_token') || '';
  }
} 