import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Camera, Upload, X, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Image as ImageIcon, Zap, Video, VideoOff } from 'lucide-react';
import toast from 'react-hot-toast';

const LicensePlateRecognition = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [mode, setMode] = useState('recognize'); // recognize, entry, exit
  const [inputMode, setInputMode] = useState('webcam'); // webcam or upload
  const [location, setLocation] = useState('');
  const [history, setHistory] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Webcam starten
  const startCamera = async () => {
    try {
      console.log('[Webcam] Requesting camera access...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported (HTTPS required)');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('[Webcam] Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        setCameraError(null);
        toast.success('Kamera gestartet');
      }
    } catch (error) {
      console.error('[Webcam] Camera access failed:', error);
      
      let errorMessage = 'Kamera-Zugriff fehlgeschlagen. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Berechtigung verweigert. Bitte erlauben Sie den Kamera-Zugriff in Ihren Browser-Einstellungen.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Keine Kamera gefunden. Bitte schließen Sie eine Kamera an.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Kamera wird bereits von einer anderen Anwendung verwendet.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage += 'HTTPS erforderlich. Webcam funktioniert nur über sichere Verbindungen.';
      } else {
        errorMessage += error.message || 'Unbekannter Fehler.';
      }
      
      setCameraError(errorMessage);
      toast.error('Kamera konnte nicht gestartet werden');
    }
  };

  // Webcam stoppen
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Foto aufnehmen
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      setRecognitionResult(null);
      stopCamera();
      toast.success('Foto aufgenommen');
    }, 'image/jpeg', 0.95);
  };

  // Foto aufnehmen UND direkt erkennen (für automatische Erkennung)
  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
      
      // Automatisch OCR durchführen
      toast.loading('Kennzeichen wird erkannt...');
      await recognizeLicensePlate(file);
    }, 'image/jpeg', 0.95);
  };

  const recognizeLicensePlate = async (imageFile) => {
    setIsRecognizing(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      
      let endpoint = '/api/parking/recognize-plate';
      
      if (mode === 'entry') {
        endpoint = '/api/parking/entry-with-ocr';
        if (location) {
          formData.append('location', location);
        }
      } else if (mode === 'exit') {
        endpoint = '/api/parking/exit-with-ocr';
      }
      
      const result = await apiCall(endpoint, 'POST', formData, false, true);
      
      setRecognitionResult(result);
      
      if (result.success) {
        toast.success(`Kennzeichen erkannt: ${result.data.license_plate}`);
        
        // Auto-fill Event für Parkzeitüberschreitung
        window.dispatchEvent(new CustomEvent('license-plate-recognized', {
          detail: {
            licensePlate: result.data.license_plate,
            confidence: result.data.confidence,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        toast.error(result.message || 'Erkennung fehlgeschlagen');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Fehler bei der Erkennung');
    } finally {
      setIsRecognizing(false);
    }
  };

  // Webcam automatisch starten wenn Webcam-Modus aktiviert wird
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      if (inputMode === 'webcam' && mounted) {
        await startCamera();
      } else {
        stopCamera();
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [inputMode]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setRecognitionResult(null);
    }
  };

  const handleRecognize = async () => {
    if (!selectedImage) {
      toast.error('Bitte wählen Sie ein Bild aus');
      return;
    }

    setIsRecognizing(true);
    setRecognitionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/parking/recognize-plate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setRecognitionResult(result.data);
        toast.success(`Kennzeichen erkannt: ${result.data.license_plate}`);
      } else {
        toast.error('Kennzeichen konnte nicht erkannt werden');
      }
    } catch (error) {
      console.error('Recognition error:', error);
      toast.error('Fehler bei der Erkennung');
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleEntryWithOCR = async () => {
    if (!selectedImage) {
      toast.error('Bitte wählen Sie ein Bild aus');
      return;
    }

    if (!location.trim()) {
      toast.error('Bitte geben Sie einen Standort ein');
      return;
    }

    setIsRecognizing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('location', location);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/parking/entry-with-ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setRecognitionResult(result.data);
        clearImage();
      } else {
        toast.error(result.message || 'Fehler bei der Einfahrt');
      }
    } catch (error) {
      console.error('Entry error:', error);
      toast.error('Fehler bei der Einfahrt');
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleExitWithOCR = async () => {
    if (!selectedImage) {
      toast.error('Bitte wählen Sie ein Bild aus');
      return;
    }

    setIsRecognizing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/parking/exit-with-ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setRecognitionResult(result.data);
        clearImage();
      } else {
        toast.error(result.message || 'Fehler bei der Ausfahrt');
      }
    } catch (error) {
      console.error('Exit error:', error);
      toast.error('Fehler bei der Ausfahrt');
    } finally {
      setIsRecognizing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setRecognitionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Wenn im Webcam-Modus, Kamera neu starten
    if (inputMode === 'webcam') {
      startCamera();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Kennzeichenerkennung (OCR)
        </h2>
        <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Tesseract OCR-basierte automatische Kennzeichenerkennung
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          onClick={() => setMode('recognize')}
          variant={mode === 'recognize' ? 'default' : 'outline'}
          className={mode === 'recognize' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Zap className="h-4 w-4 mr-2" />
          Nur Erkennen
        </Button>
        <Button
          onClick={() => setMode('entry')}
          variant={mode === 'entry' ? 'default' : 'outline'}
          className={mode === 'entry' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Einfahrt
        </Button>
        <Button
          onClick={() => setMode('exit')}
          variant={mode === 'exit' ? 'default' : 'outline'}
          className={mode === 'exit' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ausfahrt
        </Button>
      </div>

      {/* Input Mode Selection - Webcam or Upload */}
      <div className="flex gap-2">
        <Button
          onClick={() => setInputMode('webcam')}
          variant={inputMode === 'webcam' ? 'default' : 'outline'}
          className={inputMode === 'webcam' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Video className="h-4 w-4 mr-2" />
          Webcam
        </Button>
        <Button
          onClick={() => setInputMode('upload')}
          variant={inputMode === 'upload' ? 'default' : 'outline'}
        >
          <Upload className="h-4 w-4 mr-2" />
          Datei hochladen
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webcam/Upload Area */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {inputMode === 'webcam' ? 'Webcam' : 'Bild hochladen'}
          </h3>

          {/* Webcam Mode */}
          {inputMode === 'webcam' ? (
            <>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Captured"
                    className="w-full h-64 object-contain rounded-lg bg-black"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  {isCameraActive ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover rounded-lg bg-black"
                      />
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <Button
                          onClick={captureAndRecognize}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={isRecognizing}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {isRecognizing ? 'Erkenne...' : 'Aufnehmen & Erkennen'}
                        </Button>
                        <Button
                          onClick={capturePhoto}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Nur Foto
                        </Button>
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <VideoOff className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-12 text-center ${
                      theme === 'dark'
                        ? 'border-gray-700 bg-[#1a1a1a]'
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      <Video className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                      {cameraError ? (
                        <>
                          <p className="text-sm text-red-500 mb-3">{cameraError}</p>
                          <Button onClick={startCamera} variant="outline">
                            <Video className="h-4 w-4 mr-2" />
                            Erneut versuchen
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Webcam wird gestartet...
                          </p>
                          <Button onClick={startCamera}>
                            <Video className="h-4 w-4 mr-2" />
                            Kamera starten
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          ) : (
            /* Upload Mode */
            <>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-contain rounded-lg bg-black"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600 bg-[#1a1a1a]'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                >
                  <ImageIcon className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Klicken Sie hier oder ziehen Sie ein Bild
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Unterstützte Formate: JPG, PNG
                  </p>
                </div>
              )}
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="mt-4 space-y-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Datei wählen
            </Button>

            {mode === 'entry' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Standort
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="z.B. Parkplatz A1"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            )}

            {mode === 'recognize' && (
              <Button
                onClick={handleRecognize}
                disabled={!selectedImage || isRecognizing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isRecognizing ? 'Erkenne...' : 'Kennzeichen erkennen'}
              </Button>
            )}

            {mode === 'entry' && (
              <Button
                onClick={handleEntryWithOCR}
                disabled={!selectedImage || isRecognizing || !location.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isRecognizing ? 'Verarbeite...' : 'Einfahrt erfassen'}
              </Button>
            )}

            {mode === 'exit' && (
              <Button
                onClick={handleExitWithOCR}
                disabled={!selectedImage || isRecognizing}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isRecognizing ? 'Verarbeite...' : 'Ausfahrt erfassen'}
              </Button>
            )}
          </div>
        </Card>

        {/* Results */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Ergebnis
          </h3>

          {recognitionResult ? (
            <div className="space-y-4">
              {mode === 'recognize' && (
                <>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' ? 'bg-[#1a1a1a] border-green-800' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Erkannt
                      </span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-green-600 mb-2">
                      {recognitionResult.license_plate || 'Nicht erkannt'}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Konfidenz: {recognitionResult.confidence}%
                    </p>
                  </div>

                  {recognitionResult.raw_text && (
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Roher OCR-Text:
                      </p>
                      <p className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {recognitionResult.raw_text}
                      </p>
                    </div>
                  )}
                </>
              )}

              {(mode === 'entry' || mode === 'exit') && (
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Kennzeichen:</span>
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {recognitionResult.license_plate}
                      </span>
                    </div>
                    {recognitionResult.location && (
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Standort:</span>
                        <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          {recognitionResult.location}
                        </span>
                      </div>
                    )}
                    {recognitionResult.duration_minutes && (
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Parkdauer:</span>
                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {recognitionResult.duration_minutes} Minuten
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Camera className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Laden Sie ein Bild hoch, um die Erkennung zu starten
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Info */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
            <p className="font-semibold mb-1">Hinweise zur Kennzeichenerkennung:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Verwenden Sie möglichst klare, gut beleuchtete Bilder</li>
              <li>Das Kennzeichen sollte frontal und vollständig sichtbar sein</li>
              <li>OCR-Engine: Tesseract 5.3.0 mit Deutsch/Englisch Support</li>
              <li>Konfidenz >70% gilt als zuverlässig</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LicensePlateRecognition;
