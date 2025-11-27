import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, Search, FileText, Fingerprint, Camera, 
  Image as ImageIcon, CheckCircle, XCircle, Eye, X, RefreshCw
} from 'lucide-react';

const FacematchPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    // Cleanup: Stop camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraActive(true);
      toast.success('Kamera gestartet');
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
      toast.success('Kamera gestoppt');
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
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    stopCamera();
    
    toast.success('Foto aufgenommen');
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setMatches([]);
    startCamera();
  };

  const compareWithDatabase = async () => {
    if (!capturedImage) {
      toast.error('Bitte nehmen Sie zuerst ein Foto auf');
      return;
    }

    setComparing(true);
    try {
      // Call backend API to compare face
      const result = await apiCall('/api/facematch/compare', {
        method: 'POST',
        body: JSON.stringify({
          image: capturedImage
        })
      });

      if (result.success && result.data) {
        setMatches(result.data.matches || []);
        toast.success(`${result.data.matches?.length || 0} Übereinstimmung(en) gefunden`);
      } else {
        toast.error('Keine Übereinstimmungen gefunden');
        setMatches([]);
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
              Facematch
            </h1>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Vergleichen Sie Gesichter aus ID-Dokumenten mit Live-Aufnahmen
            </p>
          </div>
        </div>

        {/* Camera Section */}
        <div className={`rounded-lg border p-6 mb-6 ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-white'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Gesichtsaufnahme
          </h3>

          {!cameraActive && !capturedImage && (
            <div className={`rounded-lg border-2 border-dashed p-12 text-center ${
              theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'
            }`}>
              <Camera className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kamera starten
              </h4>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Nehmen Sie ein Foto auf, um es mit der Datenbank zu vergleichen
              </p>
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors flex items-center gap-2 mx-auto"
              >
                <Camera className="h-5 w-5" />
                Kamera starten
              </button>
            </div>
          )}

          {cameraActive && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                  style={{ maxHeight: '500px', objectFit: 'cover' }}
                />
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
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '500px', objectFit: 'cover' }}
                />
              </div>
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
                  disabled={comparing}
                  className="flex-1 px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {comparing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Vergleiche...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Mit Datenbank vergleichen
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>0</p>
              </div>
              <Users className={`h-8 w-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Übereinstimmung</p>
                <p className="text-2xl font-bold mt-1 text-green-500">0</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Keine Übereinstimmung</p>
                <p className="text-2xl font-bold mt-1 text-red-500">0</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ausstehend</p>
                <p className="text-2xl font-bold mt-1 text-yellow-500">0</p>
              </div>
              <Eye className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Results Section */}
        {matches.length > 0 ? (
          <div className="space-y-4">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Übereinstimmungen gefunden: {matches.length}
            </h3>
            {matches.map((match, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={match.document_image}
                    alt="Document"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {match.name}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        match.confidence >= 80 
                          ? 'bg-green-100 text-green-800'
                          : match.confidence >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {match.confidence}% Übereinstimmung
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Dokumentennummer: {match.document_number}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Gescannt am: {new Date(match.scanned_at).toLocaleString('de-DE')}
                    </p>
                    <button
                      onClick={() => navigate(`/portal/admin/id-checks/${match.scan_id}`)}
                      className="mt-2 text-[#c00000] hover:underline text-sm font-semibold"
                    >
                      Details anzeigen →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : capturedImage ? (
          <div className={`text-center py-12 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <XCircle className={`mx-auto h-16 w-16 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Keine Übereinstimmungen gefunden
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Das aufgenommene Gesicht stimmt mit keinem Dokument in der Datenbank überein
            </p>
          </div>
        ) : (
          <div className={`text-center py-12 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <ImageIcon className={`mx-auto h-16 w-16 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Bereit für Gesichtsvergleich
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Starten Sie die Kamera und nehmen Sie ein Foto auf
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacematchPage;
