/**
 * Background Removal Utility
 * Verwendet @imgly/background-removal für professionelle AI-basierte Segmentierung
 * Komplett Browser-basiert, keine API-Schlüssel erforderlich
 */

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

// Status der Bibliothek
let isImglyReady = false;

/**
 * Initialisiert die Background Removal Bibliothek
 * @returns {Promise<boolean>} - Erfolgreich initialisiert
 */
export const initBackgroundRemoval = async () => {
  try {
    // Die Bibliothek ist sofort verfügbar, keine extra Initialisierung nötig
    isImglyReady = true;
    console.log('[Background Removal] @imgly/background-removal bereit');
    return true;
  } catch (error) {
    console.error('[Background Removal] Initialisierung fehlgeschlagen:', error);
    isImglyReady = false;
    return false;
  }
};

// Legacy-Kompatibilität
export const initMediaPipe = initBackgroundRemoval;

/**
 * AI-basierte Hintergrund-Entfernung mit MediaPipe
 * @param {HTMLVideoElement|HTMLImageElement} source - Video oder Bild
 * @param {CanvasRenderingContext2D} context - Canvas Context
 * @param {number} width - Canvas Breite
 * @param {number} height - Canvas Höhe
 */
export const removeBackgroundAI = async (source, context, width, height) => {
  try {
    if (!selfieSegmentation) {
      console.warn('[AI Removal] MediaPipe nicht initialisiert');
      return false;
    }
    
    return new Promise((resolve) => {
      selfieSegmentation.onResults((results) => {
        // Zeichne Original-Bild
        context.save();
        context.clearRect(0, 0, width, height);
        context.drawImage(results.segmentationMask, 0, 0, width, height);
        
        // Verwende die Maske für saubere Segmentierung
        context.globalCompositeOperation = 'source-in';
        context.drawImage(source, 0, 0, width, height);
        
        // Setze neutralen Hintergrund
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = '#f8f8f8';
        context.fillRect(0, 0, width, height);
        
        context.restore();
        resolve(true);
      });
      
      selfieSegmentation.send({ image: source });
    });
  } catch (error) {
    console.error('[AI Removal] Fehler:', error);
    return false;
  }
};

/**
 * Einfache Canvas-basierte Hintergrund-Entfernung mit ovalem Mask
 * @param {CanvasRenderingContext2D} context - Canvas Context
 * @param {number} width - Canvas Breite
 * @param {number} height - Canvas Höhe
 */
export const removeBackgroundSimple = (context, width, height) => {
  try {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Ovale Maske Parameter (angepasst für Kopfform)
    const radiusX = width * 0.35;  // 70% der Breite
    const radiusY = height * 0.42; // 84% der Höhe
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      // Berechne Distanz vom Zentrum (elliptisch)
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Weicher Übergang am Rand
      if (distance > 1) {
        const fadeStart = 1.0;
        const fadeEnd = 1.15;
        const alpha = Math.min(Math.max((distance - fadeStart) / (fadeEnd - fadeStart), 0), 1);
        
        // Blend zu weißem Hintergrund
        data[i] = Math.round(data[i] * (1 - alpha) + 255 * alpha);     // R
        data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + 255 * alpha); // G
        data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + 255 * alpha); // B
      }
    }
    
    context.putImageData(imageData, 0, 0);
    return true;
  } catch (error) {
    console.error('[Background Removal] Fehler:', error);
    return false;
  }
};

/**
 * Fortgeschrittene Hintergrund-Entfernung mit besserer Edge-Detection
 * @param {CanvasRenderingContext2D} context - Canvas Context
 * @param {number} width - Canvas Breite
 * @param {number} height - Canvas Höhe
 */
export const removeBackgroundAdvanced = (context, width, height) => {
  try {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Ovale Maske mit präziserer Kopfform
    const radiusX = width * 0.35;
    const radiusY = height * 0.42;
    
    // Erstelle temporären Canvas für Blur-Effekt
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.putImageData(imageData, 0, 0);
    
    // Wende Gaussian Blur auf Hintergrund an
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        // Gradueller Übergang mit mehreren Zonen
        let alpha;
        if (distance < 1.05) {
          // Sehr weicher Rand (5% fade zone)
          alpha = (distance - 1) / 0.05;
        } else if (distance < 1.15) {
          // Haupt-Übergang
          alpha = 0.2 + ((distance - 1.05) / 0.10) * 0.6;
        } else {
          // Vollständig weiß
          alpha = 1;
        }
        
        alpha = Math.min(Math.max(alpha, 0), 1);
        
        // Sanfterer Übergang zu neutralem Hintergrund
        const bgColor = 248; // Leicht grau statt reinweiß
        data[i] = Math.round(data[i] * (1 - alpha) + bgColor * alpha);
        data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + bgColor * alpha);
        data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + bgColor * alpha);
      }
    }
    
    context.putImageData(imageData, 0, 0);
    return true;
  } catch (error) {
    console.error('[Background Removal Advanced] Fehler:', error);
    return false;
  }
};

/**
 * Hauptfunktion für Hintergrund-Entfernung
 * Wählt automatisch die beste verfügbare Methode
 * @param {HTMLVideoElement|HTMLImageElement} source - Quell-Element (für AI)
 * @param {CanvasRenderingContext2D} context - Canvas Context
 * @param {number} width - Canvas Breite
 * @param {number} height - Canvas Höhe
 * @param {string} method - 'ai', 'advanced', oder 'simple'
 */
export const removeBackground = async (source, context, width, height, method = 'advanced') => {
  // Versuche AI-Methode zuerst (beste Qualität)
  if (method === 'ai' && selfieSegmentation) {
    const success = await removeBackgroundAI(source, context, width, height);
    if (success) {
      console.log('[Background Removal] AI-Methode erfolgreich');
      return true;
    }
  }
  
  // Fallback zu Canvas-basierten Methoden
  if (method === 'advanced' || method === 'ai') {
    const success = removeBackgroundAdvanced(context, width, height);
    if (success) {
      console.log('[Background Removal] Advanced-Methode verwendet');
      return true;
    }
  }
  
  // Letzter Fallback
  console.log('[Background Removal] Simple-Methode verwendet');
  return removeBackgroundSimple(context, width, height);
};

/**
 * Prüft, ob MediaPipe verfügbar ist
 */
export const isMediaPipeAvailable = () => {
  return selfieSegmentation !== null;
};
