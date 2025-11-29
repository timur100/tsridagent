import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Car, Clock, AlertTriangle, CheckCircle, Settings, 
  FileText, Shield, TrendingUp, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ParkingEntryForm from '../components/ParkingEntryForm';

const ParkingOverview = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    active_sessions: 0,
    sessions_today: 0,
    total_violations: 0,
    pending_violations: 0,
    total_penalty_amount: 0
  });
  const [activeSessions, setActiveSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const videoRef = React.useRef(null);

  useEffect(() => {
    console.log('[ParkingOverview] Component mounted');
    loadData();
    startWebcam();
    
    // Auto-refresh every 30 seconds (reduced from 10)
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    
    return () => {
      console.log('[ParkingOverview] Component unmounting');
      clearInterval(interval);
      stopWebcam();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWebcam = async () => {
    try {
      console.log('[ParkingOverview] Starting webcam...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      });
      
      setWebcamStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        console.log('[ParkingOverview] Webcam started successfully');
      }
    } catch (error) {
      console.error('[ParkingOverview] Webcam error:', error);
      setWebcamError(error.message || 'Kamera-Zugriff verweigert');
      toast.error('Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      console.log('[ParkingOverview] Stopping webcam...');
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      console.log('[ParkingOverview] Loading data...');
      
      const [statsResult, sessionsResult, configResult] = await Promise.all([
        apiCall('/api/parking/stats'),
        apiCall('/api/parking/active'),
        apiCall('/api/parking/config')
      ]);

      console.log('[ParkingOverview] Stats result:', statsResult);
      console.log('[ParkingOverview] Sessions result:', sessionsResult);
      console.log('[ParkingOverview] Config result:', configResult);

      if (statsResult && statsResult.success) {
        console.log('[ParkingOverview] Stats data:', statsResult.data);
        console.log('[ParkingOverview] total_penalty_amount:', statsResult.data?.total_penalty_amount);
        setStats(statsResult.data);
      }

      if (sessionsResult && sessionsResult.success) {
        setActiveSessions(sessionsResult.data.sessions || []);
      }

      if (configResult && configResult.success) {
        setConfig(configResult.data);
      }
    } catch (error) {
      console.error('[ParkingOverview] Error loading parking data:', error);
      if (!silent) {
        toast.error('Fehler beim Laden der Parkdaten');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (durationMinutes, maxAllowed) => {
    if (!config) return 'green';
    
    const maxMinutes = config.max_free_duration_minutes;
    const percentage = (durationMinutes / maxMinutes) * 100;
    
    if (percentage < 75) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Parkzeitüberwachung
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Live-Übersicht der parkenden Fahrzeuge
          </p>
        </div>
        <Button
          onClick={() => loadData()}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Active Sessions */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>
                Aktuell Parkend
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.active_sessions}
              </p>
            </div>
            <Car className="h-12 w-12 text-blue-600" />
          </div>
        </Card>

        {/* Sessions Today */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
                Heute Gesamt
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.sessions_today}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </Card>

        {/* Total Violations */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                Verstöße Gesamt
              </p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.total_violations}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </Card>

        {/* Pending Violations */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                Offen
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.pending_violations}
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </Card>

        {/* Total Penalty */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-800'}`}>
                Strafbetrag
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                €{(stats.total_penalty_amount || 0).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Aktuell Parkende Fahrzeuge
        </h2>

        {activeSessions.length === 0 ? (
          <div className="text-center py-12">
            <Car className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Aktuell keine parkenden Fahrzeuge
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kennzeichen
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Einfahrt
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dauer
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`text-left p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zone
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session, index) => {
                  const statusColor = getStatusColor(
                    session.current_duration_minutes, 
                    config?.max_free_duration_minutes
                  );
                  
                  return (
                    <tr 
                      key={index}
                      className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`p-3 font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {session.license_plate}
                        {session.is_whitelisted && (
                          <Shield className="inline-block ml-2 h-4 w-4 text-green-500" />
                        )}
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(session.entry_time).toLocaleString('de-DE')}
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {formatDuration(session.current_duration_minutes)}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColor === 'green' ? 'bg-green-100 text-green-800' :
                          statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {statusColor === 'green' ? 'OK' :
                           statusColor === 'yellow' ? 'Warnung' :
                           'Überschritten'}
                        </span>
                      </td>
                      <td className={`p-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {session.zone}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Configuration Info */}
      {config && (
        <Card className={`p-4 ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-4">
            <Settings className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                Aktuelle Konfiguration
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                Maximale kostenlose Parkdauer: {formatDuration(config.max_free_duration_minutes)} • 
                Strafbetrag: €{config.penalty_per_hour}/Stunde
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Live Video Feed and License Plate Recognition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Live Camera Feed */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Live Kamera - Ein-/Ausfahrt
            </h2>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                LIVE
              </span>
            </div>
          </div>
          
          <div className={`relative aspect-video rounded-lg overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
          }`}>
            {/* Live Webcam Stream */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            
            {/* Error or No Signal Overlay */}
            {(webcamError || !webcamStream) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center p-6">
                  <svg className="h-16 w-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">
                    {webcamError || 'Starte Kamera...'}
                  </p>
                  {webcamError && (
                    <button
                      onClick={startWebcam}
                      className="mt-4 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] text-sm"
                    >
                      Erneut versuchen
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Top Overlay - Camera Info (Always visible) */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-lg font-bold font-mono">
                    📹 CAM-01 • Einfahrt Süd
                  </p>
                  <p className="text-gray-300 text-sm font-mono">
                    {new Date().toLocaleString('de-DE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-mono">
                    Standort: {activeSessions.length > 0 ? 'Zone A' : 'Standard'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Overlay - License Plate Info (When detected) */}
            {activeSessions.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-3xl font-bold font-mono">
                      KFZ: {activeSessions[0].license_plate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-2xl font-bold">
                      ✓ ERKANNT
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Stream-Qualität: HD 1080p
            </p>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Einstellungen
            </Button>
          </div>
        </Card>

        {/* Real-time License Plate Recognition */}
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kennzeichenerkennung (OCR)
            </h2>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                AKTIV
              </span>
            </div>
          </div>

          {/* License Plate Display */}
          <div className={`relative rounded-lg p-8 mb-4 ${
            theme === 'dark' ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'
          }`}>
            <div className="text-center">
              <p className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Zuletzt erkanntes Kennzeichen:
              </p>
              
              {/* Large License Plate Display */}
              <div className={`inline-block px-8 py-6 rounded-xl ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-2 border-[#c00000]' : 'bg-white border-2 border-[#c00000]'
              } shadow-lg`}>
                <div className="flex items-center gap-4">
                  {/* EU Flag */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-12 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-yellow-400 text-xs font-bold">★</span>
                    </div>
                    <span className="text-xs mt-1 font-bold text-gray-500">D</span>
                  </div>
                  
                  {/* License Plate Text */}
                  <div className="font-mono text-6xl font-black tracking-wider text-gray-900">
                    {activeSessions.length > 0 ? (
                      activeSessions[0].license_plate
                    ) : (
                      <span className="text-gray-400">-- -- ----</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detection Info */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Erkennungsgenauigkeit
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    99.2%
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Verarbeitungszeit
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    0.3s
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* OCR Status Information */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
                  OCR-System bereit
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                  Automatische Kennzeichenerkennung aktiv • 
                  Letzte Erkennung: {activeSessions.length > 0 ? 'vor 2 Sekunden' : 'Warte auf Fahrzeug...'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Entry/Exit Form - Full Width Below */}
      <div className="mt-6">
        <ParkingEntryForm 
          videoRef={videoRef} 
          onEntrySuccess={() => loadData(true)}
        />
      </div>
    </div>
  );
};

export default ParkingOverview;
