/**
 * Face Detection Utility mit MediaPipe
 * Echte Gesichtserkennung für Position-Detection und Auto-Zoom
 */

let faceDetection = null;
let isInitialized = false;

/**
 * Initialisiert MediaPipe Face Detection
 * @returns {Promise<boolean>}
 */
export const initFaceDetection = async () => {
  try {
    if (isInitialized && faceDetection) {
      return true;
    }

    if (!window.FaceDetection) {
      console.warn('[Face Detection] MediaPipe nicht verfügbar');
      return false;
    }

    faceDetection = new window.FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });

    faceDetection.setOptions({
      model: 'short', // 'short' für < 2m Distanz, 'full' für längere Distanz
      minDetectionConfidence: 0.5,
    });

    isInitialized = true;
    console.log('[Face Detection] Initialisiert');
    return true;
  } catch (error) {
    console.error('[Face Detection] Initialisierung fehlgeschlagen:', error);
    return false;
  }
};

/**
 * Analysiert Gesichtsposition und -größe
 * @param {object} detection - MediaPipe Detection Result
 * @returns {object} - Position-Info
 */
const analyzeFacePosition = (detection) => {
  if (!detection || !detection.boundingBox) {
    return {
      position: 'outside',
      faceSize: 0,
      centerX: 0,
      centerY: 0,
      confidence: 0
    };
  }

  const bbox = detection.boundingBox;
  
  // Berechne Gesichtsgröße relativ zum Frame (0-1)
  const faceWidth = bbox.width;
  const faceHeight = bbox.height;
  const faceSize = (faceWidth + faceHeight) / 2; // Durchschnitt
  
  // Berechne Center-Position
  const centerX = bbox.xCenter;
  const centerY = bbox.yCenter;
  
  // Bestimme Position basierend auf Gesichtsgröße
  let position = 'perfect';
  let optimalZoom = 1.2;
  
  if (faceSize < 0.25) {
    // Zu klein = zu weit weg
    position = 'too-far';
    optimalZoom = 1.4;
  } else if (faceSize > 0.55) {
    // Zu groß = zu nah
    position = 'too-close';
    optimalZoom = 1.1;
  } else if (faceSize >= 0.35 && faceSize <= 0.45) {
    // Ideal
    position = 'perfect';
    optimalZoom = 1.2;
  } else {
    // Akzeptabel, aber nicht perfekt
    position = faceSize < 0.35 ? 'too-far' : 'too-close';
    optimalZoom = faceSize < 0.35 ? 1.3 : 1.15;
  }

  // Prüfe ob Gesicht zentriert ist (wichtig für ovalen Rahmen)
  const isWellCentered = (
    centerX > 0.3 && centerX < 0.7 &&
    centerY > 0.25 && centerY < 0.65
  );

  if (!isWellCentered && position === 'perfect') {
    position = 'outside'; // Nicht gut zentriert
  }

  return {
    position,
    faceSize,
    centerX,
    centerY,
    optimalZoom,
    confidence: detection.score || 0,
    isWellCentered
  };
};

/**
 * Erkennt Gesicht in Video-Frame
 * @param {HTMLVideoElement} video - Video Element
 * @param {function} callback - Callback mit Ergebnis
 */
export const detectFaceInVideo = async (video, callback) => {
  if (!faceDetection || !isInitialized) {
    console.warn('[Face Detection] Nicht initialisiert');
    return false;
  }

  try {
    faceDetection.onResults((results) => {
      if (results.detections && results.detections.length > 0) {
        // Nehme das erste erkannte Gesicht
        const detection = results.detections[0];
        const analysis = analyzeFacePosition(detection);
        
        callback({
          detected: true,
          ...analysis,
          rawDetection: detection
        });
      } else {
        // Kein Gesicht erkannt
        callback({
          detected: false,
          position: 'outside',
          faceSize: 0,
          centerX: 0,
          centerY: 0,
          optimalZoom: 1.2,
          confidence: 0,
          isWellCentered: false
        });
      }
    });

    await faceDetection.send({ image: video });
    return true;
  } catch (error) {
    console.error('[Face Detection] Fehler beim Erkennen:', error);
    return false;
  }
};

/**
 * Prüft ob Face Detection bereit ist
 */
export const isFaceDetectionReady = () => {
  return isInitialized && faceDetection !== null;
};

/**
 * Berechnet optimalen Zoom basierend auf Gesichtsgröße
 * @param {number} faceSize - Gesichtsgröße (0-1)
 * @returns {number} - Optimaler Zoom-Level
 */
export const calculateOptimalZoom = (faceSize) => {
  if (faceSize < 0.25) return 1.4;  // Zu weit
  if (faceSize < 0.35) return 1.3;  // Etwas zu weit
  if (faceSize > 0.55) return 1.1;  // Zu nah
  if (faceSize > 0.45) return 1.15; // Etwas zu nah
  return 1.2; // Perfect
};

/**
 * Hilfsfunktion: Zeichnet Bounding Box auf Canvas (Debug)
 * @param {CanvasRenderingContext2D} ctx - Canvas Context
 * @param {object} detection - Detection Result
 * @param {number} width - Canvas Width
 * @param {number} height - Canvas Height
 */
export const drawFaceDetection = (ctx, detection, width, height) => {
  if (!detection || !detection.boundingBox) return;

  const bbox = detection.boundingBox;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.strokeRect(
    bbox.xCenter * width - (bbox.width * width) / 2,
    bbox.yCenter * height - (bbox.height * height) / 2,
    bbox.width * width,
    bbox.height * height
  );

  // Zeichne Keypoints (wenn verfügbar)
  if (detection.landmarks) {
    ctx.fillStyle = '#00ff00';
    detection.landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
};
