import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Smartphone, Home, Camera, Package, Settings, LogOut, 
  RefreshCw, Wifi, WifiOff, ChevronRight, Eye, EyeOff,
  Search, Filter, X, Clock, User, Building, Barcode,
  Printer, Bluetooth, Volume2, Vibrate, Sun, Moon,
  CheckCircle, AlertCircle, Info, Truck, History, 
  CloudOff, Cloud, Database, Plus, Trash2, Edit, Save
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mobile App Theme (matching the React Native theme)
const mobileTheme = {
  colors: {
    primary: '#c00000',
    primaryDark: '#a00000',
    background: '#1a1a1a',
    surface: '#2a2a2a',
    surfaceLight: '#3a3a3a',
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    border: '#374151',
  },
};

// Phone Frame Component
const PhoneFrame = ({ children, title = "TSRID Mobile" }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative" style={{ width: 375, height: 812 }}>
      {/* Phone outer frame */}
      <div 
        className="absolute inset-0 rounded-[3rem] shadow-2xl"
        style={{ 
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          border: '8px solid #1a1a1a',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Notch */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 rounded-b-2xl z-20"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-gray-800" />
        </div>

        {/* Status bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-6 z-10"
          style={{ backgroundColor: mobileTheme.colors.background }}
        >
          <span className="text-white text-sm font-medium">
            {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1">
            <Wifi className="w-4 h-4 text-white" />
            <div className="flex gap-0.5">
              {[1,2,3,4].map(i => (
                <div key={i} className={`w-1 rounded-full ${i <= 3 ? 'bg-white' : 'bg-gray-600'}`} style={{ height: 4 + i * 2 }} />
              ))}
            </div>
            <div className="ml-1 px-1 py-0.5 bg-white/20 rounded text-[10px] text-white">87%</div>
          </div>
        </div>

        {/* Screen content */}
        <div 
          className="absolute top-12 bottom-1 left-1 right-1 overflow-hidden rounded-b-[2.5rem]"
          style={{ backgroundColor: mobileTheme.colors.background }}
        >
          {children}
        </div>

        {/* Home indicator */}
        <div 
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full"
          style={{ backgroundColor: '#4a4a4a' }}
        />
      </div>
    </div>
  );
};

// Login Screen
const MobileLoginScreen = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }
    setError('');
    onLogin(email, password);
  };

  const fillDemo = () => {
    setEmail('admin@tsrid.com');
    setPassword('admin123');
  };

  return (
    <div className="flex flex-col h-full p-6" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Logo */}
      <div className="flex flex-col items-center mt-8 mb-8">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg"
          style={{ backgroundColor: mobileTheme.colors.primary }}
        >
          <span className="text-white font-bold text-xl">TSRID</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Mobile</h1>
        <p style={{ color: mobileTheme.colors.textSecondary }}>Zebra TC78 Scanner App</p>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: mobileTheme.colors.surface }}>
        <h2 className="text-xl font-bold text-white text-center mb-1">Anmelden</h2>
        <p className="text-center mb-4" style={{ color: mobileTheme.colors.textSecondary }}>Willkommen zurück</p>

        {error && (
          <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(239,68,68,0.2)', borderColor: mobileTheme.colors.error }}>
            <p className="text-sm text-center" style={{ color: mobileTheme.colors.error }}>{error}</p>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-3">
          <label className="text-sm font-semibold mb-1 block" style={{ color: mobileTheme.colors.textSecondary }}>E-Mail</label>
          <div className="flex items-center rounded-lg px-3" style={{ backgroundColor: mobileTheme.colors.background, border: `1px solid ${mobileTheme.colors.border}` }}>
            <span className="mr-2">📧</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre.email@firma.de"
              className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label className="text-sm font-semibold mb-1 block" style={{ color: mobileTheme.colors.textSecondary }}>Passwort</label>
          <div className="flex items-center rounded-lg px-3" style={{ backgroundColor: mobileTheme.colors.background, border: `1px solid ${mobileTheme.colors.border}` }}>
            <span className="mr-2">🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
            />
            <button onClick={() => setShowPassword(!showPassword)} className="p-1">
              {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: mobileTheme.colors.primary }}
        >
          {loading ? 'Bitte warten...' : 'Anmelden'}
        </button>

        {/* Demo Credentials */}
        <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: mobileTheme.colors.info }}>Demo-Zugang:</p>
          <p className="text-xs" style={{ color: mobileTheme.colors.info }}>E-Mail: admin@tsrid.com</p>
          <p className="text-xs" style={{ color: mobileTheme.colors.info }}>Passwort: admin123</p>
          <button 
            onClick={fillDemo}
            className="mt-2 w-full py-2 rounded text-sm font-medium"
            style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: mobileTheme.colors.info }}
          >
            Demo-Daten einfügen
          </button>
        </div>
      </div>

      <div className="mt-auto text-center">
        <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>TSRID Mobile v1.0.0</p>
        <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>Optimiert für Zebra TC78</p>
      </div>
    </div>
  );
};

// Dashboard Screen
const MobileDashboardScreen = ({ user, stats, serverStatus, onNavigate }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: mobileTheme.colors.primary }}>
        <h1 className="text-lg font-bold text-white">Dashboard</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Welcome Section */}
        <div>
          <p style={{ color: mobileTheme.colors.textSecondary }}>Willkommen zurück,</p>
          <h2 className="text-xl font-bold text-white">{user?.name || user?.email || 'Benutzer'}</h2>
          <div 
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full mt-1"
            style={{ backgroundColor: serverStatus === 'online' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: serverStatus === 'online' ? mobileTheme.colors.success : mobileTheme.colors.error }}
            />
            <span className="text-xs font-medium" style={{ color: serverStatus === 'online' ? mobileTheme.colors.success : mobileTheme.colors.error }}>
              {serverStatus === 'online' ? 'Server verbunden' : 'Server offline'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-base font-semibold text-white mb-3">Schnellzugriff</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '📷', label: 'Scannen', tab: 'scanner' },
              { icon: '📦', label: 'Assets', tab: 'assets' },
              { icon: '🏷️', label: 'Labels', tab: 'labels' },
              { icon: '📍', label: 'Standorte', tab: 'locations' },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                className="flex flex-col items-center p-3 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: mobileTheme.colors.surface }}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-xs text-white font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div>
          <h3 className="text-base font-semibold text-white mb-3">Systemübersicht</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📱', label: 'Geräte', value: stats.total_devices || 0 },
              { icon: '🟢', label: 'Online', value: stats.online_devices || 0, color: mobileTheme.colors.success },
              { icon: '🔴', label: 'Offline', value: stats.offline_devices || 0, color: mobileTheme.colors.error },
              { icon: '📍', label: 'Standorte', value: stats.total_locations || 0 },
              { icon: '👥', label: 'Kunden', value: stats.total_tenants || 0 },
              { icon: '👤', label: 'Mitarbeiter', value: stats.total_users || 0 },
            ].map((stat, i) => (
              <div key={i} className="flex items-center p-3 rounded-lg" style={{ backgroundColor: mobileTheme.colors.surface }}>
                <span className="text-2xl mr-3">{stat.icon}</span>
                <div>
                  <p className="text-xs" style={{ color: mobileTheme.colors.textSecondary }}>{stat.label}</p>
                  <p className="text-lg font-bold" style={{ color: stat.color || 'white' }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Status */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: mobileTheme.colors.surface }}>
          <h3 className="text-base font-semibold text-white mb-3">Gerätestatus</h3>
          <div className="flex justify-around mb-3">
            {[
              { label: 'Online', value: stats.online_devices || 0, color: mobileTheme.colors.success },
              { label: 'Offline', value: stats.offline_devices || 0, color: mobileTheme.colors.error },
              { label: 'Vorbereitung', value: stats.in_preparation || 0, color: mobileTheme.colors.warning },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                <p className="text-xs" style={{ color: mobileTheme.colors.textSecondary }}>{item.label}</p>
                <p className="text-lg font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="flex h-2 rounded overflow-hidden" style={{ backgroundColor: mobileTheme.colors.surfaceLight }}>
            <div style={{ flex: stats.online_devices || 1, backgroundColor: mobileTheme.colors.success }} />
            <div style={{ flex: stats.offline_devices || 0.1, backgroundColor: mobileTheme.colors.error }} />
            <div style={{ flex: stats.in_preparation || 0.1, backgroundColor: mobileTheme.colors.warning }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Scanner Screen with real barcode lookup
const MobileScannerScreen = ({ assets, onLookupAsset }) => {
  const [flashOn, setFlashOn] = useState(false);
  const [scanMode, setScanMode] = useState('camera');
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  const performLookup = async (code) => {
    setScanning(true);
    const timestamp = new Date().toLocaleString('de-DE');
    
    // Look up in assets by various fields
    const foundAsset = assets.find(a => 
      a.warehouse_asset_id === code ||
      a.manufacturer_sn === code ||
      a.imei === code ||
      a.mac === code ||
      a.asset_id === code
    );

    const scanResult = {
      code,
      timestamp,
      found: !!foundAsset,
      asset: foundAsset || null
    };

    setLastScan(scanResult);
    setScanHistory(prev => [scanResult, ...prev].slice(0, 50)); // Keep last 50 scans
    setScanning(false);
    setManualBarcode('');
    
    return scanResult;
  };

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      performLookup(manualBarcode.trim());
    }
  };

  const simulateScan = () => {
    // Simulate scanning a random asset or unknown code
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
    const codes = [
      randomAsset?.warehouse_asset_id,
      randomAsset?.manufacturer_sn,
      'UNKNOWN-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    ].filter(Boolean);
    const code = codes[Math.floor(Math.random() * codes.length)];
    performLookup(code);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center" style={{ backgroundColor: mobileTheme.colors.primary }}>
        <h1 className="text-lg font-bold text-white">Scanner</h1>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 rounded-lg bg-white/20"
        >
          <History className="w-5 h-5 text-white" />
        </button>
      </div>

      {showHistory ? (
        /* Scan History View */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-semibold">Scan-Historie</h2>
            {scanHistory.length > 0 && (
              <button 
                onClick={() => setScanHistory([])}
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: mobileTheme.colors.error }}
              >
                Löschen
              </button>
            )}
          </div>
          {scanHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto mb-2" style={{ color: mobileTheme.colors.textMuted }} />
              <p style={{ color: mobileTheme.colors.textMuted }}>Keine Scans vorhanden</p>
            </div>
          ) : (
            scanHistory.map((scan, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: mobileTheme.colors.surface }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{scan.code}</p>
                    <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>{scan.timestamp}</p>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ 
                      backgroundColor: scan.found ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      color: scan.found ? mobileTheme.colors.success : mobileTheme.colors.error
                    }}
                  >
                    {scan.found ? 'Gefunden' : 'Nicht gefunden'}
                  </span>
                </div>
                {scan.asset && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: mobileTheme.colors.border }}>
                    <p className="text-sm" style={{ color: mobileTheme.colors.primary }}>{scan.asset.warehouse_asset_id}</p>
                    <p className="text-xs" style={{ color: mobileTheme.colors.textSecondary }}>{scan.asset.type_label} • {scan.asset.status}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Scanner View */
        <>
          {/* Camera Preview Simulation */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-56 h-56 border-2 relative"
                style={{ borderColor: mobileTheme.colors.primary }}
              >
                {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4', 'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'].map((pos, i) => (
                  <div key={i} className={`absolute w-6 h-6 ${pos}`} style={{ borderColor: mobileTheme.colors.primary }} />
                ))}
                <div 
                  className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse"
                  style={{ backgroundColor: mobileTheme.colors.primary, opacity: 0.8 }}
                />
              </div>
            </div>
            <div className="absolute top-4 left-0 right-0 text-center">
              <p className="text-white font-semibold text-shadow">
                {scanMode === 'manual' ? 'Barcode manuell eingeben' : 'Barcode oder QR-Code scannen'}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900/80" />
          </div>

          {/* Controls */}
          <div className="p-3 space-y-2" style={{ backgroundColor: mobileTheme.colors.background }}>
            {/* Mode Toggle */}
            <div className="flex p-1 rounded-lg" style={{ backgroundColor: mobileTheme.colors.surface }}>
              {['camera', 'manual'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className="flex-1 py-2 rounded font-medium text-white transition-all text-sm"
                  style={{ backgroundColor: scanMode === mode ? mobileTheme.colors.primary : 'transparent' }}
                >
                  {mode === 'camera' ? '📷 Kamera' : '⌨️ Manuell'}
                </button>
              ))}
            </div>

            {/* Manual Input */}
            {scanMode === 'manual' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                  placeholder="Barcode eingeben..."
                  className="flex-1 px-3 py-2 rounded-lg text-white outline-none"
                  style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
                />
                <button
                  onClick={handleManualScan}
                  disabled={!manualBarcode || scanning}
                  className="px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: mobileTheme.colors.primary }}
                >
                  {scanning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Camera Mode Buttons */}
            {scanMode === 'camera' && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setFlashOn(!flashOn)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: flashOn ? mobileTheme.colors.primary : mobileTheme.colors.surface }}
                >
                  <span>💡</span>
                  <span className="text-white text-sm">Blitz</span>
                </button>
                <button
                  onClick={simulateScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: mobileTheme.colors.primary }}
                >
                  {scanning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  <span className="text-sm">Scannen</span>
                </button>
              </div>
            )}

            {/* Last Scan Result */}
            {lastScan && (
              <div 
                className="p-3 rounded-lg border"
                style={{ 
                  backgroundColor: mobileTheme.colors.surface,
                  borderColor: lastScan.found ? mobileTheme.colors.success : mobileTheme.colors.warning
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>Letzter Scan</p>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: lastScan.found ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                      color: lastScan.found ? mobileTheme.colors.success : mobileTheme.colors.warning
                    }}
                  >
                    {lastScan.found ? '✓ Gefunden' : '? Unbekannt'}
                  </span>
                </div>
                <p className="text-base font-semibold text-white">{lastScan.code}</p>
                {lastScan.asset && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: mobileTheme.colors.border }}>
                    <p style={{ color: mobileTheme.colors.primary }} className="font-semibold">{lastScan.asset.warehouse_asset_id}</p>
                    <p className="text-xs" style={{ color: mobileTheme.colors.textSecondary }}>
                      {lastScan.asset.type_label} • {lastScan.asset.manufacturer || '-'} • {lastScan.asset.status}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Assets Screen
const MobileAssetsScreen = ({ assets, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery || 
      asset.warehouse_asset_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.manufacturer_sn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type_label?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status?.toLowerCase().includes(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('verfügbar') || s.includes('available')) return { bg: '#22c55e20', color: '#22c55e' };
    if (s.includes('zugewiesen') || s.includes('assigned')) return { bg: '#3b82f620', color: '#3b82f6' };
    if (s.includes('wartung')) return { bg: '#f59e0b20', color: '#f59e0b' };
    if (s.includes('defekt')) return { bg: '#ef444420', color: '#ef4444' };
    return { bg: '#6b728020', color: '#6b7280' };
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: mobileTheme.colors.primary }}>
        <h1 className="text-lg font-bold text-white">Assets</h1>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="flex items-center rounded-lg px-3" style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}>
          <Search className="w-5 h-5 mr-2" style={{ color: mobileTheme.colors.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Asset suchen..."
            className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-5 h-5" style={{ color: mobileTheme.colors.textMuted }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 px-3 pb-2 overflow-x-auto">
        {['all', 'verfügbar', 'zugewiesen', 'wartung'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{ 
              backgroundColor: statusFilter === filter ? mobileTheme.colors.primary : mobileTheme.colors.surface,
              color: 'white',
              border: `1px solid ${statusFilter === filter ? mobileTheme.colors.primary : mobileTheme.colors.border}`
            }}
          >
            {filter === 'all' ? 'Alle' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="px-3 py-2 text-sm" style={{ color: mobileTheme.colors.textMuted }}>
        {filteredAssets.length} Asset{filteredAssets.length !== 1 ? 's' : ''} gefunden
      </p>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
            <p className="mt-2 text-sm" style={{ color: mobileTheme.colors.textSecondary }}>Assets werden geladen...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-5xl mb-3">📦</span>
            <p className="font-semibold text-white">Keine Assets gefunden</p>
            <p className="text-sm" style={{ color: mobileTheme.colors.textMuted }}>
              {searchQuery ? 'Versuchen Sie eine andere Suche' : 'Noch keine Assets vorhanden'}
            </p>
          </div>
        ) : (
          filteredAssets.slice(0, 20).map((asset, i) => {
            const statusStyle = getStatusStyle(asset.status);
            return (
              <div 
                key={asset.asset_id || i}
                onClick={() => setSelectedAsset(asset)}
                className="p-3 rounded-lg cursor-pointer transition-all hover:opacity-80"
                style={{ backgroundColor: mobileTheme.colors.surface }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold" style={{ color: mobileTheme.colors.primary }}>
                    {asset.warehouse_asset_id || asset.asset_id || 'Keine ID'}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                  >
                    {asset.status || 'Unbekannt'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex">
                    <span className="w-20" style={{ color: mobileTheme.colors.textMuted }}>Typ:</span>
                    <span className="text-white">{asset.type_label || asset.type || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20" style={{ color: mobileTheme.colors.textMuted }}>Hersteller:</span>
                    <span className="text-white">{asset.manufacturer || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20" style={{ color: mobileTheme.colors.textMuted }}>Seriennr.:</span>
                    <span className="text-white">{asset.manufacturer_sn || '-'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="absolute inset-0 bg-black/50 flex items-end">
          <div className="w-full max-h-[80%] rounded-t-2xl overflow-hidden" style={{ backgroundColor: mobileTheme.colors.background }}>
            <div className="p-4 flex justify-between items-center" style={{ backgroundColor: mobileTheme.colors.primary }}>
              <h2 className="text-lg font-bold text-white">Asset Details</h2>
              <button onClick={() => setSelectedAsset(null)} className="text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 400 }}>
              <div className="mb-3">
                <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>Asset-ID</p>
                <p className="text-xl font-bold" style={{ color: mobileTheme.colors.primary }}>
                  {selectedAsset.warehouse_asset_id || selectedAsset.asset_id}
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Typ', value: selectedAsset.type_label || selectedAsset.type },
                  { label: 'Hersteller', value: selectedAsset.manufacturer },
                  { label: 'Modell', value: selectedAsset.model },
                  { label: 'Seriennummer', value: selectedAsset.manufacturer_sn },
                  { label: 'IMEI', value: selectedAsset.imei },
                  { label: 'MAC', value: selectedAsset.mac },
                  { label: 'Status', value: selectedAsset.status },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b" style={{ borderColor: mobileTheme.colors.border }}>
                    <span style={{ color: mobileTheme.colors.textMuted }}>{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Screen
const MobileSettingsScreen = ({ user, onLogout }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: mobileTheme.colors.primary }}>
        <h1 className="text-lg font-bold text-white">Einstellungen</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="flex items-center p-4 rounded-xl" style={{ backgroundColor: mobileTheme.colors.surface }}>
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center mr-4"
            style={{ backgroundColor: mobileTheme.colors.primary }}
          >
            <span className="text-2xl font-bold text-white">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">{user?.name || 'Benutzer'}</p>
            <p className="text-sm" style={{ color: mobileTheme.colors.textSecondary }}>{user?.email}</p>
            <span 
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${mobileTheme.colors.primary}30`, color: mobileTheme.colors.primary }}
            >
              {user?.role || 'Benutzer'}
            </span>
          </div>
        </div>

        {/* Settings Sections */}
        {[
          {
            title: 'Scanner',
            items: [
              { icon: <Camera className="w-5 h-5" />, label: 'Automatischer Fokus', toggle: true, value: true },
              { icon: <Sun className="w-5 h-5" />, label: 'Blitz automatisch', toggle: true, value: false },
              { icon: <Volume2 className="w-5 h-5" />, label: 'Ton bei Scan', toggle: true, value: true },
              { icon: <Vibrate className="w-5 h-5" />, label: 'Vibration bei Scan', toggle: true, value: true },
            ]
          },
          {
            title: 'Drucker',
            items: [
              { icon: <Bluetooth className="w-5 h-5" />, label: 'Bluetooth-Drucker', value: 'Nicht verbunden' },
              { icon: <Barcode className="w-5 h-5" />, label: 'Label-Format', value: '50x30mm' },
            ]
          },
          {
            title: 'Synchronisation',
            items: [
              { icon: <RefreshCw className="w-5 h-5" />, label: 'Automatische Sync', toggle: true, value: true },
              { icon: <Wifi className="w-5 h-5" />, label: 'Sync-Intervall', value: '5 Minuten' },
            ]
          },
          {
            title: 'App',
            items: [
              { icon: <Info className="w-5 h-5" />, label: 'App-Version', value: '1.0.0', noArrow: true },
              { icon: <Smartphone className="w-5 h-5" />, label: 'Gerät', value: 'Zebra TC78', noArrow: true },
            ]
          },
        ].map((section, si) => (
          <div key={si}>
            <h3 className="text-sm font-semibold mb-2 px-1" style={{ color: mobileTheme.colors.textMuted }}>
              {section.title}
            </h3>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: mobileTheme.colors.surface }}>
              {section.items.map((item, ii) => (
                <div 
                  key={ii}
                  className="flex items-center justify-between p-3 border-b last:border-b-0"
                  style={{ borderColor: mobileTheme.colors.border }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: mobileTheme.colors.textSecondary }}>{item.icon}</span>
                    <span className="text-white">{item.label}</span>
                  </div>
                  {item.toggle ? (
                    <div 
                      className="w-10 h-6 rounded-full p-1 cursor-pointer transition-all"
                      style={{ backgroundColor: item.value ? mobileTheme.colors.primary : mobileTheme.colors.border }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full bg-white transition-all"
                        style={{ marginLeft: item.value ? 16 : 0 }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: mobileTheme.colors.textMuted }}>{item.value}</span>
                      {!item.noArrow && <ChevronRight className="w-4 h-4" style={{ color: mobileTheme.colors.textMuted }} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border"
          style={{ 
            backgroundColor: 'rgba(239,68,68,0.1)', 
            borderColor: 'rgba(239,68,68,0.3)',
            color: mobileTheme.colors.error 
          }}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">Abmelden</span>
        </button>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: mobileTheme.colors.textMuted }}>TSRID Mobile v1.0.0</p>
          <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>© 2024 TSRID GmbH</p>
        </div>
      </div>
    </div>
  );
};

// Wareneingang (Goods Receipt) Screen
const MobileWareneingangScreen = ({ assets, onCreateAsset, offlineQueue, isOnline }) => {
  const [scannedItems, setScannedItems] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    type_label: 'Scanner',
    manufacturer: '',
    model: '',
    manufacturer_sn: '',
  });

  const deviceTypes = [
    'Scanner', 'Tablet', 'Smartphone', 'Drucker', 'Laptop', 
    'Monitor', 'Docking Station', 'Kabel', 'Adapter', 'Sonstiges'
  ];

  const addScannedItem = () => {
    if (manualInput.trim()) {
      // Check if already in assets
      const existingAsset = assets.find(a => 
        a.manufacturer_sn === manualInput.trim() || 
        a.warehouse_asset_id === manualInput.trim()
      );

      setScannedItems(prev => [...prev, {
        id: Date.now(),
        code: manualInput.trim(),
        timestamp: new Date().toLocaleString('de-DE'),
        isNew: !existingAsset,
        existingAsset
      }]);
      setManualInput('');
    }
  };

  const removeItem = (id) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateAsset = () => {
    if (newAsset.manufacturer_sn) {
      const asset = {
        ...newAsset,
        created_at: new Date().toISOString(),
        status: 'Verfügbar',
        isOffline: !isOnline
      };
      
      if (onCreateAsset) {
        onCreateAsset(asset);
      }

      setScannedItems(prev => [...prev, {
        id: Date.now(),
        code: newAsset.manufacturer_sn,
        timestamp: new Date().toLocaleString('de-DE'),
        isNew: true,
        pendingCreate: true,
        asset
      }]);

      setNewAsset({
        type_label: 'Scanner',
        manufacturer: '',
        model: '',
        manufacturer_sn: '',
      });
      setShowForm(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: mobileTheme.colors.background }}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center" style={{ backgroundColor: mobileTheme.colors.primary }}>
        <h1 className="text-lg font-bold text-white">Wareneingang</h1>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-500">
              <CloudOff className="w-3 h-3 inline mr-1" />
              Offline
            </span>
          )}
          <span className="text-xs text-white/70">{scannedItems.length} erfasst</span>
        </div>
      </div>

      {/* Quick Input */}
      <div className="p-3 border-b" style={{ borderColor: mobileTheme.colors.border }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addScannedItem()}
            placeholder="Seriennummer scannen/eingeben..."
            className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
            style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
          />
          <button
            onClick={addScannedItem}
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: mobileTheme.colors.primary }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: mobileTheme.colors.surface }}
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* New Asset Form Modal */}
      {showForm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="w-full max-w-sm rounded-xl p-4" style={{ backgroundColor: mobileTheme.colors.background }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-semibold">Neues Asset</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: mobileTheme.colors.textMuted }}>Gerätetyp</label>
                <select
                  value={newAsset.type_label}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, type_label: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
                >
                  {deviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: mobileTheme.colors.textMuted }}>Seriennummer *</label>
                <input
                  type="text"
                  value={newAsset.manufacturer_sn}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, manufacturer_sn: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: mobileTheme.colors.textMuted }}>Hersteller</label>
                <input
                  type="text"
                  value={newAsset.manufacturer}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: mobileTheme.colors.textMuted }}>Modell</label>
                <input
                  type="text"
                  value={newAsset.model}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: mobileTheme.colors.surface, border: `1px solid ${mobileTheme.colors.border}` }}
                />
              </div>
            </div>

            <button
              onClick={handleCreateAsset}
              disabled={!newAsset.manufacturer_sn}
              className="w-full mt-4 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: mobileTheme.colors.primary }}
            >
              <Save className="w-4 h-4 inline mr-2" />
              Asset anlegen
            </button>
          </div>
        </div>
      )}

      {/* Scanned Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {scannedItems.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="w-12 h-12 mx-auto mb-2" style={{ color: mobileTheme.colors.textMuted }} />
            <p style={{ color: mobileTheme.colors.textMuted }}>Keine Artikel erfasst</p>
            <p className="text-xs mt-1" style={{ color: mobileTheme.colors.textMuted }}>
              Scannen Sie Barcodes oder geben Sie Seriennummern ein
            </p>
          </div>
        ) : (
          scannedItems.map((item) => (
            <div 
              key={item.id}
              className="p-3 rounded-lg flex justify-between items-start"
              style={{ backgroundColor: mobileTheme.colors.surface }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.code}</p>
                  {item.isNew && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-500">
                      NEU
                    </span>
                  )}
                  {item.pendingCreate && !isOnline && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-500">
                      PENDING
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: mobileTheme.colors.textMuted }}>{item.timestamp}</p>
                {item.existingAsset && (
                  <p className="text-xs mt-1" style={{ color: mobileTheme.colors.primary }}>
                    {item.existingAsset.warehouse_asset_id} • {item.existingAsset.type_label}
                  </p>
                )}
                {item.asset && (
                  <p className="text-xs mt-1" style={{ color: mobileTheme.colors.success }}>
                    {item.asset.type_label} • {item.asset.manufacturer || 'Kein Hersteller'}
                  </p>
                )}
              </div>
              <button onClick={() => removeItem(item.id)} className="p-1">
                <Trash2 className="w-4 h-4" style={{ color: mobileTheme.colors.error }} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Offline Queue Info */}
      {offlineQueue > 0 && (
        <div className="p-3 border-t" style={{ borderColor: mobileTheme.colors.border, backgroundColor: 'rgba(245,158,11,0.1)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4" style={{ color: mobileTheme.colors.warning }} />
              <span className="text-sm" style={{ color: mobileTheme.colors.warning }}>
                {offlineQueue} Änderungen warten auf Sync
              </span>
            </div>
            <button 
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: mobileTheme.colors.warning, color: '#000' }}
            >
              Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab Bar Component
const MobileTabBar = ({ activeTab, onTabChange, offlineQueue, isOnline }) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'wareneingang', icon: Truck, label: 'Eingang' },
    { id: 'scanner', icon: Camera, label: 'Scan' },
    { id: 'assets', icon: Package, label: 'Assets' },
    { id: 'settings', icon: Settings, label: 'Setup' },
  ];

  return (
    <div 
      className="flex border-t"
      style={{ backgroundColor: mobileTheme.colors.surface, borderColor: mobileTheme.colors.border }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center py-2 transition-all"
          >
            <Icon 
              className="w-6 h-6 mb-0.5" 
              style={{ color: isActive ? mobileTheme.colors.primary : mobileTheme.colors.textMuted }}
            />
            <span 
              className="text-xs font-medium"
              style={{ color: isActive ? mobileTheme.colors.primary : mobileTheme.colors.textMuted }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Main Mobile App Preview Component
const MobileAppPreview = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  
  // Mobile app state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileUser, setMobileUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [stats, setStats] = useState({});
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
      loadAssets();
    }
  }, [isLoggedIn]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        apiCall('/api/tenants/stats').catch(() => ({})),
        apiCall('/api/health').catch(() => ({ status: 'error' })),
      ]);
      if (statsRes?.success && statsRes?.data) {
        setStats(statsRes.data);
      }
      setServerStatus(healthRes?.status === 'healthy' ? 'online' : 'offline');
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const result = await apiCall('/api/asset-mgmt/inventory/all');
      if (result?.success && result?.data?.assets) {
        setAssets(result.data.assets);
      } else if (Array.isArray(result?.data)) {
        setAssets(result.data);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/portal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (data.access_token && data.user) {
        setMobileUser(data.user);
        setIsLoggedIn(true);
      } else {
        alert('Login fehlgeschlagen: ' + (data.detail || 'Ungültige Anmeldedaten'));
      }
    } catch (error) {
      alert('Verbindungsfehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setMobileUser(null);
    setActiveTab('dashboard');
  };

  const renderScreen = () => {
    if (!isLoggedIn) {
      return <MobileLoginScreen onLogin={handleLogin} loading={loading} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <MobileDashboardScreen 
            user={mobileUser} 
            stats={stats} 
            serverStatus={serverStatus}
            onNavigate={setActiveTab}
          />
        );
      case 'scanner':
        return <MobileScannerScreen />;
      case 'assets':
        return <MobileAssetsScreen assets={assets} loading={assetsLoading} />;
      case 'settings':
        return <MobileSettingsScreen user={mobileUser} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📱 Mobile App Vorschau
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Interaktive Vorschau der TSRID Mobile App für Zebra TC78 Geräte
          </p>
        </div>

        <div className="flex gap-8 items-start">
          {/* Phone Preview */}
          <PhoneFrame>
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                {renderScreen()}
              </div>
              {isLoggedIn && (
                <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
              )}
            </div>
          </PhoneFrame>

          {/* Info Panel */}
          <div className="flex-1 space-y-4">
            {/* Status */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} shadow`}>
              <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                App Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isLoggedIn ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {isLoggedIn ? `Eingeloggt als ${mobileUser?.email}` : 'Nicht eingeloggt'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Server: {serverStatus === 'online' ? 'Verbunden' : serverStatus === 'checking' ? 'Prüfe...' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} shadow`}>
              <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Implementierte Features
              </h3>
              <ul className="space-y-2">
                {[
                  { label: 'Login mit Backend-Auth', done: true },
                  { label: 'Dashboard mit Live-Statistiken', done: true },
                  { label: 'Scanner-UI (simuliert)', done: true },
                  { label: 'Asset-Liste mit Suche & Filter', done: true },
                  { label: 'Asset-Details Modal', done: true },
                  { label: 'Einstellungen-Screen', done: true },
                  { label: 'Offline-Synchronisation', done: false },
                  { label: 'Native Zebra Scanner', done: false },
                  { label: 'Bluetooth-Drucker', done: false },
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {feature.done ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className={`${feature.done ? '' : 'opacity-60'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} shadow`}>
              <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Anleitung
              </h3>
              <ol className={`list-decimal list-inside space-y-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <li>Klicken Sie auf "Demo-Daten einfügen"</li>
                <li>Klicken Sie auf "Anmelden"</li>
                <li>Navigieren Sie über die Tab-Bar</li>
                <li>Testen Sie Scanner, Assets und Einstellungen</li>
              </ol>
            </div>

            {/* Tech Stack */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-blue-50 border border-blue-200'}`}>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                Technologie
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                React Native + Expo SDK 50 • React Navigation 6 • Axios • SecureStore
              </p>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-blue-400/70' : 'text-blue-500'}`}>
                Quellcode: /app/mobile/
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppPreview;
