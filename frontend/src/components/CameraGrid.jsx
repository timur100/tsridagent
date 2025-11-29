import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Video, Maximize2, X, Grid3x3, Grid2x2, LayoutGrid, Webcam } from 'lucide-react';
import { Card } from './ui/card';

const CameraGrid = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [gridSize, setGridSize] = useState('2x2'); // 2x2, 3x3, 4x4
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRefs = useRef([]);

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    if (showWebcam) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [showWebcam]);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/cameras');
      if (result.success) {
        setCameras(result.data.cameras || []);
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 }
      });
      setWebcamStream(stream);
      
      // Assign stream to all video elements
      setTimeout(() => {
        videoRefs.current.forEach((video) => {
          if (video && stream) {
            video.srcObject = stream;
          }
        });
      }, 100);
    } catch (error) {
      console.error('Error starting webcam:', error);
      alert('Fehler beim Zugriff auf die Webcam. Bitte Berechtigungen prüfen.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    videoRefs.current.forEach((video) => {
      if (video) {
        video.srcObject = null;
      }
    });
  };

  const getGridClass = () => {
    switch (gridSize) {
      case '2x2':
        return 'grid-cols-2';
      case '3x3':
        return 'grid-cols-3';
      case '4x4':
        return 'grid-cols-4';
      default:
        return 'grid-cols-2';
    }
  };

  const getGridCount = () => {
    switch (gridSize) {
      case '2x2':
        return 4;
      case '3x3':
        return 9;
      case '4x4':
        return 16;
      default:
        return 4;
    }
  };

  const displayItems = showWebcam 
    ? Array(getGridCount()).fill(null).map((_, idx) => ({
        id: `webcam-${idx}`,
        name: `Live Webcam ${idx + 1}`,
        location: 'Lokale Kamera',
        resolution: '1920x1080',
        fps: 30,
        status: 'online',
        isWebcam: true
      }))
    : cameras;

  if (loading) {
    return (
      <div className="text-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Kameras werden geladen...
        </p>
      </div>
    );
  }

  if (cameras.length === 0 && !showWebcam) {
    return (
      <div>
        {/* Webcam Toggle when no cameras */}
        <div className="mb-6 flex justify-between items-center">
          <div></div>
          <button
            onClick={() => setShowWebcam(!showWebcam)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showWebcam
                ? 'bg-green-600 text-white'
                : theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Webcam className="h-5 w-5" />
            {showWebcam ? 'Webcam aktiv' : 'Lokale Webcam anzeigen'}
          </button>
        </div>

        <div className="text-center p-12">
          <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Kameras vorhanden
          </p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Fügen Sie Kameras über den "Kameras" Tab hinzu oder aktivieren Sie die Webcam
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Grid Size Selector & Webcam Toggle */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setGridSize('2x2')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              gridSize === '2x2'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid2x2 className="h-4 w-4" />
            2x2
          </button>
          <button
            onClick={() => setGridSize('3x3')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              gridSize === '3x3'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
            3x3
          </button>
          <button
            onClick={() => setGridSize('4x4')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              gridSize === '4x4'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            4x4
          </button>
        </div>

        {/* Webcam Toggle */}
        <button
          onClick={() => setShowWebcam(!showWebcam)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            showWebcam
              ? 'bg-green-600 text-white hover:bg-green-700'
              : theme === 'dark'
              ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Webcam className="h-5 w-5" />
          {showWebcam ? 'Webcam: EIN' : 'Lokale Webcam anzeigen'}
        </button>
      </div>

      {/* Camera Grid */}
      <div className={`grid ${getGridClass()} gap-4`}>
        {displayItems.map((camera, index) => (
          <Card
            key={camera.id}
            className={`relative overflow-hidden cursor-pointer group ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
            }`}
            onClick={() => setFullscreenCamera(camera)}
          >
            {/* Camera Preview */}
            <div className="aspect-video bg-gray-900 relative">
              {/* Placeholder for camera stream */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="h-12 w-12 text-gray-600" />
              </div>
              
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    camera.status === 'online'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {camera.status === 'online' ? '● Online' : '● Offline'}
                </span>
              </div>

              {/* Fullscreen Icon on Hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Maximize2 className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Camera Info */}
            <div className="p-3">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {camera.name}
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {camera.location}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {camera.resolution} @ {camera.fps}fps
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setFullscreenCamera(null)}
        >
          <div className="relative w-full max-w-7xl">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 z-10 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              onClick={() => setFullscreenCamera(null)}
            >
              <X className="h-6 w-6" />
            </button>

            {/* Fullscreen Camera View */}
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="h-24 w-24 text-gray-600" />
                </div>
              </div>
              
              {/* Camera Info */}
              <div className="p-4 bg-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{fullscreenCamera.name}</h2>
                    <p className="text-gray-400 mt-1">{fullscreenCamera.location}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1.5 text-sm font-medium rounded ${
                        fullscreenCamera.status === 'online'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {fullscreenCamera.status === 'online' ? '● Online' : '● Offline'}
                    </span>
                    <p className="text-gray-400 text-sm mt-2">
                      {fullscreenCamera.resolution} @ {fullscreenCamera.fps}fps
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraGrid;
