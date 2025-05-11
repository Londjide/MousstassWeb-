/**
 * Service de gestion des enregistrements audio
 */
const audioService = {
    // Propriétés pour l'enregistrement
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: null,
    recordingInterval: null,
    recordingDuration: 0,
    audioContext: null,
    audioPlayer: null,
  
    /**
     * Initialise l'enregistreur audio
     * @returns {Promise<boolean>} Vrai si l'initialisation est réussie
     */
    async initRecorder() {
      try {
        // Demande d'accès au microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Création de l'enregistreur
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: config.audio.mimeType,
          audioBitsPerSecond: config.audio.audioBitsPerSecond
        });
        
        // Événements de l'enregistreur
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        
        return true;
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'enregistreur audio', error);
        return false;
      }
    },
  
    /**
     * Démarre l'enregistrement audio
     */
    startRecording() {
      // Réinitialisation
      this.audioChunks = [];
      this.recordingDuration = 0;
      
      // Démarrage de l'enregistrement
      this.mediaRecorder.start();
      this.recordingStartTime = Date.now();
      
      // Mise à jour du compteur
      const timeDisplay = document.getElementById('recording-time');
      this.recordingInterval = setInterval(() => {
        this.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        if (timeDisplay) {
          timeDisplay.textContent = utils.formatDuration(this.recordingDuration);
        }
      }, 1000);
      
      // Affichage de l'indicateur d'enregistrement
      const indicator = document.getElementById('recording-indicator');
      if (indicator) {
        indicator.classList.add('active');
      }
    },
  
    /**
     * Arrête l'enregistrement audio
     * @returns {Promise<Blob>} Blob de l'enregistrement audio
     */
    stopRecording() {
      return new Promise((resolve) => {
        // Arrêt du compteur
        clearInterval(this.recordingInterval);
        
        // Masquage de l'indicateur d'enregistrement
        const indicator = document.getElementById('recording-indicator');
        if (indicator) {
          indicator.classList.remove('active');
        }
        
        // Arrêt de l'enregistrement et récupération des données
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: config.audio.mimeType });
          resolve(audioBlob);
        };
        
        this.mediaRecorder.stop();
      });
    },
  
    /**
     * Enregistre un fichier audio sur le serveur
     * @param {Blob} audioBlob - Blob audio
     * @param {string} filename - Nom du fichier
     * @param {string} description - Description
     * @returns {Promise<Object>} Réponse de l'API
     */
    async saveAudioRecord(audioBlob, filename, description) {
      try {
        // Conversion du Blob en Base64
        const audioData = await utils.blobToBase64(audioBlob);
        
        // Envoi au serveur
        return await api.post('/audio', {
          filename,
          audio_data: audioData,
          description,
          duration_seconds: this.recordingDuration
        });
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement audio', error);
        throw error;
      }
    },
  
    /**
     * Récupère la liste des enregistrements audio
     * @param {number} page - Numéro de page
     * @param {number} limit - Nombre d'éléments par page
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getAudioRecords(page = 1, limit = config.defaultPageSize) {
      try {
        return await api.get('/audio/user', { page, limit });
      } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements audio', error);
        throw error;
      }
    },
  
    /**
     * Récupère un enregistrement audio par son ID
     * @param {number} id - ID de l'enregistrement
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getAudioRecord(id) {
      try {
        return await api.get(`/audio/${id}`);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'enregistrement audio', error);
        throw error;
      }
    },
  
    /**
     * Récupère les données audio déchiffrées
     * @param {number} id - ID de l'enregistrement
     * @returns {Promise<Blob>} Blob audio
     */
    async getAudioData(id) {
      try {
        const response = await api.get(`/audio/${id}/data`);
        
        // Conversion Base64 en Blob
        const binaryString = atob(response.audio_data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new Blob([bytes], { type: config.audio.mimeType });
      } catch (error) {
        console.error('Erreur lors de la récupération des données audio', error);
        throw error;
      }
    },
  
    /**
     * Met à jour un enregistrement audio
     * @param {number} id - ID de l'enregistrement
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<Object>} Réponse de l'API
     */
    async updateAudioRecord(id, data) {
      try {
        return await api.put(`/audio/${id}`, data);
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'enregistrement audio', error);
        throw error;
      }
    },
  
    /**
     * Supprime un enregistrement audio
     * @param {number} id - ID de l'enregistrement
     * @returns {Promise<Object>} Réponse de l'API
     */
    async deleteAudioRecord(id) {
      try {
        return await api.delete(`/audio/${id}`);
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'enregistrement audio', error);
        throw error;
      }
    },
  
    /**
     * Joue un enregistrement audio
     * @param {Blob} audioBlob - Blob audio à jouer
     * @returns {HTMLAudioElement} Élément audio
     */
    playAudio(audioBlob) {
      // Arrêt de la lecture en cours
      if (this.audioPlayer) {
        this.audioPlayer.pause();
      }
      
      // Création de l'URL de l'objet Blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Création du lecteur audio
      this.audioPlayer = new Audio(audioUrl);
      
      // Suppression de l'URL de l'objet après la fin de la lecture
      this.audioPlayer.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      // Démarrage de la lecture
      this.audioPlayer.play();
      
      return this.audioPlayer;
    },
  
    /**
     * Crée un élément de liste audio
     * @param {Object} record - Enregistrement audio
     * @returns {HTMLElement} Élément de liste
     */
    createAudioListItem(record) {
      // Clonage du template
      const template = document.getElementById('audio-item-template');
      const item = document.importNode(template.content, true).firstElementChild;
      
      // Définition des données
      item.dataset.id = record.id;
      
      // Titre
      const title = item.querySelector('.audio-title');
      title.textContent = record.filename;
      
      // Description
      const description = item.querySelector('.audio-description');
      description.textContent = record.description || 'Aucune description';
      
      // Date
      const date = item.querySelector('.audio-date');
      date.textContent = utils.formatDate(record.created_at);
      
      // Durée
      const duration = item.querySelector('.audio-duration');
      duration.textContent = utils.formatDuration(record.duration_seconds || 0);
      
      // Événements
      const playBtn = item.querySelector('.audio-play');
      const editBtn = item.querySelector('.audio-edit');
      const deleteBtn = item.querySelector('.audio-delete');
      
      // Lecture
      playBtn.addEventListener('click', async () => {
        try {
          // Affichage du chargement
          playBtn.innerHTML = '<div class="loading-spinner-small"></div>';
          
          // Récupération des données audio
          const audioBlob = await this.getAudioData(record.id);
          
          // Lecture
          this.playAudio(audioBlob);
          
          // Restauration du bouton
          playBtn.innerHTML = '<i class="icon icon-play"></i>';
        } catch (error) {
          console.error('Erreur lors de la lecture audio', error);
          utils.showNotification('Erreur lors de la lecture audio', 'error');
          playBtn.innerHTML = '<i class="icon icon-play"></i>';
        }
      });
      
      // Édition
      editBtn.addEventListener('click', () => {
        // Ouverture de la modal d'édition
        const modal = document.getElementById('modal-container');
        const modalTitle = modal.querySelector('.modal-title');
        const modalContent = modal.querySelector('.modal-content');
        
        modalTitle.textContent = 'Modifier l\'enregistrement';
        
        // Formulaire d'édition
        modalContent.innerHTML = `
          <form id="edit-audio-form">
            <div class="form-group">
              <label for="edit-filename">Nom de l'enregistrement</label>
              <input type="text" id="edit-filename" name="filename" value="${utils.escapeHTML(record.filename)}" required>
            </div>
            <div class="form-group">
              <label for="edit-description">Description</label>
              <textarea id="edit-description" name="description">${utils.escapeHTML(record.description || '')}</textarea>
            </div>
            <div class="form-buttons">
              <button type="submit" class="btn btn-primary">Enregistrer</button>
              <button type="button" class="btn btn-secondary modal-close">Annuler</button>
            </div>
          </form>
        `;
        
        // Soumission du formulaire
        const form = modalContent.querySelector('#edit-audio-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          try {
            const formData = new FormData(form);
            const updateData = {
              description: formData.get('description')
            };
            
            // Mise à jour de l'enregistrement
            await this.updateAudioRecord(record.id, updateData);
            
            // Fermeture de la modal
            modal.style.display = 'none';
            
            // Notification
            utils.showNotification('Enregistrement mis à jour avec succès', 'success');
            
            // Mise à jour de la liste
            this.loadAudioList();
          } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'enregistrement', error);
            utils.showNotification('Erreur lors de la mise à jour', 'error');
          }
        });
        
        // Affichage de la modal
        modal.style.display = 'flex';
      });
      
      // Suppression
      deleteBtn.addEventListener('click', async () => {
        const confirmed = await utils.confirmDialog('Êtes-vous sûr de vouloir supprimer cet enregistrement ?');
        
        if (confirmed) {
          try {
            await this.deleteAudioRecord(record.id);
            
            // Notification
            utils.showNotification('Enregistrement supprimé avec succès', 'success');
            
            // Suppression de l'élément de la liste
            item.remove();
          } catch (error) {
            console.error('Erreur lors de la suppression de l\'enregistrement', error);
            utils.showNotification('Erreur lors de la suppression', 'error');
          }
        }
      });
      
      return item;
    },
  
    /**
     * Charge la liste des enregistrements audio
     * @param {number} page - Numéro de page
     */
    async loadAudioList(page = 1) {
      try {
        const audioList = document.getElementById('audio-list');
        const paginationContainer = document.getElementById('audio-pagination');
        
        if (!audioList) return;
        
        // Affichage du chargement
        audioList.innerHTML = '<div class="loading-spinner"></div>';
        
        // Récupération des enregistrements
        const response = await this.getAudioRecords(page);
        
        // Vérification si des enregistrements existent
        if (!response.records || response.records.length === 0) {
          audioList.innerHTML = '<div class="empty-list">Aucun enregistrement trouvé</div>';
          paginationContainer.innerHTML = '';
          return;
        }
        
        // Affichage des enregistrements
        audioList.innerHTML = '';
        response.records.forEach(record => {
          const item = this.createAudioListItem(record);
          audioList.appendChild(item);
        });
        
        // Pagination
        if (paginationContainer) {
          const totalPages = Math.ceil(response.total / response.limit);
          
          if (totalPages > 1) {
            const pagination = utils.createPagination(
              response.page,
              totalPages,
              (newPage) => this.loadAudioList(newPage)
            );
            
            paginationContainer.innerHTML = '';
            paginationContainer.appendChild(pagination);
          } else {
            paginationContainer.innerHTML = '';
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des enregistrements audio', error);
        const audioList = document.getElementById('audio-list');
        
        if (audioList) {
          audioList.innerHTML = '<div class="error-message">Erreur lors du chargement des enregistrements</div>';
        }
      }
    }
  };