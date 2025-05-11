/**
 * Module d'enregistrement audio pour Missié Moustass Web
 * Gère l'enregistrement, la visualisation et le stockage des enregistrements
 */

let mediaRecorder; // Instance du MediaRecorder
let audioChunks = []; // Stockage des fragments audio
let audioBlob; // Blob final de l'enregistrement
let audioURL; // URL du blob pour la lecture
let audioStream; // Stream audio de l'utilisateur
let analyserNode; // Nœud d'analyse pour la visualisation
let visualizerCanvas; // Canvas pour la visualisation
let visualizerContext; // Contexte 2D du canvas
let timer; // Timer pour la durée d'enregistrement
let recordingDuration = 0; // Durée de l'enregistrement en secondes
let animationFrame; // ID de l'animation pour la visualisation

/**
 * Initialise l'interface d'enregistrement
 */
function initRecording() {
  // Éléments d'interface
  const recordButton = document.getElementById('record-button');
  const stopButton = document.getElementById('stop-button');
  const cancelButton = document.getElementById('cancel-recording');
  const saveButton = document.getElementById('save-recording');
  visualizerCanvas = document.getElementById('visualizer');
  
  // Configurer les boutons d'action
  if (recordButton) {
    recordButton.addEventListener('click', startRecording);
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopRecording);
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', cancelRecording);
  }
  
  if (saveButton) {
    saveButton.addEventListener('click', saveRecording);
  }
  
  // Initialiser le canvas de visualisation
  if (visualizerCanvas) {
    visualizerContext = visualizerCanvas.getContext('2d');
    
    // Adapter la taille du canvas à son conteneur
    const resizeVisualizer = () => {
      const container = visualizerCanvas.parentElement;
      visualizerCanvas.width = container.clientWidth;
      visualizerCanvas.height = container.clientHeight;
    };
    
    // Redimensionner au chargement et au redimensionnement de la fenêtre
    resizeVisualizer();
    window.addEventListener('resize', resizeVisualizer);
  }
}

/**
 * Démarre l'enregistrement audio
 */
async function startRecording() {
  try {
    // Demander l'accès au microphone
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Configurer le MediaRecorder
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: config.audio.mimeType,
      audioBitsPerSecond: config.audio.audioBitsPerSecond
    });
    
    // Configurer la visualisation
    setupAudioVisualizer(audioStream);
    
    // Gérer les données audio
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // Gérer la fin de l'enregistrement
    mediaRecorder.onstop = () => {
      // Créer le blob audio final
      audioBlob = new Blob(audioChunks, { type: config.audio.mimeType });
      audioURL = URL.createObjectURL(audioBlob);
      
      // Afficher l'interface de sauvegarde
      const recordingControls = document.querySelector('.recording-controls');
      const recordingSave = document.querySelector('.recording-save');
      
      if (recordingControls && recordingSave) {
        recordingControls.style.display = 'none';
        recordingSave.style.display = 'block';
      }
      
      // Arrêter la visualisation
      cancelAnimationFrame(animationFrame);
      
      // Arrêter le timer
      clearInterval(timer);
    };
    
    // Démarrer l'enregistrement
    audioChunks = [];
    mediaRecorder.start();
    
    // Mettre à jour l'interface
    const recordButton = document.getElementById('record-button');
    const stopButton = document.getElementById('stop-button');
    
    if (recordButton) recordButton.disabled = true;
    if (stopButton) stopButton.disabled = false;
    
    // Démarrer le timer
    startTimer();
    
    console.log('Enregistrement démarré');
  } catch (error) {
    console.error('Erreur lors du démarrage de l\'enregistrement:', error);
    alert('Impossible d\'accéder au microphone. Veuillez vérifier vos permissions.');
  }
}

/**
 * Arrête l'enregistrement en cours
 */
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    // Arrêter les flux audio
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    
    // Mettre à jour l'interface
    const recordButton = document.getElementById('record-button');
    const stopButton = document.getElementById('stop-button');
    
    if (recordButton) recordButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
    
    console.log('Enregistrement arrêté');
  }
}

/**
 * Annule l'enregistrement en cours
 */
function cancelRecording() {
  // Réinitialiser les données d'enregistrement
  audioChunks = [];
  if (audioURL) {
    URL.revokeObjectURL(audioURL);
    audioURL = null;
  }
  audioBlob = null;
  
  // Revenir à l'interface d'enregistrement
  const recordingControls = document.querySelector('.recording-controls');
  const recordingSave = document.querySelector('.recording-save');
  
  if (recordingControls && recordingSave) {
    recordingControls.style.display = 'flex';
    recordingSave.style.display = 'none';
  }
  
  // Réinitialiser le timer
  recordingDuration = 0;
  updateTimerDisplay();
  
  console.log('Enregistrement annulé');
}

/**
 * Sauvegarde l'enregistrement
 */
async function saveRecording() {
  try {
    // Récupérer les informations de l'enregistrement
    const titleInput = document.getElementById('recording-title');
    const descriptionInput = document.getElementById('recording-description');
    
    const title = titleInput ? titleInput.value : 'Enregistrement sans titre';
    const description = descriptionInput ? descriptionInput.value : '';
    
    if (!title.trim()) {
      alert('Veuillez donner un titre à votre enregistrement.');
      return;
    }
    
    // Préparer les données pour l'envoi
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('name', title);
    formData.append('description', description);
    formData.append('duration', recordingDuration);
    
    // Envoyer au serveur
    const token = localStorage.getItem(config.tokenKey);
    if (!token) {
      alert('Vous devez être connecté pour sauvegarder un enregistrement.');
      return;
    }
    
    const response = await fetch(`${config.apiUrl}/recordings/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde de l\'enregistrement');
    }
    
    const result = await response.json();
    
    // Afficher un message de succès
    alert('Enregistrement sauvegardé avec succès !');
    
    // Rediriger vers la page des enregistrements
    window.location.href = '/recordings';
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert('Une erreur est survenue lors de la sauvegarde de l\'enregistrement.');
  }
}

/**
 * Configure le visualiseur audio
 */
function setupAudioVisualizer(stream) {
  if (!visualizerCanvas || !visualizerContext) return;
  
  // Créer un contexte audio
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioSource = audioContext.createMediaStreamSource(stream);
  
  // Créer un nœud d'analyse
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  audioSource.connect(analyserNode);
  
  // Démarrer la visualisation
  visualize();
}

/**
 * Dessine la visualisation audio
 */
function visualize() {
  if (!analyserNode || !visualizerCanvas || !visualizerContext) return;
  
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Effacer le canvas
  visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
  
  // Fonction de dessin récursive
  const draw = () => {
    // Demander le prochain frame d'animation
    animationFrame = requestAnimationFrame(draw);
    
    // Obtenir les données de fréquence
    analyserNode.getByteFrequencyData(dataArray);
    
    // Effacer le canvas
    visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    
    // Dessiner les barres de visualisation
    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;
      
      visualizerContext.fillStyle = `rgb(${barHeight + 100}, ${barHeight + 50}, 155)`;
      visualizerContext.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  };
  
  draw();
}

/**
 * Démarre le timer d'enregistrement
 */
function startTimer() {
  // Réinitialiser la durée
  recordingDuration = 0;
  updateTimerDisplay();
  
  // Démarrer le timer
  timer = setInterval(() => {
    recordingDuration++;
    updateTimerDisplay();
  }, 1000);
}

/**
 * Met à jour l'affichage du timer
 */
function updateTimerDisplay() {
  const timerElement = document.querySelector('.timer');
  if (!timerElement) return;
  
  // Formater le temps (mm:ss)
  const minutes = Math.floor(recordingDuration / 60);
  const seconds = recordingDuration % 60;
  
  timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
} 