import React, { useState, useEffect } from 'react';
import { Camera, Power, TestTube, Info, Activity, Settings, AlertCircle, RefreshCw, Bug, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ScannerManager = () => {
  const [scannerTypes, setScannerTypes] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isElectron, setIsElectron] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Configuration state
  const [config, setConfig] = useState({
    scanner_type: 'desko',
    brightness: 80,
    resolution: 600,
    color_mode: 'color',
    auto_crop: true,
    auto_deskew: true
  });

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = window.isElectron && window.electronAPI;
    setIsElectron(checkElectron);
    
    loadScannerTypes();
    loadStatus();
    loadLogs();
  }, []);

  const loadScannerTypes = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scanner/types`);
      const data = await response.json();
      
      if (data.success) {
        setScannerTypes(data.types || {});
      }
    } catch (error) {
      console.error('Error loading scanner types:', error);
    }
  };

  const loadStatus = async () => {
    setLoading(true);
    try {
      // Check if running in Electron with Regula Scanner
      if (window.isElectron && window.electronAPI && window.electronAPI.getScannerStatus) {
        console.log('🔍 Loading Regula Scanner status via electron-edge-js...');
        const regulaStatus = await window.electronAPI.getScannerStatus();
        
        console.log('📊 Regula Status:', regulaStatus);
        
        setStatus({
          success: true,
          connected: regulaStatus.connected || false,
          initialized: regulaStatus.initialized || false,
          available: regulaStatus.available || false,
          scanner_type: 'regula',
          scanner_name: 'Regula 7028M.111',
          manufacturer: 'Regula',
          firmware_version: 'SDK via electron-edge-js',
          driver_version: regulaStatus.platform || 'Windows',
          simulated: false,
          last_scan: null,
          installedComponents: regulaStatus.installedComponents || [],
          lastError: regulaStatus.lastError || regulaStatus.error,
          platform: regulaStatus.platform
        });
        
        if (regulaStatus.available) {
          console.log('✅ Regula Scanner verfügbar:', regulaStatus);
        } else {
          console.log('⚠️ Regula Scanner nicht verfügbar:', regulaStatus.error);
        }
        
        setLoading(false);
        return;
      }
      
      // Fallback: Load old Desko scanner status from backend
      const response = await fetch(`${BACKEND_URL}/api/scanner/status`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
        if (data.configuration) {
          setConfig(prev => ({
            ...prev,
            ...data.configuration,
            scanner_type: data.scanner_type || prev.scanner_type
          }));
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
      setStatus({
        success: false,
        connected: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scanner/logs?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };
  
  const loadDebugInfo = async () => {
    if (!window.electronAPI || !window.electronAPI.getScannerDebugInfo) {
      toast.error('Debug-Info nur in Electron-App verfügbar');
      return;
    }
    
    setLoading(true);
    try {
      const info = await window.electronAPI.getScannerDebugInfo();
      setDebugInfo(info);
      setShowDebug(true);
      console.log('🔧 Scanner Debug Info:', info);
    } catch (error) {
      toast.error('Fehler beim Laden der Debug-Info');
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/scanner/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadStatus();
      } else {
        toast.error(data.detail || 'Fehler bei der Konfiguration');
      }
    } catch (error) {
      toast.error('Fehler bei der Konfiguration');
      console.error('Configure error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Use Electron API if available
      if (window.electronAPI && window.electronAPI.connectScanner) {
        console.log('🔌 Verbinde Regula Scanner...');
        const result = await window.electronAPI.connectScanner();
        
        if (result.success) {
          toast.success(result.message || 'Scanner verbunden');
          loadStatus();
        } else {
          toast.error(result.error || 'Verbindung fehlgeschlagen');
        }
        setLoading(false);
        return;
      }
      
      // Fallback to backend
      const response = await fetch(`${BACKEND_URL}/api/scanner/connect`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadStatus();
        loadLogs();
      } else {
        toast.error(data.detail || 'Fehler beim Verbinden');
      }
    } catch (error) {
      toast.error('Fehler beim Verbinden');
      console.error('Connect error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // Use Electron API if available
      if (window.electronAPI && window.electronAPI.disconnectScanner) {
        const result = await window.electronAPI.disconnectScanner();
        
        if (result.success) {
          toast.success(result.message || 'Scanner getrennt');
          loadStatus();
        } else {
          toast.error(result.error || 'Trennung fehlgeschlagen');
        }
        setLoading(false);
        return;
      }
      
      // Fallback to backend
      const response = await fetch(`${BACKEND_URL}/api/scanner/disconnect`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadStatus();
        loadLogs();
      } else {
        toast.error(data.detail || 'Fehler beim Trennen');
      }
    } catch (error) {
      toast.error('Fehler beim Trennen');
      console.error('Disconnect error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (testType = 'basic') => {
    setLoading(true);
    try {
      // Use Electron API for scan test if available
      if (window.electronAPI && window.electronAPI.triggerScan) {
        console.log('📸 Starte Test-Scan...');
        const result = await window.electronAPI.triggerScan({ testMode: true });
        
        if (result.success) {
          toast.success('Test-Scan erfolgreich');
          console.log('Scan-Ergebnis:', result);
          
          // Add to local logs
          setLogs(prev => [{
            log_id: Date.now(),
            event: 'test_scan',
            status: 'success',
            timestamp: new Date().toISOString()
          }, ...prev].slice(0, 20));
        } else {
          toast.error(result.error || 'Test-Scan fehlgeschlagen');
        }
        setLoading(false);
        return;
      }
      
      // Fallback to backend
      const response = await fetch(`${BACKEND_URL}/api/scanner/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: testType })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadLogs();
        loadStatus();
      } else {
        toast.error(data.detail || 'Test fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Test fehlgeschlagen');
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentScannerInfo = () => {
    if (!status || !status.scanner_type) return null;
    return scannerTypes[status.scanner_type] || null;
  };

  const getSelectedScannerInfo = () => {
    return scannerTypes[config.scanner_type] || null;
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Nie';
    return new Date(isoString).toLocaleString('de-DE');
  };

  const isConnected = status && (status.connected || status.initialized);
  const isAvailable = status && status.available;
  const currentScanner = getCurrentScannerInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Scanner-Verwaltung
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadStatus}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          {isElectron && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDebugInfo}
              disabled={loading}
            >
              <Bug className="h-4 w-4 mr-1" />
              Debug
            </Button>
          )}
        </div>
      </div>

      {/* Electron Status Banner */}
      {isElectron && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600">Electron-App</Badge>
            <span className="text-sm text-blue-400">
              Regula Scanner Integration via electron-edge-js
            </span>
          </div>
          {status?.platform && (
            <p className="text-xs text-muted-foreground mt-1">
              Plattform: {status.platform}
            </p>
          )}
        </div>
      )}

      {/* Scanner Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Scanner-Status
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Lade Scanner-Status...</span>
          </div>
        ) : isConnected || isAvailable ? (
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              isConnected 
                ? 'bg-green-500/10 border-green-500/50' 
                : 'bg-yellow-500/10 border-yellow-500/50'
            }`}>
              <div className="flex-1">
                <p className="text-lg font-semibold text-foreground">
                  {status.scanner_type === 'regula' ? 'Regula 7028M.111' : currentScanner?.name || 'Scanner'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.scanner_type === 'regula' 
                    ? 'Regula - Professional Document Scanner (COM/ActiveX)' 
                    : currentScanner ? `${currentScanner.manufacturer} - ${currentScanner.model}` : 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isConnected ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verbunden
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      Verfügbar
                    </Badge>
                  )}
                  {status.initialized && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      Initialisiert
                    </Badge>
                  )}
                  {status.scanner_type === 'regula' && (
                    <Badge variant="outline" className="border-blue-600 text-blue-600">
                      electron-edge-js
                    </Badge>
                  )}
                  {status.simulated && (
                    <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                      Simuliert
                    </Badge>
                  )}
                </div>
              </div>
              <Camera className={`h-12 w-12 ${isConnected ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>

            {/* Installed Components */}
            {status.installedComponents && status.installedComponents.length > 0 && (
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-2">Gefundene COM-Komponenten:</p>
                <div className="flex flex-wrap gap-2">
                  {status.installedComponents.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {status.lastError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {status.lastError}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Integration</p>
                <p className="font-semibold">
                  {status.firmware_version}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Plattform</p>
                <p className="font-semibold">
                  {status.driver_version || status.platform || 'Windows'}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Letzter Scan</p>
                <p className="font-semibold text-sm">{formatDate(status.last_scan)}</p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">
                  {isConnected ? 'Bereit' : isAvailable ? 'Verfügbar' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isConnected && isAvailable && (
                <Button onClick={handleConnect} disabled={loading} className="flex-1">
                  <Power className="mr-2 h-4 w-4" />
                  Verbinden
                </Button>
              )}
              {isConnected && (
                <>
                  <Button onClick={() => handleTest('basic')} disabled={loading} className="flex-1">
                    <TestTube className="mr-2 h-4 w-4" />
                    Test-Scan
                  </Button>
                  <Button onClick={handleDisconnect} disabled={loading} variant="outline">
                    <Power className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              {isElectron 
                ? 'Regula Scanner nicht gefunden' 
                : status && status.scanner_type 
                  ? 'Scanner nicht verbunden' 
                  : 'Kein Scanner konfiguriert'}
            </p>
            {status?.error && (
              <p className="text-sm text-red-400 mb-4">{status.error}</p>
            )}
            {isElectron && (
              <div className="text-sm text-muted-foreground space-y-1 mt-4">
                <p>Stellen Sie sicher, dass:</p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto">
                  <li>Die Regula SDK installiert ist</li>
                  <li>Der Scanner-Treiber installiert ist</li>
                  <li>Der Scanner per USB verbunden ist</li>
                  <li>.NET Framework 4.x installiert ist</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Debug Info Modal */}
      {showDebug && debugInfo && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug-Informationen
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
              Schließen
            </Button>
          </div>
          
          {debugInfo.success ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Type Name:</p>
                <code className="text-xs bg-muted p-2 rounded block">{debugInfo.typeName}</code>
              </div>
              
              {debugInfo.methods && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Verfügbare Methoden ({debugInfo.methods.length}):
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded">
                    <code className="text-xs whitespace-pre-wrap">
                      {debugInfo.methods.join(', ')}
                    </code>
                  </div>
                </div>
              )}
              
              {debugInfo.properties && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Verfügbare Properties ({debugInfo.properties.length}):
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded">
                    <code className="text-xs whitespace-pre-wrap">
                      {debugInfo.properties.join(', ')}
                    </code>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-400">{debugInfo.error}</p>
          )}
        </Card>
      )}

      {/* Scanner Configuration - nur für Backend-Scanner */}
      {!isElectron && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scanner-Konfiguration
          </h3>

          <div className="space-y-4">
            {/* Scanner Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Scanner-Typ
              </label>
              <select
                value={config.scanner_type}
                onChange={(e) => setConfig({ ...config, scanner_type: e.target.value })}
                disabled={isConnected}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="desko">Desko Pentascanner</option>
                <option value="regula">Regula 7028M</option>
                <option value="generic">Generischer Scanner</option>
              </select>
              {getSelectedScannerInfo() && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getSelectedScannerInfo().manufacturer} - {getSelectedScannerInfo().model}
                </p>
              )}
            </div>

            {/* Resolution */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Auflösung (DPI)
                </label>
                <select
                  value={config.resolution}
                  onChange={(e) => setConfig({ ...config, resolution: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  {getSelectedScannerInfo()?.supported_resolutions?.map(res => (
                    <option key={res} value={res}>{res} DPI</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Helligkeit
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.brightness}
                  onChange={(e) => setConfig({ ...config, brightness: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-sm text-center text-muted-foreground">{config.brightness}%</p>
              </div>
            </div>

            {/* Color Mode */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Farbmodus
              </label>
              <select
                value={config.color_mode}
                onChange={(e) => setConfig({ ...config, color_mode: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="color">Farbe</option>
                <option value="grayscale">Graustufen</option>
                <option value="bw">Schwarz/Weiß</option>
              </select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.auto_crop}
                  onChange={(e) => setConfig({ ...config, auto_crop: e.target.checked })}
                />
                <span className="text-sm">Automatischer Zuschnitt</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.auto_deskew}
                  onChange={(e) => setConfig({ ...config, auto_deskew: e.target.checked })}
                />
                <span className="text-sm">Automatische Ausrichtung</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleConfigure}
                disabled={loading || isConnected}
                className="flex-1"
              >
                <Settings className="mr-2 h-4 w-4" />
                {loading ? 'Speichere...' : 'Konfiguration speichern'}
              </Button>
              <Button
                onClick={handleConnect}
                disabled={loading || isConnected || !status?.scanner_type}
                className="flex-1"
              >
                <Power className="mr-2 h-4 w-4" />
                Verbinden
              </Button>
            </div>
            
            {isConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Trennen Sie den Scanner, um die Konfiguration zu ändern
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Scanner Features */}
      {getSelectedScannerInfo() && !isElectron && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Unterstützte Funktionen
          </h3>
          <div className="flex flex-wrap gap-2">
            {getSelectedScannerInfo().features.map((feature) => (
              <Badge key={feature} variant="secondary">
                {feature.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Regula Features - nur in Electron */}
      {isElectron && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Regula Scanner Funktionen
          </h3>
          <div className="flex flex-wrap gap-2">
            {['MRZ Lesen', 'UV Licht', 'IR Licht', 'Weißlicht', 'RFID', 'Hologramm-Check', 'Authentizitätsprüfung'].map((feature) => (
              <Badge key={feature} variant="secondary">
                {feature}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Die verfügbaren Funktionen hängen von Ihrer Regula SDK Version und Lizenz ab.
          </p>
        </Card>
      )}

      {/* Event Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Scanner-Ereignisse</h3>
        
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Keine Ereignisse</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border text-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground capitalize">{log.event}</p>
                  {log.test_type && (
                    <p className="text-xs text-muted-foreground">Test-Typ: {log.test_type}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                    {log.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScannerManager;
