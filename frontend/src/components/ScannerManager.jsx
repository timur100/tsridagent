import React, { useState, useEffect } from 'react';
import { Camera, Power, TestTube, Info, Activity, Settings, AlertCircle } from 'lucide-react';
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
    try {
      // Check if running in Electron with Regula Scanner
      if (window.electronAPI && window.electronAPI.isElectron) {
        console.log('🔍 Loading Regula Scanner status...');
        const regulaStatus = await window.electronAPI.checkScannerStatus();
        
        if (regulaStatus.online) {
          setStatus({
            success: true,
            connected: true,
            scanner_type: 'regula',
            scanner_name: 'Regula Document Reader',
            manufacturer: 'Regula',
            firmware_version: regulaStatus.version || 'Unknown',
            driver_version: regulaStatus.version || 'Unknown',
            simulated: false,
            last_scan: null
          });
          console.log('✅ Regula Scanner loaded:', regulaStatus);
          return;
        }
      }
      
      // Fallback: Load old Desko scanner status
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

  const isConnected = status && status.connected;
  const currentScanner = getCurrentScannerInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Scanner-Verwaltung
        </h2>
      </div>

      {/* Scanner Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Scanner-Status
        </h3>

        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/50">
              <div className="flex-1">
                <p className="text-lg font-semibold text-foreground">
                  {status.scanner_type === 'regula' ? 'Regula Document Reader' : currentScanner?.name || 'Scanner'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.scanner_type === 'regula' 
                    ? 'Regula - Professional Document Scanner' 
                    : currentScanner ? `${currentScanner.manufacturer} - ${currentScanner.model}` : 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-green-600">Verbunden</Badge>
                  {status.scanner_type === 'regula' && (
                    <Badge variant="outline" className="border-green-600 text-green-600">Live Scanner</Badge>
                  )}
                  {status.simulated && (
                    <Badge variant="outline" className="border-yellow-600 text-yellow-600">Simuliert</Badge>
                  )}
                </div>
              </div>
              <Camera className="h-12 w-12 text-green-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Firmware</p>
                <p className="font-semibold">
                  {status.firmware_version}
                  {!status.simulated && status.scanner_type === 'regula' && (
                    <span className="ml-2 text-xs text-green-600">✓ Live</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Treiber</p>
                <p className="font-semibold">
                  {status.driver_version}
                  {!status.simulated && status.scanner_type === 'regula' && (
                    <span className="ml-2 text-xs text-green-600">✓ Live</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Letzter Scan</p>
                <p className="font-semibold text-sm">{formatDate(status.last_scan)}</p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Scan-Anzahl</p>
                <p className="font-semibold">{status.scan_count}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => handleTest('basic')} disabled={loading} className="flex-1">
                <TestTube className="mr-2 h-4 w-4" />
                Schnelltest
              </Button>
              <Button onClick={() => handleTest('full')} disabled={loading} variant="outline" className="flex-1">
                <TestTube className="mr-2 h-4 w-4" />
                Vollständiger Test
              </Button>
              <Button onClick={handleDisconnect} disabled={loading} variant="outline">
                <Power className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {status && status.scanner_type ? 'Scanner nicht verbunden' : 'Kein Scanner konfiguriert'}
            </p>
          </div>
        )}
      </Card>

      {/* Scanner Configuration */}
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

      {/* Scanner Features */}
      {getSelectedScannerInfo() && (
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
