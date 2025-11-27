/**
 * Face Mesh Utility mit MediaPipe
 * 468 Landmarks + Iris Tracking für präzise Gesichtserkennung
 */

let faceMesh = null;
let isInitialized = false;

// Iris Landmark Indices
const LEFT_IRIS = [474, 475, 476, 477, 478];
const RIGHT_IRIS = [469, 470, 471, 472, 473];

// Face Oval Indices (für Bounding Box)
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

/**
 * Initialisiert MediaPipe Face Mesh
 * @returns {Promise<boolean>}
 */
export const initFaceMesh = async () => {
  try {
    if (isInitialized && faceMesh) {
      return true;
    }

    if (!window.FaceMesh) {
      console.warn('[Face Mesh] MediaPipe nicht verfügbar');
      return false;
    }

    faceMesh = new window.FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // Aktiviert Iris-Tracking!
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    isInitialized = true;
    console.log('[Face Mesh] Initialisiert (468 Landmarks + Iris)');
    return true;
  } catch (error) {
    console.error('[Face Mesh] Initialisierung fehlgeschlagen:', error);
    return false;
  }
};

/**
 * Berechnet Bounding Box aus Face Oval Landmarks
 */
const calculateBoundingBox = (landmarks) => {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  
  FACE_OVAL.forEach(idx => {
    const landmark = landmarks[idx];
    if (landmark) {
      minX = Math.min(minX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxX = Math.max(maxX, landmark.x);
      maxY = Math.max(maxY, landmark.y);
    }
  });
  
  return {
    xCenter: (minX + maxX) / 2,
    yCenter: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY
  };
};

/**
 * Analysiert Blickrichtung basierend auf Iris-Position
 */
const analyzeGazeDirection = (landmarks) => {
  try {
    // Linkes Auge - Iris Center
    const leftIrisCenter = landmarks[LEFT_IRIS[0]];
    const leftEyeLeft = landmarks[33]; // Äußerer Augenwinkel
    const leftEyeRight = landmarks[133]; // Innerer Augenwinkel
    
    // Rechtes Auge - Iris Center
    const rightIrisCenter = landmarks[RIGHT_IRIS[0]];
    const rightEyeLeft = landmarks[362]; // Innerer Augenwinkel
    const rightEyeRight = landmarks[263]; // Äußerer Augenwinkel
    
    // Berechne relative Position der Iris im Auge (0 = links, 0.5 = center, 1 = rechts)
    const leftIrisRelativeX = (leftIrisCenter.x - leftEyeLeft.x) / (leftEyeRight.x - leftEyeLeft.x);
    const rightIrisRelativeX = (rightIrisCenter.x - rightEyeLeft.x) / (rightEyeRight.x - rightEyeLeft.x);
    
    // Durchschnitt beider Augen
    const gazeX = (leftIrisRelativeX + rightIrisRelativeX) / 2;
    
    // Klassifizierung
    let gazeDirection = 'center';
    let lookingAtCamera = true;
    
    if (gazeX < 0.35) {
      gazeDirection = 'left';
      lookingAtCamera = false;
    } else if (gazeX > 0.65) {
      gazeDirection = 'right';
      lookingAtCamera = false;
    } else if (gazeX >= 0.4 && gazeX <= 0.6) {
      gazeDirection = 'center';
      lookingAtCamera = true;
    }
    
    return {
      gazeDirection,
      lookingAtCamera,
      gazeScore: gazeX, // 0-1
      leftIrisX: leftIrisRelativeX,
      rightIrisX: rightIrisRelativeX
    };
  } catch (error) {
    console.error('[Gaze Analysis] Fehler:', error);
    return {
      gazeDirection: 'unknown',
      lookingAtCamera: true, // Default
      gazeScore: 0.5
    };
  }
};

/**
 * Analysiert Gesichtsposition und -größe (wie bei Face Detection)
 */
const analyzeFacePosition = (landmarks) => {
  const bbox = calculateBoundingBox(landmarks);
  const faceSize = (bbox.width + bbox.height) / 2;
  
  let position = 'perfect';
  let optimalZoom = 1.2;
  
  if (faceSize < 0.25) {
    position = 'too-far';
    optimalZoom = 1.4;
  } else if (faceSize > 0.55) {
    position = 'too-close';
    optimalZoom = 1.1;
  } else if (faceSize >= 0.35 && faceSize <= 0.45) {
    position = 'perfect';
    optimalZoom = 1.2;
  } else {
    position = faceSize < 0.35 ? 'too-far' : 'too-close';
    optimalZoom = faceSize < 0.35 ? 1.3 : 1.15;
  }
  
  const isWellCentered = (
    bbox.xCenter > 0.3 && bbox.xCenter < 0.7 &&
    bbox.yCenter > 0.25 && bbox.yCenter < 0.65
  );
  
  if (!isWellCentered && position === 'perfect') {
    position = 'outside';
  }
  
  return {
    position,
    faceSize,
    centerX: bbox.xCenter,
    centerY: bbox.yCenter,
    optimalZoom,
    isWellCentered,
    boundingBox: bbox
  };
};

/**
 * Erkennt Gesicht in Video-Frame mit Face Mesh
 */
export const detectFaceInVideo = async (video, callback) => {
  if (!faceMesh || !isInitialized) {
    console.warn('[Face Mesh] Nicht initialisiert');
    return false;
  }

  try {
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Analysiere Position
        const positionAnalysis = analyzeFacePosition(landmarks);
        
        // Analysiere Blickrichtung
        const gazeAnalysis = analyzeGazeDirection(landmarks);
        
        callback({
          detected: true,
          ...positionAnalysis,
          ...gazeAnalysis,
          landmarks: landmarks, // Alle 468 Punkte
          confidence: 1.0, // Face Mesh hat immer hohe Confidence wenn erkannt
          rawDetection: {
            boundingBox: positionAnalysis.boundingBox,
            landmarks: landmarks
          }
        });
      } else {
        callback({
          detected: false,
          position: 'outside',
          faceSize: 0,
          centerX: 0,
          centerY: 0,
          optimalZoom: 1.2,
          confidence: 0,
          isWellCentered: false,
          lookingAtCamera: false,
          gazeDirection: 'unknown'
        });
      }
    });

    await faceMesh.send({ image: video });
    return true;
  } catch (error) {
    console.error('[Face Mesh] Fehler beim Erkennen:', error);
    return false;
  }
};

/**
 * Prüft ob Face Mesh bereit ist
 */
export const isFaceMeshReady = () => {
  return isInitialized && faceMesh !== null;
};

/**
 * Zeichnet Face Mesh auf Canvas (468 Landmarks)
 */
export const drawFaceMesh = (ctx, landmarks, width, height, options = {}) => {
  const {
    showAllLandmarks = false,
    showIris = true,
    showFaceOval = true,
    color = '#22c55e'
  } = options;
  
  if (!landmarks) return;
  
  // Zeichne Face Oval
  if (showFaceOval) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    FACE_OVAL.forEach((idx, i) => {
      const point = landmarks[idx];
      const x = point.x * width;
      const y = point.y * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }
  
  // Zeichne Iris
  if (showIris) {
    ctx.fillStyle = color;
    
    // Linkes Auge Iris
    LEFT_IRIS.forEach(idx => {
      const point = landmarks[idx];
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Rechtes Auge Iris
    RIGHT_IRIS.forEach(idx => {
      const point = landmarks[idx];
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  // Zeichne alle Landmarks (optional, für Debug)
  if (showAllLandmarks) {
    ctx.fillStyle = color;
    landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
};

/**
 * Export für Kompatibilität mit alter Face Detection API
 */
export { initFaceMesh as initFaceDetection };
export { isFaceMeshReady as isFaceDetectionReady };
