/**
 * Application principale Missié Moustass Web
 */
class App {
  constructor() {
    // Initialisation des événements
    this.setupEventListeners();
    
    // Initialiser les dimensions des canvas pour les visualisations
    this.initCanvasDimensions();
    
    // Créer les dossiers requis pour le stockage des uploads
    window.addEventListener('resize', this.initCanvasDimensions.bind(this));
  }
  
  /**
   * Récupère un élément DOM ou null s'il n'existe pas
   * @param {string} id - ID de l'élément à récupérer
   * @returns {Element|null} - Élément DOM ou null
   */
  getElement(id) {
    return document.getElementById(id);
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Navigation entre sections
    const newRecordingBtn = this.getElement('new-recording-btn');
    if (newRecordingBtn) {
      newRecordingBtn.addEventListener('click', this.showRecorderSection.bind(this));
    }
    
    const emptyNewRecordingBtn = this.getElement('empty-new-recording-btn');
    if (emptyNewRecordingBtn) {
      emptyNewRecordingBtn.addEventListener('click', this.showRecorderSection.bind(this));
    }
    
    const backToRecordingsBtn = this.getElement('back-to-recordings');
    if (backToRecordingsBtn) {
      backToRecordingsBtn.addEventListener('click', this.showRecordingsSection.bind(this));
    }
    
    const backFromPlayerBtn = this.getElement('back-from-player');
    if (backFromPlayerBtn) {
      backFromPlayerBtn.addEventListener('click', this.showRecordingsSection.bind(this));
    }
    
    // Bouton d'enregistrement dans la section hero
    const startRecording = this.getElement('start-recording');
    if (startRecording) {
      startRecording.addEventListener('click', this.showRecorderSection.bind(this));
    }
  }
  
  /**
   * Initialise les dimensions des canvas pour les visualisations
   */
  initCanvasDimensions() {
    const audioVisualizer = this.getElement('audio-visualizer');
    const playerVisualizer = this.getElement('player-visualizer');
    
    if (audioVisualizer) {
      const visualizerContainer = audioVisualizer.parentElement;
      audioVisualizer.width = visualizerContainer.clientWidth;
      audioVisualizer.height = visualizerContainer.clientHeight;
    }
    
    if (playerVisualizer) {
      const playerContainer = playerVisualizer.parentElement;
      playerVisualizer.width = playerContainer.clientWidth;
      playerVisualizer.height = playerContainer.clientHeight;
    }
  }
  
  /**
   * Affiche la section d'enregistrement
   */
  showRecorderSection() {
    const recordingsSection = this.getElement('recordings-section');
    const playerSection = this.getElement('player-section');
    const recorderSection = this.getElement('recorder-section');
    
    if (recordingsSection) recordingsSection.classList.add('hidden');
    if (playerSection) playerSection.classList.add('hidden');
    if (recorderSection) recorderSection.classList.remove('hidden');
    
    // Réinitialiser l'enregistreur au cas où
    if (typeof audioManager !== 'undefined') {
      audioManager.cancelRecording();
    }
  }
  
  /**
   * Affiche la section des enregistrements
   */
  showRecordingsSection() {
    const recorderSection = this.getElement('recorder-section');
    const playerSection = this.getElement('player-section');
    const recordingsSection = this.getElement('recordings-section');
    
    if (recorderSection) recorderSection.classList.add('hidden');
    if (playerSection) playerSection.classList.add('hidden');
    if (recordingsSection) recordingsSection.classList.remove('hidden');
  }
  
  /**
   * Affiche la section de lecture
   * @param {number} recordingId - ID de l'enregistrement à lire
   * @param {string} recordingName - Nom de l'enregistrement
   */
  showPlayerSection(recordingId, recordingName) {
    const recorderSection = this.getElement('recorder-section');
    const recordingsSection = this.getElement('recordings-section');
    const playerSection = this.getElement('player-section');
    
    if (recorderSection) recorderSection.classList.add('hidden');
    if (recordingsSection) recordingsSection.classList.add('hidden');
    if (playerSection) playerSection.classList.remove('hidden');
    
    // Charger l'enregistrement
    if (typeof audioManager !== 'undefined') {
      audioManager.loadRecording(recordingId, recordingName);
    }
  }
  
  /**
   * Charge et affiche la liste des enregistrements
   */
  async loadRecordings() {
    const recordingsContainer = this.getElement('recordings-container');
    if (!recordingsContainer) return;
    
    try {
      const response = await api.get('/recordings');
      
      // Vider le conteneur
      recordingsContainer.innerHTML = '';
      
      // Vérifier s'il y a des enregistrements
      if (!response.recordings || response.recordings.length === 0) {
        recordingsContainer.innerHTML = `
          <div class="empty-state">
            <p>Aucun enregistrement pour le moment</p>
            <button id="empty-new-recording-btn" class="btn btn-outline">
              Créer votre premier enregistrement
            </button>
          </div>
        `;
        
        // Réattacher l'événement
        const emptyNewRecordingBtn = this.getElement('empty-new-recording-btn');
        if (emptyNewRecordingBtn) {
          emptyNewRecordingBtn.addEventListener('click', this.showRecorderSection.bind(this));
        }
        
            return;
      }
      
      // Afficher les enregistrements
      response.recordings.forEach(recording => {
        const card = this.createRecordingCard(recording);
        recordingsContainer.appendChild(card);
      });
    } catch (error) {
      console.error('Erreur lors du chargement des enregistrements:', error);
      utils.showNotification('Erreur lors du chargement des enregistrements', 'error');
    }
  }
  
  /**
   * Crée une carte pour un enregistrement
   * @param {Object} recording - Données de l'enregistrement
   * @returns {HTMLElement} - Élément de carte
   */
  createRecordingCard(recording) {
    const card = document.createElement('div');
    card.className = 'recording-card';
    card.dataset.id = recording.id;
    
    // Formater la date et la durée
    const formattedDate = typeof utils !== 'undefined' && utils.formatDate 
      ? utils.formatDate(recording.timestamp) 
      : new Date(recording.timestamp).toLocaleDateString();
      
    const formattedDuration = typeof utils !== 'undefined' && utils.formatDuration 
      ? utils.formatDuration(recording.duration) 
      : `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}`;
    
    // Fonction d'échappement HTML sécurisée
    const escapeHTML = (str) => {
      if (typeof utils !== 'undefined' && utils.escapeHTML) {
        return utils.escapeHTML(str);
      }
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    // Contenu de la carte
    card.innerHTML = `
      <div class="recording-title">${escapeHTML(recording.name)}</div>
      <div class="recording-meta">
        <span class="recording-date">${formattedDate}</span>
        <span class="recording-duration">${formattedDuration}</span>
      </div>
      <div class="recording-type ${recording.type}">${recording.type === 'owned' ? 'Personnel' : 'Partagé'}</div>
    `;
    
    // Événement de clic pour ouvrir l'enregistrement
    card.addEventListener('click', () => {
      this.showPlayerSection(recording.id, recording.name);
    });
    
    return card;
  }
}

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
  // Créer l'application
  window.app = new App();
  
  // Vérifier l'authentification et charger les enregistrements si l'utilisateur est connecté
  if (localStorage.getItem(config.tokenKey)) {
    app.loadRecordings();
  }
  });