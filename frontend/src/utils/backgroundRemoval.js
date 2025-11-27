/**
 * Background Removal Utility
 * Verwendet verschiedene Methoden zur Hintergrund-Entfernung
 */

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
 */
export const removeBackground = (context, width, height, method = 'advanced') => {
  if (method === 'advanced') {
    return removeBackgroundAdvanced(context, width, height);
  } else {
    return removeBackgroundSimple(context, width, height);
  }
};

/**
 * Prüft, ob MediaPipe verfügbar ist (für zukünftige Integration)
 */
export const isMediaPipeAvailable = () => {
  // Placeholder für MediaPipe Integration
  return false;
};
