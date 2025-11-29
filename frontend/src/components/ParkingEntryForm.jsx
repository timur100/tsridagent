import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Camera, LogIn, LogOut, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';

const ParkingEntryForm = ({ videoRef, onEntrySuccess }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  
  const [formData, setFormData] = useState({
    license_plate: '',
    type: 'entry', // 'entry' or 'exit'
    location: '',
    notes: ''
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedPlate, setRecognizedPlate] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const result = await apiCall('/api/tenant-locations');
      if (result.success) {
        setLocations(result.data.locations || []);
        // Set first location as default
        if (result.data.locations && result.data.locations.length > 0) {
          setFormData(prev => ({ ...prev, location: result.data.locations[0].location_id }));
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) {
      toast.error('Kamera nicht verfügbar');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!canvas) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    
    const ctx = canvas.getContext('2d');
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Add overlay with timestamp and info
    const now = new Date();
    const timestamp = now.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const locationName = locations.find(l => l.location_id === formData.location)?.name || 'Unbekannt';
    
    // Overlay background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, 200);
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    
    // Top overlay - Camera info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('📹 CAM-01', 30, 60);
    
    ctx.font = '32px Arial';
    ctx.fillText(`Standort: ${locationName}`, 30, 110);
    ctx.fillText(`Datum: ${timestamp}`, 30, 160);
    
    // Bottom overlay - License plate and status
    if (formData.license_plate) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.fillText(`KFZ: ${formData.license_plate.toUpperCase()}`, 30, canvas.height - 90);
    }
    
    ctx.font = 'bold 40px Arial';
    if (formData.type === 'entry') {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('✓ EINFAHRT', 30, canvas.height - 30);
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillText('⚠ AUSFAHRT', 30, canvas.height - 30);
    }
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCapture = () => {
    const imageData = captureFrame();
    if (imageData) {
      setCapturedImage(imageData);
      toast.success('Bild erfasst');
    }
  };

  const preprocessImage = (imageData) => {
    // Create a temporary canvas for image preprocessing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const img = new Image();
    img.src = imageData;
    
    return new Promise((resolve) => {
      img.onload = () => {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        // Draw original image
        tempCtx.drawImage(img, 0, 0);
        
        // Get image data
        const imageDataObj = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageDataObj.data;
        
        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Increase contrast (simple threshold)
          const threshold = 128;
          const value = gray > threshold ? 255 : 0;
          
          data[i] = value;     // Red
          data[i + 1] = value; // Green
          data[i + 2] = value; // Blue
        }
        
        tempCtx.putImageData(imageDataObj, 0, 0);
        
        // Return processed image
        resolve(tempCanvas.toDataURL('image/png'));
      };
    });
  };

  const performOCR = async (imageData) => {
    try {
      console.log('[OCR] Starting OCR process...');
      toast.loading('Bild wird vorverarbeitet...', { id: 'ocr-process' });
      
      // Preprocess image for better OCR
      const processedImage = await preprocessImage(imageData);
      console.log('[OCR] Image preprocessed');
      
      toast.loading('Initialisiere OCR-Engine...', { id: 'ocr-process' });
      
      // Create worker with English (better for alphanumeric)
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            toast.loading(`Erkenne Text... ${progress}%`, { id: 'ocr-process' });
          }
        }
      });
      
      // Configure for license plate recognition
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
        tessedit_pageseg_mode: '8', // Treat the image as a single word
        tessedit_ocr_engine_mode: '1', // LSTM only
      });
      
      console.log('[OCR] Recognizing processed image...');
      const { data: { text, confidence, words } } = await worker.recognize(processedImage);
      
      console.log('[OCR] Raw text:', text);
      console.log('[OCR] Confidence:', confidence);
      console.log('[OCR] Words:', words);
      
      await worker.terminate();
      
      // Show what was detected
      toast.loading(`Erkannt: "${text}" (${Math.round(confidence)}%)`, { id: 'ocr-process', duration: 2000 });
      
      // Clean up the recognized text
      let cleanedText = text
        .toUpperCase()
        .replace(/\n/g, '') // Remove newlines
        .replace(/[^A-Z0-9-]/g, '') // Keep only valid characters
        .trim();
      
      console.log('[OCR] Cleaned text:', cleanedText);
      
      // Very lenient acceptance - even low confidence
      if (cleanedText.length >= 2) {
        // Try to format as German license plate
        // Pattern: 1-3 letters, 1-2 letters, 1-4 digits
        // Example: B-AB-1234 or HH-XX-9999
        
        return cleanedText;
      } else {
        console.log('[OCR] Text too short, ignoring');
        toast.error('Kennzeichen zu kurz oder nicht lesbar', { id: 'ocr-process' });
        return '';
      }
    } catch (error) {
      console.error('[OCR] Error:', error);
      toast.error('OCR-Fehler: ' + error.message, { id: 'ocr-process' });
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.license_plate.trim()) {
      toast.error('Bitte Kennzeichen eingeben');
      return;
    }

    if (!capturedImage) {
      toast.error('Bitte erst Bild erfassen');
      return;
    }

    setIsProcessing(true);

    try {
      const endpoint = formData.type === 'entry' ? '/api/parking/entry' : '/api/parking/exit';
      const imageKey = formData.type === 'entry' ? 'entry_image' : 'exit_image';
      
      const payload = {
        license_plate: formData.license_plate.toUpperCase().trim(),
        [imageKey]: capturedImage,
        zone: formData.location || 'default',
        notes: formData.notes
      };

      const result = await apiCall(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (result.success) {
        toast.success(
          formData.type === 'entry' 
            ? 'Einfahrt erfolgreich registriert' 
            : 'Ausfahrt erfolgreich registriert'
        );
        
        // Show additional info for exit
        if (formData.type === 'exit' && result.data) {
          const { duration_minutes, penalty_amount, violation_created } = result.data;
          
          if (violation_created) {
            toast.error(
              `Parkzeitüberschreitung! Dauer: ${duration_minutes} Min. Strafe: €${penalty_amount}`,
              { duration: 5000 }
            );
          } else {
            toast.success(
              `Parkdauer: ${duration_minutes} Min. Keine Überschreitung.`,
              { duration: 3000 }
            );
          }
        }
        
        // Reset form
        setFormData(prev => ({
          ...prev,
          license_plate: '',
          notes: ''
        }));
        setCapturedImage(null);
        setRecognizedPlate('');
        
        // Notify parent to refresh data
        if (onEntrySuccess) {
          onEntrySuccess();
        }
      } else {
        toast.error(result.message || 'Fehler bei der Registrierung');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Fehler bei der Registrierung');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureAndRecognize = async () => {
    const imageData = captureFrame();
    if (imageData) {
      setCapturedImage(imageData);
      
      // Show processed image for debugging
      const processed = await preprocessImage(imageData);
      setProcessedImage(processed);
      
      const plate = await performOCR(imageData);
      
      if (plate) {
        setRecognizedPlate(plate);
        setFormData(prev => ({ ...prev, license_plate: plate }));
        toast.success(`Erkannt: ${plate}`, { id: 'ocr-process', duration: 3000 });
      } else {
        toast.error('Kennzeichen nicht erkannt. Bitte manuell eingeben.', { id: 'ocr-process' });
      }
    }
  };

  return (
    <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
      <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Ein-/Ausfahrt Registrieren
      </h2>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Typ
          </label>
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'entry' }))}
              className={`flex-1 ${
                formData.type === 'entry'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Einfahrt
            </Button>
            <Button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'exit' }))}
              className={`flex-1 ${
                formData.type === 'exit'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Ausfahrt
            </Button>
          </div>
        </div>

        {/* Location Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Standort
          </label>
          <select
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className={`w-full p-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Standort wählen</option>
            {locations.map(loc => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.name} ({loc.city})
              </option>
            ))}
          </select>
        </div>

        {/* Capture Button */}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleCapture}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Camera className="mr-2 h-4 w-4" />
            Bild Erfassen
          </Button>
          <Button
            type="button"
            onClick={handleCaptureAndRecognize}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Erfassen & Erkennen
          </Button>
        </div>

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="relative">
            <img
              src={capturedImage}
              alt="Erfasstes Bild"
              className="w-full rounded-lg"
            />
          </div>
        )}

        {/* License Plate Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Kennzeichen
          </label>
          <input
            type="text"
            value={formData.license_plate}
            onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
            placeholder="z.B. B-AB-1234"
            className={`w-full p-3 rounded-lg border font-mono text-lg font-bold ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            required
          />
          {recognizedPlate && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Automatisch erkannt: {recognizedPlate}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Notizen (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Zusätzliche Informationen..."
            rows={2}
            className={`w-full p-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isProcessing || !capturedImage || !formData.license_plate}
          className={`w-full ${
            formData.type === 'entry'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } text-white font-bold py-3`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verarbeite...
            </>
          ) : (
            <>
              {formData.type === 'entry' ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Einfahrt Registrieren
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Ausfahrt Registrieren
                </>
              )}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default ParkingEntryForm;
