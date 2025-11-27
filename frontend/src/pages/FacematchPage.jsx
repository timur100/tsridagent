import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, Search, FileText, Fingerprint, Camera, 
  Image as ImageIcon, CheckCircle, XCircle, Eye, X, RefreshCw, AlertTriangle, ChevronDown
} from 'lucide-react';

const FacematchPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const docCanvasRef = useRef(null);
  
  // State management
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [availableScans, setAvailableScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [threshold, setThreshold] = useState(70);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState(null); // 'too-far', 'too-close', 'perfect', 'outside'
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [step, setStep] = useState(1); // 1: capture live image, 2: select document, 3: compare

  // Auto-start camera when component mounts
  useEffect(() => {
    if (step === 1 && !cameraActive && !capturedImage) {
      startCamera();
    }
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch scans only when needed (step 2)
  useEffect(() => {
    if (step === 2 && availableScans.length === 0) {
      fetchAvailableScans();
    }
  }, [step]);

  // Simulated face detection loop (for visual feedback)
  useEffect(() => {
    let animationId;
    let checkCount = 0;
    
    if (cameraActive && videoRef.current && !autoCapturing && step === 1) {
      const detectFace = async () => {
        checkCount++;
        
        // Simulate face detection every 30 frames (~1 second at 30fps)
        if (checkCount % 30 === 0) {
          // Simulate face detection states
          const states = ['outside', 'too-far', 'too-close', 'perfect'];
          const randomState = states[Math.floor(Math.random() * states.length)];
          
          setFaceDetected(randomState !== 'outside');
          setFacePosition(randomState);
          
          // In real implementation, you would:
          // 1. Capture current video frame
          // 2. Send to backend for face detection
          // 3. Get face location and position feedback
        }
        
        animationId = requestAnimationFrame(detectFace);
      };
      
      detectFace();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [cameraActive, autoCapturing, step]);

  const fetchAvailableScans = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/facematch/scans');
      if (result.success && result.data) {
        setAvailableScans(result.data.scans || []);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast.error('Fehler beim Laden der Scans');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraActive(true);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Kamera-Zugriff fehlgeschlagen. Bitte Berechtigungen prüfen.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    stopCamera();
    
    // Move to next step: document selection
    setStep(2);
    
    toast.success('Live-Bild erfolgreich aufgenommen! Bitte wählen Sie nun ein Dokument zum Vergleich aus.');
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setMatchResult(null);
    setSelectedScan(null);
    setStep(1);
    startCamera();
  };

  const drawLandmarks = (canvasElement, landmarks, faceLocation, imageWidth, imageHeight) => {
    const canvas = canvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face bounding box
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    const top = faceLocation.top;
    const right = faceLocation.right;
    const bottom = faceLocation.bottom;
    const left = faceLocation.left;
    
    ctx.strokeRect(left, top, right - left, bottom - top);

    // Draw landmarks
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    // Draw facial feature points and connections
    const featureGroups = [
      'chin', 'left_eyebrow', 'right_eyebrow', 
      'nose_bridge', 'nose_tip', 
      'left_eye', 'right_eye', 
      'top_lip', 'bottom_lip'
    ];

    featureGroups.forEach(feature => {
      const points = landmarks[feature];
      if (!points || points.length === 0) return;

      // Draw connecting lines
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();

      // Draw points
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const compareWithDatabase = async () => {
    if (!capturedImage) {
      toast.error('Bitte nehmen Sie zuerst ein Foto auf');
      return;
    }

    if (!selectedScan) {
      toast.error('Bitte wählen Sie ein Dokument zum Vergleich aus');
      return;
    }

    setStep(3);
    setComparing(true);
    try {
      const result = await apiCall('/api/facematch/compare', {
        method: 'POST',
        body: JSON.stringify({
          live_image: capturedImage,
          scan_id: selectedScan.id,
          threshold: threshold
        })
      });

      if (result.success && result.data) {
        setMatchResult(result.data);
        
        // Draw landmarks on both images
        setTimeout(() => {
          // Live image landmarks
          if (liveCanvasRef.current && result.data.live_face) {
            const liveImg = new Image();
            liveImg.onload = () => {
              liveCanvasRef.current.width = liveImg.width;
              liveCanvasRef.current.height = liveImg.height;
              const ctx = liveCanvasRef.current.getContext('2d');
              ctx.drawImage(liveImg, 0, 0);
              drawLandmarks(
                liveCanvasRef.current,
                result.data.live_face.landmarks,
                result.data.live_face.location,
                liveImg.width,
                liveImg.height
              );
            };
            liveImg.src = capturedImage;
          }

          // Document image landmarks
          if (docCanvasRef.current && result.data.document_face) {
            // Fetch document image
            apiCall(`/api/id-scans/${selectedScan.id}/images/front_portrait`, {
              method: 'GET',
              responseType: 'blob'
            }).then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const docImg = new Image();
                docImg.onload = () => {
                  docCanvasRef.current.width = docImg.width;
                  docCanvasRef.current.height = docImg.height;
                  const ctx = docCanvasRef.current.getContext('2d');
                  ctx.drawImage(docImg, 0, 0);
                  drawLandmarks(
                    docCanvasRef.current,
                    result.data.document_face.landmarks,
                    result.data.document_face.location,
                    docImg.width,
                    docImg.height
                  );
                };
                docImg.src = reader.result;
              };
              reader.readAsDataURL(blob);
            });
          }
        }, 100);

        const matchStatus = result.data.is_match ? 'Übereinstimmung' : 'Keine Übereinstimmung';
        toast.success(`${matchStatus}: ${result.data.match_percentage}%`);
      } else {
        toast.error(result.error || 'Vergleich fehlgeschlagen');
      }
    } catch (error) {
      console.error('Facematch error:', error);
      toast.error('Fehler beim Gesichtsvergleich');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div>
      {/* Sub-Tab Menu */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className={`p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/portal/admin/id-checks')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Dokumentenscan
            </button>
            <button
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-[#c00000] text-white`}
            >
              <Users className="h-5 w-5" />
              Facematch
            </button>
            <button
              onClick={() => navigate('/portal/admin/fingerprint')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Fingerprint className="h-5 w-5" />
              Fingerprint
            </button>
            <button
              onClick={() => navigate('/portal/admin/ki-search')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Search className="h-5 w-5" />
              KI-Suche
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Facematch - Forensischer Gesichtsvergleich
            </h1>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Biometrischer Vergleich mit 68-Punkt-Landmarken-Analyse
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              step === 1 ? 'bg-[#c00000] text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <Camera className="h-5 w-5" />
              <span className="font-semibold">1. Live-Bild aufnehmen</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              step === 2 ? 'bg-[#c00000] text-white' : step > 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <FileText className="h-5 w-5" />
              <span className="font-semibold">2. Dokument auswählen</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              step === 3 ? 'bg-[#c00000] text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <Search className="h-5 w-5" />
              <span className="font-semibold">3. Vergleichen</span>
            </div>
          </div>
        </div>

        {/* Document Selection - Only show in Step 2 */}
        {step >= 2 && !matchResult && (
          <div className={`rounded-lg border p-6 mb-6 ${
            theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Dokument zum Vergleich auswählen
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className={`h-8 w-8 animate-spin mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lade Dokumente...</p>
              </div>
            ) : availableScans.length === 0 ? (
              <div className={`text-center py-8 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <FileText className={`mx-auto h-12 w-12 mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Keine Dokumente mit Portraits verfügbar</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedScan?.id || ''}
                  onChange={(e) => {
                    const scan = availableScans.find(s => s.id === e.target.value);
                    setSelectedScan(scan);
                    setMatchResult(null);
                  }}
                  className={`w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-[#1a1a1a] border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">-- Dokument auswählen --</option>
                  {availableScans.map(scan => (
                    <option key={scan.id} value={scan.id}>
                      {scan.name} - {scan.document_type} ({scan.document_number})
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-4 top-4 h-5 w-5 pointer-events-none ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </div>
            )}
          </div>
        )}

        {/* Threshold Slider - Only show in Step 2 */}
        {step >= 2 && !matchResult && (
          <div className={`rounded-lg border p-6 mb-6 ${
            theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Übereinstimmungs-Schwellenwert
              </h3>
              <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #c00000 0%, #c00000 ${(threshold - 50) / 45 * 100}%, #e5e7eb ${(threshold - 50) / 45 * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between mt-2 text-sm">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>50% (Niedrig)</span>
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>95% (Hoch)</span>
            </div>
          </div>
        )}

        {/* Main Comparison Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Live Camera/Image */}
          <div className={`rounded-lg border p-6 ${
            theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Live-Aufnahme
            </h3>

            {!cameraActive && !capturedImage && (
              <div className={`rounded-lg border-2 border-dashed p-12 text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'
              }`}>
                <Camera className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Webcam wird gestartet...
                </h4>
              </div>
            )}

            {cameraActive && step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                    style={{ maxHeight: '500px', objectFit: 'cover' }}
                  />
                  
                  {/* Green face detection frame overlay */}
                  {faceDetected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div 
                        className="border-4 rounded-lg transition-all duration-300"
                        style={{
                          width: '60%',
                          height: '70%',
                          borderColor: facePosition === 'perfect' ? '#22c55e' : '#eab308',
                          boxShadow: facePosition === 'perfect' ? '0 0 20px rgba(34, 197, 94, 0.5)' : '0 0 20px rgba(234, 179, 8, 0.5)'
                        }}
                      >
                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4" style={{ borderColor: facePosition === 'perfect' ? '#22c55e' : '#eab308' }}></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4" style={{ borderColor: facePosition === 'perfect' ? '#22c55e' : '#eab308' }}></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4" style={{ borderColor: facePosition === 'perfect' ? '#22c55e' : '#eab308' }}></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4" style={{ borderColor: facePosition === 'perfect' ? '#22c55e' : '#eab308' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Position feedback overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    {!faceDetected || facePosition === 'outside' ? (
                      <div className="bg-red-600 bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Kein Gesicht erkannt - Positionieren Sie sich im Rahmen
                      </div>
                    ) : facePosition === 'too-far' ? (
                      <div className="bg-yellow-600 bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Bitte näher zur Kamera kommen
                      </div>
                    ) : facePosition === 'too-close' ? (
                      <div className="bg-yellow-600 bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Bitte weiter von der Kamera weggehen
                      </div>
                    ) : facePosition === 'perfect' ? (
                      <div className="bg-green-600 bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 animate-pulse">
                        <CheckCircle className="h-5 w-5" />
                        Perfekte Position! Foto aufnehmen bereit
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={stopCamera}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Kamera stoppen"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={capturePhoto}
                  className="w-full px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Foto aufnehmen
                </button>
                <p className="text-sm text-center text-gray-500">
                  Positionieren Sie Ihr Gesicht im Rahmen für optimale Ergebnisse
                </p>
              </div>
            )}

            {capturedImage && !matchResult && (
              <div className="space-y-4">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Neu aufnehmen
                  </button>
                  <button
                    onClick={compareWithDatabase}
                    disabled={comparing || !selectedScan}
                    className="flex-1 px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparing ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Analysiere...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        Vergleichen
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {matchResult && (
              <div className="space-y-4">
                <div className="relative">
                  <canvas
                    ref={liveCanvasRef}
                    className="w-full rounded-lg border-2 border-green-500"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm font-semibold">
                    Live-Bild
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Document Image */}
          <div className={`rounded-lg border p-6 ${
            theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Dokument-Bild
            </h3>

            {!selectedScan ? (
              <div className={`rounded-lg border-2 border-dashed p-12 text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'
              }`}>
                <FileText className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kein Dokument ausgewählt
                </h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Wählen Sie ein Dokument aus der Liste oben
                </p>
              </div>
            ) : matchResult ? (
              <div className="space-y-4">
                <div className="relative">
                  <canvas
                    ref={docCanvasRef}
                    className="w-full rounded-lg border-2 border-blue-500"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm font-semibold">
                    Dokument
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-lg border p-4 ${theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'}`}>
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}/api/id-scans/${selectedScan.id}/images/front_portrait`}
                  alt="Document Portrait"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
                <div className="mt-4 space-y-2">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Name:</strong> {selectedScan.name}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Dokumentnummer:</strong> {selectedScan.document_number}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <strong>Typ:</strong> {selectedScan.document_type}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match Result */}
        {matchResult && (
          <div className={`rounded-lg border p-6 mb-6 ${
            matchResult.is_match 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              {matchResult.is_match ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
              <div>
                <h3 className={`text-2xl font-bold ${matchResult.is_match ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {matchResult.is_match ? 'Übereinstimmung gefunden!' : 'Keine Übereinstimmung'}
                </h3>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Übereinstimmung: <strong className="text-2xl">{matchResult.match_percentage}%</strong>
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {matchResult.scan_info.name}
                </p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dokumentnummer</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {matchResult.scan_info.document_number}
                </p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dokumenttyp</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {matchResult.scan_info.document_type}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate(`/portal/admin/id-checks/${matchResult.scan_info.scan_id}`)}
                className="px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors flex items-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Scan-Details anzeigen
              </button>
              <button
                onClick={retakePhoto}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Neuer Vergleich
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default FacematchPage;
