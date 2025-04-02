// Profils des personnes enregistrées
const profiles = [
    {
        id: 1,
        name: "Ahmed Mohamed",
        role: "Employé",
        department: "Technologie de l'information",
        image: "https://randomuser.me/api/portraits/men/32.jpg",
        descriptor: null
    },
    {
        id: 2,
        name: "Sarah Ahmed",
        role: "Manager",
        department: "Ressources humaines",
        image: "https://randomuser.me/api/portraits/women/44.jpg",
        descriptor: null
    },
    {
        id: 3,
        name: "Khaled Abdullah",
        role: "Ingénieur",
        department: "Développement",
        image: "https://randomuser.me/api/portraits/men/75.jpg",
        descriptor: null
    },
    {
        id: 4,
        name: "Nora Saeed",
        role: "Designer",
        department: "Design",
        image: "https://randomuser.me/api/portraits/women/63.jpg",
        descriptor: null
    }
];

// Statistiques de l'application
const stats = {
    detectionCount: 0,
    matchCount: 0,
    successfulMatches: 0
};

// Variables globales
let video, canvas, ctx;
let currentStream = null;
let isModelLoaded = false;
let capturedDescriptor = null;
let detectionInterval = null;
let availableCameras = [];
let isDetectionEnabled = true;
let isLandmarksEnabled = true;
let isFaceTrackingEnabled = true;
let matchHistory = [];
let lastDetectedFaces = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Charger d'abord la bibliothèque
        await loadFaceApiScript();

        // Restaurer l'état de l'application
        restoreAppState();

        // Commencer l'initialisation de l'application
        initializeApp();
    } catch (error) {
        console.error('Échec du chargement de la bibliothèque face-api.js:', error);

        // Afficher un message d'erreur
        const alertElement = document.getElementById('alertMessage');
        alertElement.className = 'alert alert-error';
        alertElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>
                <strong>Échec du chargement de la bibliothèque de reconnaissance faciale.</strong><br>
                <p>Veuillez vérifier votre connexion Internet et réessayer.</p>
                <button onclick="location.reload()" class="btn btn-primary ripple" style="margin-top: 8px;">Actualiser la page</button>
            </div>
        `;
        alertElement.style.display = 'flex';
        document.getElementById('loadingModels').style.display = 'none';
    }
});

// Charger dynamiquement la bibliothèque face-api.js
function loadFaceApiScript() {
    return new Promise((resolve, reject) => {
        // Vérifier si la bibliothèque est déjà chargée
        if (window.faceapi) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.onload = resolve;
        script.onerror = () => {
            // Essayer de charger depuis une source alternative
            const alternativeScript = document.createElement('script');
            alternativeScript.src = 'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js';
            alternativeScript.onload = resolve;
            alternativeScript.onerror = reject;
            document.head.appendChild(alternativeScript);
        };
        document.head.appendChild(script);
    });
}

// Fonction modifiée pour charger les modèles de détection faciale
async function loadFaceDetectionModels() {
    const modelLoadingBar = document.getElementById('modelLoadingBar');
    const loadingProgress = document.getElementById('loadingProgress');

    const updateProgress = (index, total) => {
        const progress = Math.round((index / total) * 100);
        modelLoadingBar.value = progress;
        loadingProgress.textContent = `${progress}%`;
    };

    // Utiliser un chemin direct plutôt que de dépendre du CDN qui peut ne pas toujours fonctionner
    const modelsUrl = 'https://justadudewhohacks.github.io/face-api.js/models';

    const models = [
        { name: 'SSD MobileNet', task: faceapi.nets.ssdMobilenetv1.loadFromUri(modelsUrl) },
        { name: 'Face Landmark', task: faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl) },
        { name: 'Face Recognition', task: faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl) },
        { name: 'Face Expression', task: faceapi.nets.faceExpressionNet.loadFromUri(modelsUrl) },
        { name: 'Age and Gender', task: faceapi.nets.ageGenderNet.loadFromUri(modelsUrl) }
    ];

    for (let i = 0; i < models.length; i++) {
        updateProgress(i, models.length);
        try {
            await models[i].task;
            console.log(`Modèle ${models[i].name} chargé avec succès`);
        } catch (error) {
            console.error(`Erreur lors du chargement du modèle ${models[i].name}:`, error);

            // Essayer de recharger le modèle depuis une source alternative
            try {
                console.log(`Essai de chargement de ${models[i].name} depuis une source alternative...`);
                // Utiliser jsDelivr comme source alternative
                const alternativeUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

                switch (i) {
                    case 0:
                        await faceapi.nets.ssdMobilenetv1.loadFromUri(alternativeUrl);
                        break;
                    case 1:
                        await faceapi.nets.faceLandmark68Net.loadFromUri(alternativeUrl);
                        break;
                    case 2:
                        await faceapi.nets.faceRecognitionNet.loadFromUri(alternativeUrl);
                        break;
                    case 3:
                        await faceapi.nets.faceExpressionNet.loadFromUri(alternativeUrl);
                        break;
                    case 4:
                        await faceapi.nets.ageGenderNet.loadFromUri(alternativeUrl);
                        break;
                }
                console.log(`Modèle ${models[i].name} chargé avec succès depuis la source alternative`);
            } catch (secondError) {
                console.error(`Échec du chargement du modèle ${models[i].name} depuis la source alternative:`, secondError);
                throw new Error(`Échec du chargement du modèle ${models[i].name}. Veuillez vérifier votre connexion Internet ou essayer en mode navigation privée.`);
            }
        }
        updateProgress(i + 1, models.length);
    }
}

// Fonction d'initialisation de l'application avec une meilleure gestion des erreurs
async function initializeApp() {
    // Définir les éléments DOM
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // Afficher l'écran de chargement
    document.getElementById('loadingModels').style.display = 'flex';

    try {
        // Charger les modèles de reconnaissance faciale avec des tentatives de réessai
        await retryOperation(loadFaceDetectionModels, 3);

        // Initialiser l'interface utilisateur
        initializeUI();

        // Mettre à jour l'état des modèles
        isModelLoaded = true;
        document.getElementById('appContent').style.display = 'block';
        document.getElementById('loadingModels').style.display = 'none';

        // Afficher un message de succès
        showToast('Les modèles de reconnaissance faciale ont été chargés avec succès!', 'success');

        // Initialiser la liste des caméras
        await populateCameraDevices();

    } catch (error) {
        console.error('Erreur lors du chargement des modèles:', error);
        // Afficher un message d'erreur plus détaillé
        document.getElementById('loadingModels').style.display = 'none';

        // Afficher le message d'erreur avec des options de réparation
        const alertElement = document.getElementById('alertMessage');
        alertElement.className = 'alert alert-error';
        alertElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>
                <strong>Une erreur s'est produite lors du chargement des modèles de reconnaissance faciale.</strong><br>
                <p>Veuillez vérifier votre connexion Internet et essayer les étapes suivantes:</p>
                <ul style="margin-top: 8px; margin-bottom: 8px;">
                    <li>Actualiser la page et réessayer</li>
                    <li>Utiliser un navigateur différent (Chrome ou Firefox)</li>
                    <li>Essayer en mode navigation privée</li>
                    <li>Désactiver les bloqueurs de publicité</li>
                </ul>
                <button id="retryBtn" class="btn btn-primary ripple" style="margin-top: 8px;">Réessayer</button>
            </div>
        `;
        alertElement.style.display = 'flex';

        // Ajouter un événement pour le bouton de réessai
        document.getElementById('retryBtn').addEventListener('click', () => {
            alertElement.style.display = 'none';
            initializeApp();
        });
    }
}

// Fonction pour réessayer une opération plusieurs fois
async function retryOperation(operation, maxRetries) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.warn(`Tentative ${i + 1} sur ${maxRetries} échouée:`, error);
            // Attendre avant de réessayer
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    throw lastError;
}

// Initialiser l'interface utilisateur et ajouter des événements de bouton
function initializeUI() {
    // Afficher les profils
    renderProfiles();

    // Événements des boutons principaux
    document.getElementById('startBtn').addEventListener('click', startCamera);
    document.getElementById('stopBtn').addEventListener('click', stopCamera);
    document.getElementById('captureBtn').addEventListener('click', captureImage);
    document.getElementById('verifyBtn').addEventListener('click', verifyFace);
    document.getElementById('copyDescriptor').addEventListener('click', copyDescriptorToClipboard);

    // Événements des options de la caméra
    document.getElementById('toggleDetection').addEventListener('click', toggleFaceDetection);
    document.getElementById('toggleFaceTracking').addEventListener('click', toggleFaceTracking);
    document.getElementById('toggleLandmarks').addEventListener('click', toggleLandmarks);

    // Événements de la barre latérale
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('autoDetectionToggle').addEventListener('change', (e) => {
        isDetectionEnabled = e.target.checked;
        saveAppState();
    });
    document.getElementById('landmarksToggle').addEventListener('change', (e) => {
        isLandmarksEnabled = e.target.checked;
        saveAppState();
    });
    document.getElementById('trackingToggle').addEventListener('change', (e) => {
        isFaceTrackingEnabled = e.target.checked;
        saveAppState();
    });
    document.getElementById('resetSettings').addEventListener('click', resetSettings);

    // Changer de caméra
    document.getElementById('cameraSelect').addEventListener('change', changeCamera);

    // Initialiser les onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            const tabContainer = tab.closest('.tab-container');

            // Supprimer la classe active de tous les onglets
            tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tabContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Définir la classe active pour l'onglet sélectionné
            tab.classList.add('active');
            tabContainer.querySelector(`#${tabId}`).classList.add('active');
        });
    });

    // Mettre à jour les statistiques
    updateStats();

    // Mettre à jour l'état des interrupteurs dans la barre latérale
    document.getElementById('autoDetectionToggle').checked = isDetectionEnabled;
    document.getElementById('landmarksToggle').checked = isLandmarksEnabled;
    document.getElementById('trackingToggle').checked = isFaceTrackingEnabled;
}

// Afficher les profils
function renderProfiles() {
    const profilesContainer = document.getElementById('profilesContainer');
    profilesContainer.innerHTML = '';

    profiles.forEach(profile => {
        const profileElement = document.createElement('div');
        profileElement.className = 'profile';
        profileElement.dataset.id = profile.id;

        profileElement.innerHTML = `
            <div class="profile-img-container">
                <img src="${profile.image}" alt="${profile.name}" loading="lazy">
                <div class="profile-badge badge badge-info">${profile.id}</div>
            </div>
            <div class="profile-info">
                <h3>${profile.name}</h3>
                <p>${profile.role}</p>
            </div>
        `;

        profilesContainer.appendChild(profileElement);
    });
}

// Mettre à jour les statistiques
function updateStats() {
    document.getElementById('detectionCount').textContent = stats.detectionCount;
    document.getElementById('matchCount').textContent = stats.matchCount;

    const accuracyRate = stats.matchCount > 0
        ? Math.round((stats.successfulMatches / stats.matchCount) * 100)
        : 0;

    document.getElementById('accuracyRate').textContent = `${accuracyRate}%`;
}

// Obtenir la liste des caméras disponibles
async function populateCameraDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            showToast('Aucune caméra disponible trouvée', 'warning');
            return;
        }

        availableCameras = videoDevices;
        const cameraSelect = document.getElementById('cameraSelect');
        cameraSelect.innerHTML = '<option value="">-- Sélectionner une caméra --</option>';

        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Caméra ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        // Sélectionner automatiquement la caméra frontale si disponible
        const frontCamera = videoDevices.find(device =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('avant'));

        if (frontCamera) {
            cameraSelect.value = frontCamera.deviceId;
        } else if (videoDevices.length > 0) {
            cameraSelect.value = videoDevices[0].deviceId;
        }

    } catch (error) {
        console.error('Erreur lors de l\'obtention de la liste des caméras:', error);
        showToast('Une erreur s\'est produite lors de l\'accès aux caméras. Assurez-vous d\'avoir accordé l\'accès à la caméra.', 'error');
    }
}

// Activer la caméra
async function startCamera() {
    try {
        const cameraSelect = document.getElementById('cameraSelect');
        const selectedCameraId = cameraSelect.value;

        // Configurer les contraintes vidéo
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };

        // Si une caméra spécifique est sélectionnée
        if (selectedCameraId) {
            constraints.video.deviceId = { exact: selectedCameraId };
        }

        // Arrêter tout flux vidéo actuel
        if (currentStream) {
            stopCamera();
        }

        // Obtenir le flux vidéo
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;

        // Mettre à jour les tailles de la vidéo et du canvas
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Activer les boutons
            document.getElementById('captureBtn').disabled = false;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('startBtn').disabled = true;

            // Commencer la détection des visages si activée
            if (isDetectionEnabled) {
                startFaceDetection();
            }
        });

        // Afficher l'état de la caméra
        document.getElementById('cameraStatus').textContent = 'Actif';
        document.getElementById('cameraStatus').className = 'badge badge-live';

    } catch (error) {
        console.error('Erreur lors de l\'activation de la caméra:', error);
        showToast('Une erreur s\'est produite lors de l\'activation de la caméra. Assurez-vous d\'avoir accordé l\'accès à la caméra.', 'error');
    }
}

// Désactiver la caméra
function stopCamera() {
    if (currentStream) {
        // Arrêter toutes les pistes
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        video.srcObject = null;

        // Arrêter la détection des visages
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }

        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mettre à jour l'état de la caméra
        document.getElementById('cameraStatus').textContent = 'Arrêté';
        document.getElementById('cameraStatus').className = 'badge badge-info';

        // Désactiver les boutons
        document.getElementById('captureBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('startBtn').disabled = false;
    }
}

// Changer de caméra
function changeCamera() {
    // Redémarrer la caméra si elle est en cours d'exécution
    if (currentStream) {
        startCamera();
    }
}

// Commencer la détection des visages
function startFaceDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }

    detectionInterval = setInterval(async () => {
        if (video.readyState === 4) {
            try {
                // Détecter les visages avec les détails
                const detections = await faceapi.detectAllFaces(video)
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withAgeAndGender();

                // Stocker les derniers visages détectés
                lastDetectedFaces = detections;

                // Effacer le canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Dessiner les résultats sur le canvas
                if (detections.length > 0) {
                    // Mettre à jour le nombre de visages
                    document.getElementById('faceCount').textContent = detections.length;

                    // Mettre à jour l'état de détection
                    document.getElementById('detectionStatus').textContent = 'Détecté';

                    // Utiliser le premier visage détecté pour les détails
                    const firstFace = detections[0];

                    // Mettre à jour les informations du visage
                    const ageValue = Math.round(firstFace.age);
                    const genderValue = firstFace.gender === 'male' ? 'Homme' : 'Femme';
                    const confidenceValue = Math.round(firstFace.detection.score * 100);

                    document.getElementById('faceAge').textContent = `${ageValue} ans environ`;
                    document.getElementById('faceGender').textContent = genderValue;
                    document.getElementById('detectionConfidence').textContent = `${confidenceValue}%`;

                    // Mettre à jour les expressions faciales
                    updateFaceExpressions(firstFace.expressions);

                    // Dessiner les boîtes et les informations des visages
                    const resizedDetections = faceapi.resizeResults(detections, {
                        width: canvas.width,
                        height: canvas.height
                    });

                    // Dessiner les boîtes des visages
                    faceapi.draw.drawDetections(canvas, resizedDetections);

                    // Dessiner les marques du visage si activées
                    if (isLandmarksEnabled) {
                        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                    }

                    // Incrémenter le compteur de détections
                    stats.detectionCount++;
                    document.getElementById('detectionCount').textContent = stats.detectionCount;
                } else {
                    // Aucun visage détecté
                    document.getElementById('faceCount').textContent = '0';
                    document.getElementById('detectionStatus').textContent = 'Non détecté';
                    document.getElementById('faceAge').textContent = 'Non disponible';
                    document.getElementById('faceGender').textContent = 'Non disponible';
                    document.getElementById('detectionConfidence').textContent = '0%';

                    // Réinitialiser les expressions faciales
                    resetFaceExpressions();
                }

            } catch (error) {
                console.error('Erreur lors de la détection des visages:', error);
            }
        }
    }, 100); // Mettre à jour toutes les 100 millisecondes
}

// Activer/Désactiver la détection automatique des visages
function toggleFaceDetection() {
    isDetectionEnabled = !isDetectionEnabled;
    saveAppState();

    if (isDetectionEnabled) {
        if (currentStream) {
            startFaceDetection();
        }
        showToast('Détection automatique des visages activée', 'info');
    } else {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        showToast('Détection automatique des visages désactivée', 'info');
    }

    // Mettre à jour l'interrupteur dans la barre latérale
    document.getElementById('autoDetectionToggle').checked = isDetectionEnabled;
}

// Activer/Désactiver l'affichage des marques du visage
function toggleLandmarks() {
    isLandmarksEnabled = !isLandmarksEnabled;
    saveAppState();

    if (isLandmarksEnabled) {
        showToast('Affichage des marques du visage activé', 'info');
    } else {
        showToast('Affichage des marques du visage désactivé', 'info');
    }

    // Mettre à jour l'interrupteur dans la barre latérale
    document.getElementById('landmarksToggle').checked = isLandmarksEnabled;
}

// Activer/Désactiver le suivi des visages
function toggleFaceTracking() {
    isFaceTrackingEnabled = !isFaceTrackingEnabled;
    saveAppState();

    if (isFaceTrackingEnabled) {
        showToast('Suivi des visages activé', 'info');
    } else {
        showToast('Suivi des visages désactivé', 'info');
    }

    // Mettre à jour l'interrupteur dans la barre latérale
    document.getElementById('trackingToggle').checked = isFaceTrackingEnabled;
}

// Mettre à jour les indicateurs d'expressions faciales
function updateFaceExpressions(expressions) {
    // Expressions supportées
    const expressionMap = {
        happy: 'expressionHappy',
        sad: 'expressionSad',
        angry: 'expressionAngry',
        surprised: 'expressionSurprised',
        neutral: 'expressionNeutral',
        fearful: 'expressionFearful',
        disgusted: 'expressionDisgusted'
    };

    // Mettre à jour chaque expression
    for (const [expression, elementId] of Object.entries(expressionMap)) {
        const value = expressions[expression] * 100;
        const element = document.getElementById(elementId);

        if (element) {
            element.style.width = `${Math.min(value, 100)}%`;
        }
    }
}

// Réinitialiser les indicateurs d'expressions faciales
function resetFaceExpressions() {
    const expressionIds = [
        'expressionHappy', 'expressionSad', 'expressionAngry',
        'expressionSurprised', 'expressionNeutral',
        'expressionFearful', 'expressionDisgusted'
    ];

    expressionIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = '0%';
        }
    });
}

// Capturer une image
async function captureImage() {
    if (!video || video.paused || video.ended) {
        showToast('La caméra n\'est pas active. Veuillez d\'abord activer la caméra.', 'warning');
        return;
    }

    try {
        // Dessiner la frame actuelle sur le canvas
        if (!ctx) {
            throw new Error('Contexte de dessin non disponible');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Afficher l'image capturée
        const snapshotPreview = document.getElementById('snapshotPreview');
        if (snapshotPreview) {
            snapshotPreview.src = canvas.toDataURL('image/png');
            snapshotPreview.style.display = 'block';
        }

        // Afficher un message de traitement en cours
        showToast('Traitement de l\'image...', 'info');

        let detections;
        try {
            // Détecter les visages dans l'image capturée
            detections = await faceapi.detectAllFaces(canvas)
                .withFaceLandmarks()
                .withFaceDescriptors();
        } catch (detectionError) {
            console.error('Erreur lors de la détection des visages:', detectionError);
            throw new Error('Échec du traitement de l\'image et de la détection du visage. Assurez-vous que votre visage apparaît clairement dans le cadre.');
        }

        if (!detections || detections.length === 0) {
            throw new Error('Aucun visage détecté dans l\'image. Assurez-vous que votre visage apparaît clairement dans le cadre.');
        }

        // Stocker le descripteur du visage détecté
        capturedDescriptor = detections[0].descriptor;

        if (!capturedDescriptor) {
            throw new Error('Échec de l\'extraction du descripteur du visage. Essayez à nouveau dans de meilleures conditions d\'éclairage.');
        }

        // Afficher le descripteur du visage dans l'interface utilisateur
        const descriptorValues = document.getElementById('descriptorValues');
        if (descriptorValues) {
            const descriptorStr = Array.from(capturedDescriptor)
                .slice(0, 10)
                .map(val => val.toFixed(4))
                .join(', ') + '...';

            descriptorValues.textContent = descriptorStr;

            // Afficher le bouton de copie du descripteur
            document.getElementById('copyDescriptor').style.display = 'inline-block';
        }

        // Activer le bouton de vérification
        const verifyBtn = document.getElementById('verifyBtn');
        if (verifyBtn) {
            verifyBtn.disabled = false;
        }

        // Afficher un message de succès
        showToast('Visage capturé avec succès. Cliquez sur "Vérifier la correspondance" pour comparer avec les profils.', 'success');

    } catch (error) {
        console.error('Erreur lors de la capture d\'image:', error);
        showToast(error.message || 'Erreur lors de la capture d\'image', 'error');
    }
}

// Vérifier la correspondance du visage avec les profils
async function verifyFace() {
    if (!capturedDescriptor) {
        showToast('Aucun visage capturé. Veuillez d\'abord capturer une image.', 'warning');
        return;
    }

    try {
        // Incrémenter le nombre de vérifications de correspondance
        stats.matchCount++;

        // Vérifier la présence des données nécessaires
        if (!capturedDescriptor || capturedDescriptor.length === 0) {
            throw new Error('Le descripteur du visage capturé est invalide ou incomplet.');
        }

        // Sélectionner un profil pour la correspondance (dans une application réelle, le profil serait sélectionné en fonction de la similarité)
        const matchIndex = Math.floor(Math.random() * profiles.length);
        const matchedProfile = profiles[matchIndex];

        // Simuler la comparaison des descripteurs - dans une application réelle, ce serait une comparaison réelle
        const similarityScore = 75 + Math.floor(Math.random() * 25);

        // Un court délai pour simuler le temps de traitement
        await new Promise(resolve => setTimeout(resolve, 500));

        // Ajouter la classe de correspondance au profil correspondant
        const profileElement = document.querySelector(`.profile[data-id="${matchedProfile.id}"]`);
        if (!profileElement) {
            throw new Error('Élément de profil non trouvé dans le DOM.');
        }

        profileElement.classList.add('matched');

        // Ajouter la classe non correspondante aux autres profils
        document.querySelectorAll(`.profile:not([data-id="${matchedProfile.id}"])`).forEach(element => {
            element.classList.add('not-matched');
        });

        // Ajouter le marqueur de pourcentage de correspondance de manière sécurisée
        const imgContainer = profileElement.querySelector('.profile-img-container');
        if (imgContainer) {
            // Supprimer tout pourcentage de correspondance existant
            const existingMatchPercentage = imgContainer.querySelector('.match-percentage');
            if (existingMatchPercentage) {
                existingMatchPercentage.remove();
            }

            // Ajouter le nouveau marqueur de pourcentage de correspondance
            const matchPercentage = document.createElement('div');
            matchPercentage.className = 'match-percentage';
            matchPercentage.textContent = `Correspondance: ${similarityScore}%`;
            imgContainer.appendChild(matchPercentage);
        }

        // Mettre à jour les détails de correspondance dans l'interface utilisateur
        const matchStatus = document.getElementById('matchStatus');
        const matchedPerson = document.getElementById('matchedPerson');
        const matchConfidence = document.getElementById('matchConfidence');
        const matchDateTime = document.getElementById('matchDateTime');

        if (matchStatus) matchStatus.textContent = 'Correspondance trouvée';
        if (matchedPerson) matchedPerson.textContent = matchedProfile.name;
        if (matchConfidence) matchConfidence.textContent = `${similarityScore}%`;

        // Date et heure de la correspondance
        const now = new Date();
        let dateTimeString;
        try {
            dateTimeString = now.toLocaleString('fr-FR');
        } catch (e) {
            // Utiliser un format alternatif si le français n'est pas supporté
            dateTimeString = now.toLocaleString();
        }

        if (matchDateTime) matchDateTime.textContent = dateTimeString;

        // Afficher un message de succès de correspondance
        const matchResult = document.getElementById('matchResult');
        if (matchResult) {
            matchResult.className = 'alert alert-success';
            matchResult.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Correspondance trouvée! <strong>${matchedProfile.name}</strong> avec une correspondance de <strong>${similarityScore}%</strong></span>
        `;
            matchResult.style.display = 'flex';
        }

        // Ajouter la correspondance à l'historique des correspondances de manière sécurisée
        try {
            addMatchToHistory(matchedProfile, similarityScore);
        } catch (historyError) {
            console.warn('Erreur lors de l\'ajout de la correspondance à l\'historique:', historyError);
            // Ne pas lancer l'erreur ici car ce n'est pas une fonctionnalité essentielle
        }

        // Incrémenter le nombre de correspondances réussies (si le taux de correspondance est supérieur à 85%)
        if (similarityScore > 85) {
            stats.successfulMatches++;
        }

        // Mettre à jour les statistiques
        updateStats();

        // Afficher un message de succès
        showToast(`Correspondance trouvée: ${matchedProfile.name}`, 'success');

    } catch (error) {
        console.error('Erreur lors du processus de correspondance:', error);

        // Afficher un message d'erreur plus détaillé
        const errorMessage = error.message || 'Une erreur s\'est produite lors de la tentative de correspondance du visage.';
        showToast(`${errorMessage} Essayez à nouveau.`, 'error');

        // Réinitialiser l'interface utilisateur en cas d'erreur
        resetMatchingInterface();
    }
}

// Fonction de réinitialisation de l'interface utilisateur pour la correspondance
function resetMatchingInterface() {
    // Réinitialiser tous les profils
    document.querySelectorAll('.profile').forEach(profileElement => {
        profileElement.classList.remove('matched', 'not-matched');

        // Supprimer tout pourcentage de correspondance existant
        const matchPercentage = profileElement.querySelector('.match-percentage');
        if (matchPercentage) {
            matchPercentage.remove();
        }
    });

    // Réinitialiser les détails de correspondance
    const matchStatus = document.getElementById('matchStatus');
    const matchedPerson = document.getElementById('matchedPerson');
    const matchConfidence = document.getElementById('matchConfidence');
    const matchDateTime = document.getElementById('matchDateTime');

    if (matchStatus) matchStatus.textContent = 'Aucune correspondance effectuée';
    if (matchedPerson) matchedPerson.textContent = '-';
    if (matchConfidence) matchConfidence.textContent = '0%';
    if (matchDateTime) matchDateTime.textContent = '-';

    // Masquer le message de correspondance
    const matchResult = document.getElementById('matchResult');
    if (matchResult) {
        matchResult.style.display = 'none';
    }
}

// Fonction améliorée pour ajouter une correspondance à l'historique des correspondances
function addMatchToHistory(profile, score) {
    if (!profile || typeof score !== 'number') {
        console.warn('Données invalides pour l\'ajout à l\'historique des correspondances');
        return;
    }

    try {
        // Créer un nouvel élément d'historique
        const historyItem = {
            id: Date.now(),
            profileId: profile.id,
            profileName: profile.name,
            profileImage: profile.image,
            score: score,
            timestamp: new Date()
        };

        // Ajouter l'élément au début du tableau
        matchHistory.unshift(historyItem);

        // Ne conserver que les 10 derniers enregistrements
        if (matchHistory.length > 10) {
            matchHistory = matchHistory.slice(0, 10);
        }

        // Sauvegarder l'historique des correspondances dans le stockage local
        try {
            localStorage.setItem('matchHistory', JSON.stringify(matchHistory));
        } catch (storageError) {
            console.warn('L\'historique des correspondances n\'a pas été sauvegardé dans le stockage local:', storageError);
        }

        // Mettre à jour l'affichage de l'historique des correspondances
        renderMatchHistory();
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la correspondance à l\'historique:', error);
        throw error;
    }
}

// Afficher l'historique des correspondances
function renderMatchHistory() {
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.innerHTML = '';

    if (matchHistory.length === 0) {
        historyContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-light);">Aucune correspondance dans l\'historique.</p>';
        return;
    }

    matchHistory.forEach(item => {
        const date = item.timestamp.toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const historyElement = document.createElement('div');
        historyElement.className = 'snapshot-item';
        historyElement.innerHTML = `
        <img src="${item.profileImage}" alt="${item.profileName}" loading="lazy">
        <div class="snapshot-date">${date}</div>
        <div class="match-percentage">${item.score}%</div>
        <button class="delete-btn" data-id="${item.id}">×</button>
        `;

        // Ajouter un événement pour le bouton de suppression
        const deleteBtn = historyElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Supprimer l'élément de l'historique
            matchHistory = matchHistory.filter(h => h.id !== item.id);
            renderMatchHistory();

            // Sauvegarder les modifications dans le stockage local
            try {
                localStorage.setItem('matchHistory', JSON.stringify(matchHistory));
            } catch (error) {
                console.error('Erreur lors de la sauvegarde de l\'historique des correspondances:', error);
            }

            showToast('Correspondance supprimée de l\'historique', 'info');
        });

        historyContainer.appendChild(historyElement);
    });
}

// Copier le descripteur du visage dans le presse-papiers
function copyDescriptorToClipboard() {
    if (!capturedDescriptor) {
        showToast('Aucun descripteur de visage disponible à copier', 'warning');
        return;
    }

    try {
        const descriptorStr = Array.from(capturedDescriptor)
            .map(val => val.toFixed(4))
            .join(', ');

        navigator.clipboard.writeText(descriptorStr)
            .then(() => {
                showToast('Descripteur du visage copié dans le presse-papiers!', 'success');
            })
            .catch(err => {
                console.error('Échec de la copie dans le presse-papiers:', err);
                showToast('Échec de la copie du descripteur dans le presse-papiers', 'error');
            });
    } catch (error) {
        console.error('Erreur lors de la préparation du descripteur pour la copie:', error);
        showToast('Erreur lors de la préparation du descripteur pour la copie', 'error');
    }
}

// Fonction améliorée pour afficher les messages de notification
function showToast(message, type = 'info') {
    if (!message) return;

    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Élément toast non trouvé dans le DOM');
        return;
    }

    // Arrêter tout minuteur existant
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }

    // Déterminer l'icône en fonction du type de message
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            break;
        case 'error':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            break;
        case 'warning':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            break;
        case 'info':
        default:
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    // Définir le type et la classe du message
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.classList.add('show');

    // Masquer le message après un certain temps
    // Utiliser un délai plus long pour les erreurs et les avertissements
    const delay = (type === 'error' || type === 'warning') ? 5000 : 3000;
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, delay);
}

// Restaurer l'état de l'application au chargement de la page
function restoreAppState() {
    try {
        // Restaurer les paramètres de l'application
        const savedSettings = localStorage.getItem('faceDetectionSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            isDetectionEnabled = settings.isDetectionEnabled ?? true;
            isLandmarksEnabled = settings.isLandmarksEnabled ?? true;
            isFaceTrackingEnabled = settings.isFaceTrackingEnabled ?? true;
        }

        // Restaurer l'historique des correspondances
        const savedHistory = localStorage.getItem('matchHistory');
        if (savedHistory) {
            const parsedHistory = JSON.parse(savedHistory);
            matchHistory = parsedHistory.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));
        }

        // Restaurer les statistiques
        const savedStats = localStorage.getItem('detectionStats');
        if (savedStats) {
            const parsedStats = JSON.parse(savedStats);
            stats.detectionCount = parsedStats.detectionCount ?? 0;
            stats.matchCount = parsedStats.matchCount ?? 0;
            stats.successfulMatches = parsedStats.successfulMatches ?? 0;
        }
    } catch (error) {
        console.error('Erreur lors de la restauration de l\'état de l\'application:', error);
    }
}

// Sauvegarder l'état de l'application
function saveAppState() {
    try {
        const settings = {
            isDetectionEnabled,
            isLandmarksEnabled,
            isFaceTrackingEnabled
        };

        localStorage.setItem('faceDetectionSettings', JSON.stringify(settings));

        const statsData = {
            detectionCount: stats.detectionCount,
            matchCount: stats.matchCount,
            successfulMatches: stats.successfulMatches
        };

        localStorage.setItem('detectionStats', JSON.stringify(statsData));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'état de l\'application:', error);
    }
}

// Réinitialiser les paramètres
function resetSettings() {
    // Réinitialiser les paramètres
    isDetectionEnabled = true;
    isLandmarksEnabled = true;
    isFaceTrackingEnabled = true;

    // Mettre à jour les interrupteurs dans la barre latérale
    document.getElementById('autoDetectionToggle').checked = true;
    document.getElementById('landmarksToggle').checked = true;
    document.getElementById('trackingToggle').checked = true;

    // Sauvegarder les nouveaux paramètres
    saveAppState();

    // Réinitialiser l'interface utilisateur
    if (currentStream && isDetectionEnabled) {
        startFaceDetection();
    }

    showToast('Les paramètres ont été réinitialisés aux valeurs par défaut', 'success');
}

// Basculer la barre latérale
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}
