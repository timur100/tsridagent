import React, { useState, useEffect } from 'react';
import { X, Settings, BarChart, Database, Users, Download, Shield, Wifi, Monitor, MapPin, Key, Save, Plus, Trash2, Clock, Timer, AlertTriangle, Upload, HardDrive, Lock, Camera, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import toast from 'react-hot-toast';
import SettingsBackup from './SettingsBackup';
import LicenseManager from './LicenseManager';
import MasterSyncManager from './MasterSyncManager';
import ScannerManager from './ScannerManager';
import PDFManagement from './PDFManagement';
import DeviceSetup from './DeviceSetup';
import { getFullBundeslandName } from '../utils/bundesland';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminPanel = ({ isOpen, onClose, settings, onSettingsChange, securityUsers, onSecurityUsersChange }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newSecurityUser, setNewSecurityUser] = useState({
    employeeNumber: '',
    name: '',
    pin: '',
    role: 'Security'
  });

  // Station PIN & Screensaver settings
  const [stationPinSettings, setStationPinSettings] = useState({
    stationPin: '',
    newPin: '',
    confirmPin: '',
    requirePinOnStart: false,
    screensaverEnabled: true,
    screensaverTimeout: 5,
    autoStartEnabled: true
  });
  const [isElectronApp, setIsElectronApp] = useState(false);
  
  // Server configuration
  const [serverConfig, setServerConfig] = useState({
    currentUrl: window.location.origin,
    customUrl: '',
    isCustom: false
  });

  // Location selection state
  const [continents, setContinents] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedContinent, setSelectedContinent] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Mock Statistiken
  const stats = {
    today: { total: 47, success: 42, failed: 3, warnings: 2 },
    week: { total: 289, success: 267, failed: 15, warnings: 7 },
    month: { total: 1243, success: 1189, failed: 38, warnings: 16 }
  };

  // Mock System-Logs
  const logs = [
    { time: '14:38:15', type: 'success', message: 'Verifizierung erfolgreich - ID: C010A0V0U32' },
    { time: '14:35:22', type: 'warning', message: 'Dokument unscharf - Benutzer benachrichtigt' },
    { time: '14:32:10', type: 'success', message: 'Verifizierung erfolgreich - ID: D234B5C6D78' },
    { time: '14:28:45', type: 'error', message: 'Scanner-Fehler - Verbindung unterbrochen' },
    { time: '14:25:33', type: 'success', message: 'Verifizierung erfolgreich - ID: A987Z6Y5X43' },
    { time: '14:20:15', type: 'info', message: 'System-Neustart durchgeführt' },
    { time: '14:15:08', type: 'success', message: 'Verifizierung erfolgreich - ID: B456C789D01' }
  ];

  // Mock Benutzer
  const users = [
    { id: 1, name: 'Admin', role: 'Administrator', lastLogin: '28.10.2025 14:38' },
    { id: 2, name: 'Operator1', role: 'Operator', lastLogin: '28.10.2025 12:15' },
    { id: 3, name: 'Operator2', role: 'Operator', lastLogin: '27.10.2025 18:30' }
  ];

  // Load continents only when panel is opened
  useEffect(() => {
    if (isOpen && continents.length === 0) {
      fetchContinents();
    }
  }, [isOpen]);

  // Check if running in Electron and load station settings
  useEffect(() => {
    if (isOpen) {
      const checkElectron = async () => {
        if (window.isElectron && window.electronAPI) {
          setIsElectronApp(true);
          try {
            const settings = await window.electronAPI.getStationSettings();
            setStationPinSettings(prev => ({
              ...prev,
              requirePinOnStart: settings.requirePinOnStart || false,
              screensaverEnabled: settings.screensaverEnabled !== false,
              screensaverTimeout: settings.screensaverTimeout || 5,
              autoStartEnabled: settings.autoStartEnabled !== false,
              hasPin: settings.hasStationPin || false
            }));
            
            // Load server config from Electron
            const appInfo = await window.electronAPI.getAppInfo();
            setServerConfig({
              currentUrl: appInfo.serverUrl || window.location.origin,
              customUrl: '',
              isCustom: false,
              appVersion: appInfo.version,
              platform: appInfo.platform
            });
          } catch (error) {
            console.error('Error loading station settings:', error);
          }
        } else {
          // Browser mode - use current URL
          setServerConfig({
            currentUrl: window.location.origin,
            customUrl: '',
            isCustom: false,
            appVersion: 'Browser',
            platform: 'Web'
          });
        }
      };
      checkElectron();
    }
  }, [isOpen]);

  // Save station PIN
  const saveStationPin = async () => {
    if (stationPinSettings.newPin !== stationPinSettings.confirmPin) {
      toast.error('PINs stimmen nicht überein');
      return;
    }
    if (stationPinSettings.newPin.length < 4) {
      toast.error('PIN muss mindestens 4 Ziffern haben');
      return;
    }
    if (window.electronAPI && window.electronAPI.setStationSettings) {
      try {
        await window.electronAPI.setStationSettings({
          stationPin: stationPinSettings.newPin
        });
        setStationPinSettings(prev => ({
          ...prev,
          newPin: '',
          confirmPin: '',
          hasPin: true
        }));
        toast.success('Stations-PIN gespeichert');
      } catch (error) {
        toast.error('Fehler beim Speichern der PIN');
      }
    }
  };

  // Save screensaver settings
  const saveScreensaverSettings = async () => {
    if (window.electronAPI && window.electronAPI.setStationSettings) {
      try {
        await window.electronAPI.setStationSettings({
          requirePinOnStart: stationPinSettings.requirePinOnStart,
          screensaverEnabled: stationPinSettings.screensaverEnabled,
          screensaverTimeout: stationPinSettings.screensaverTimeout,
          autoStartEnabled: stationPinSettings.autoStartEnabled
        });
        toast.success('Einstellungen gespeichert');
      } catch (error) {
        toast.error('Fehler beim Speichern');
      }
    }
  };

  // Save server URL (Electron only)
  const saveServerUrl = async () => {
    const newUrl = serverConfig.customUrl.trim();
    
    if (!newUrl) {
      toast.error('Bitte geben Sie eine Server-URL ein');
      return;
    }
    
    // Validate URL format
    try {
      new URL(newUrl);
    } catch {
      toast.error('Ungültiges URL-Format. Beispiel: https://mein-server.de');
      return;
    }
    
    if (window.electronAPI && window.electronAPI.setConfig) {
      try {
        await window.electronAPI.setConfig({
          serverUrl: newUrl,
          appUrl: `${newUrl}/id-verification`
        });
        toast.success('Server-URL gespeichert. App wird neu geladen...');
        
        // Reload the app with new URL
        setTimeout(() => {
          window.location.href = `${newUrl}/id-verification`;
        }, 1500);
      } catch (error) {
        toast.error('Fehler beim Speichern der Server-URL');
      }
    } else {
      // Browser mode - just redirect
      toast.success('Weiterleitung zur neuen URL...');
      setTimeout(() => {
        window.location.href = `${newUrl}/id-verification`;
      }, 1000);
    }
  };

  // Reset to default server URL
  const resetServerUrl = async () => {
    const defaultUrl = 'https://tsrid-agent-platform.preview.emergentagent.com';
    
    if (window.electronAPI && window.electronAPI.setConfig) {
      try {
        await window.electronAPI.setConfig({
          serverUrl: defaultUrl,
          appUrl: `${defaultUrl}/id-verification`
        });
        toast.success('Server-URL zurückgesetzt. App wird neu geladen...');
        
        setTimeout(() => {
          window.location.href = `${defaultUrl}/id-verification`;
        }, 1500);
      } catch (error) {
        toast.error('Fehler beim Zurücksetzen');
      }
    }
  };

  // Fetch continents with retry
  const fetchContinents = async (retryCount = 0) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/continents`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setContinents(data.continents || ['Europa']);
    } catch (error) {
      console.error('Error fetching continents:', error);
      if (retryCount < 2) {
        // Retry nach 1 Sekunde
        setTimeout(() => fetchContinents(retryCount + 1), 1000);
      } else {
        // Fallback auf Europa
        setContinents(['Europa']);
        // Nur Toast zeigen wenn nach 3 Versuchen fehlgeschlagen
        toast.error('Fehler beim Laden der Kontinente - Fallback aktiv');
      }
    }
  };

  // Fetch countries when continent changes
  useEffect(() => {
    if (selectedContinent) {
      fetchCountries(selectedContinent);
    } else {
      setCountries([]);
      setStates([]);
      setCities([]);
      setLocations([]);
    }
  }, [selectedContinent]);

  const fetchCountries = async (continent, retryCount = 0) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/countries?continent=${encodeURIComponent(continent)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setCountries(data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchCountries(continent, retryCount + 1), 1000);
      } else {
        toast.error('Fehler beim Laden der Länder');
      }
    }
  };

  // Fetch cities when country changes (skip states - not available in unified API)
  useEffect(() => {
    if (selectedCountry) {
      fetchCities(selectedCountry);
    } else {
      setCities([]);
      setLocations([]);
    }
  }, [selectedCountry]);

  const fetchCities = async (country, retryCount = 0) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/cities?country=${encodeURIComponent(country)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchCities(country, retryCount + 1), 1000);
      } else {
        toast.error('Fehler beim Laden der Städte');
      }
    }
  };

  // Search locations when city is selected
  useEffect(() => {
    if (selectedCity) {
      searchLocations();
    } else {
      setLocations([]);
    }
  }, [selectedCity]);

  const searchLocations = async () => {
    setLoadingLocations(true);
    try {
      // Use unified-locations by-city endpoint
      const response = await fetch(`${BACKEND_URL}/api/unified-locations/by-city?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry)}`);
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error('Fehler beim Suchen der Standorte');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setLocalSettings({
      ...localSettings,
      deviceId: location.station_code || location.locationCode,
      stationName: location.name || location.locationName,
      street: location.street || '',
      city: `${location.zip || ''} ${location.city || ''}`.trim(),
      country: location.country || '',
      phone: location.phone || '',
      email: location.email || '',
      tvid: location.tvid || '',
      snStation: location.sn_station || location.snStation || '',
      snScanner: location.sn_scanner || location.snScanner || ''
    });
    toast.success(`Standort ${location.station_code || location.locationCode} ausgewählt`);
  };

  const handleSaveSettings = () => {
    // Save to parent component
    onSettingsChange(localSettings);
    
    // Also save to localStorage for persistence
    try {
      localStorage.setItem('adminSettings', JSON.stringify(localSettings));
      console.log('✅ Settings saved to localStorage:', localSettings);
    } catch (e) {
      console.error('❌ Error saving settings to localStorage:', e);
    }
    
    toast.success('Einstellungen gespeichert');
  };

  const handleChangePIN = () => {
    if (localSettings.newPin === localSettings.confirmPin) {
      toast.success('PIN erfolgreich geändert');
      setLocalSettings({ ...localSettings, currentPin: '', newPin: '', confirmPin: '' });
    } else {
      toast.error('PINs stimmen nicht überein');
    }
  };

  const handleAddSecurityUser = () => {
    if (!newSecurityUser.employeeNumber || !newSecurityUser.name || !newSecurityUser.pin) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }
    if (newSecurityUser.employeeNumber.length !== 2) {
      toast.error('Mitarbeiternummer muss 2-stellig sein');
      return;
    }
    if (newSecurityUser.pin.length !== 4) {
      toast.error('PIN muss 4-stellig sein');
      return;
    }
    
    const newUser = {
      ...newSecurityUser,
      id: Date.now()
    };
    onSecurityUsersChange([...securityUsers, newUser]);
    setNewSecurityUser({ employeeNumber: '', name: '', pin: '', role: 'Security' });
    toast.success('Security-Mitarbeiter hinzugefügt');
  };

  const handleDeleteSecurityUser = (id) => {
    onSecurityUsersChange(securityUsers.filter(u => u.id !== id));
    toast.success('Security-Mitarbeiter gelöscht');
  };

  // Hauptmenü-Kategorien mit Untermenüs (MUSS vor bedingtem return stehen)
  const menuStructure = {
    overview: {
      label: 'Übersicht',
      icon: BarChart,
      subItems: [
        { id: 'stats', label: 'Statistiken', icon: BarChart },
        { id: 'logs', label: 'System-Logs', icon: Database }
      ]
    },
    config: {
      label: 'Konfiguration',
      icon: Settings,
      subItems: [
        { id: 'settings', label: 'Einstellungen', icon: Settings },
        { id: 'devices', label: 'Geräte & Scanner', icon: Monitor }
      ]
    },
    station: {
      label: 'Station',
      icon: Shield,
      subItems: [
        { id: 'station-pin', label: 'Stations-PIN', icon: Lock },
        { id: 'screensaver', label: 'Bildschirmschoner', icon: Timer },
        { id: 'server-config', label: 'Server-Verbindung', icon: Wifi }
      ]
    },
    admin: {
      label: 'Verwaltung',
      icon: Users,
      subItems: [
        { id: 'users', label: 'Benutzerverwaltung', icon: Users },
        { id: 'license', label: 'Lizenzverwaltung', icon: Key }
      ]
    }
  };

  // Finde aktive Hauptkategorie basierend auf activeTab
  const getActiveCategory = () => {
    for (const [catId, cat] of Object.entries(menuStructure)) {
      if (cat.subItems.some(item => item.id === activeTab)) {
        return catId;
      }
    }
    return 'overview';
  };

  // useState Hook MUSS vor jedem bedingten return aufgerufen werden
  const [activeCategory, setActiveCategory] = useState('overview');

  // Aktualisiere activeTab wenn Kategorie wechselt
  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    // Wähle ersten Untermenüpunkt der neuen Kategorie
    const firstSubItem = menuStructure[catId].subItems[0];
    if (firstSubItem) {
      setActiveTab(firstSubItem.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b-2 border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Administrator-Bereich</h1>
              <p className="text-sm text-muted-foreground">Nur für Betreiber</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin-Portal Button */}
            <Button 
              onClick={() => {
                const portalUrl = `${BACKEND_URL.replace('/api', '')}/portal/admin`;
                window.open(portalUrl, '_blank');
              }} 
              variant="default" 
              className="gap-2 bg-[#d50c2d] hover:bg-[#b80a28] text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Admin-Portal
            </Button>
            <Button onClick={onClose} variant="outline" className="gap-2">
              <X className="h-5 w-5" />
              Schließen
            </Button>
          </div>
        </div>
      </div>

      {/* Hauptmenü-Tabs (horizontal) */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex gap-2">
          {Object.entries(menuStructure).map(([catId, cat]) => {
            const Icon = cat.icon;
            const isActive = activeCategory === catId;
            return (
              <button
                key={catId}
                onClick={() => handleCategoryChange(catId)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted hover:bg-muted/70 text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area mit Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dynamische Sidebar (links) */}
        <div className="w-56 bg-card border-r border-border p-4 flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            {menuStructure[activeCategory]?.label}
          </p>
          {menuStructure[activeCategory]?.subItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Hauptinhalt (rechts) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
          
          {/* Statistiken Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Verifizierungs-Statistiken</h2>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Heute */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Heute</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gesamt:</span>
                      <span className="font-bold text-foreground">{stats.today.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-success">Erfolgreich:</span>
                      <span className="font-bold text-verification-success">{stats.today.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-warning">Warnungen:</span>
                      <span className="font-bold text-verification-warning">{stats.today.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive">Fehler:</span>
                      <span className="font-bold text-destructive">{stats.today.failed}</span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Erfolgsquote:</span>
                        <span className="font-bold text-verification-success">
                          {Math.round((stats.today.success / stats.today.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Diese Woche */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Diese Woche</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gesamt:</span>
                      <span className="font-bold text-foreground">{stats.week.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-success">Erfolgreich:</span>
                      <span className="font-bold text-verification-success">{stats.week.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-warning">Warnungen:</span>
                      <span className="font-bold text-verification-warning">{stats.week.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive">Fehler:</span>
                      <span className="font-bold text-destructive">{stats.week.failed}</span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Erfolgsquote:</span>
                        <span className="font-bold text-verification-success">
                          {Math.round((stats.week.success / stats.week.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Dieser Monat */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Dieser Monat</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gesamt:</span>
                      <span className="font-bold text-foreground">{stats.month.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-success">Erfolgreich:</span>
                      <span className="font-bold text-verification-success">{stats.month.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-verification-warning">Warnungen:</span>
                      <span className="font-bold text-verification-warning">{stats.month.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive">Fehler:</span>
                      <span className="font-bold text-destructive">{stats.month.failed}</span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Erfolgsquote:</span>
                        <span className="font-bold text-verification-success">
                          {Math.round((stats.month.success / stats.month.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* System-Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">System-Logs</h2>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Logs exportieren
                </Button>
              </div>
              
              <Card className="p-4">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        log.type === 'success' ? 'border-verification-success bg-verification-success/10' :
                        log.type === 'warning' ? 'border-verification-warning bg-verification-warning/10' :
                        log.type === 'error' ? 'border-destructive bg-destructive/10' :
                        'border-border bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">{log.time}</span>
                          <span className="text-foreground">{log.message}</span>
                        </div>
                        <Badge variant={
                          log.type === 'success' ? 'default' :
                          log.type === 'warning' ? 'warning' :
                          log.type === 'error' ? 'destructive' :
                          'outline'
                        }>
                          {(log.type || 'info').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Einstellungen Tab with Accordions */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Einstellungen</h2>
              
              <Accordion type="single" collapsible className="space-y-4">
                
                {/* 1. Einstellungen Verwaltung */}
                <AccordionItem value="backup" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Einstellungen Verwaltung</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <SettingsBackup
                      currentSettings={localSettings}
                      onRestore={(restoredSettings) => {
                        setLocalSettings(restoredSettings);
                        toast.success('Einstellungen wiederhergestellt');
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Standort & Gerät - Hinweis auf Geräte & Scanner Tab */}
                <AccordionItem value="location" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Standort & Gerät</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <Card className="p-6 bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Monitor className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">Geräteeinrichtung verschoben</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Die Standort- und Geräteauswahl finden Sie jetzt im Tab <strong>"Geräte & Scanner"</strong>.
                            Dort können Sie Standorte hierarchisch auswählen und Geräte koppeln.
                          </p>
                        </div>
                        <Button
                          onClick={() => setActiveTab('devices')}
                          variant="default"
                          className="gap-2"
                        >
                          <Monitor className="h-4 w-4" />
                          Zu Geräte & Scanner
                        </Button>
                      </div>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Dokumenten Verwaltung */}
                <AccordionItem value="documents" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Dokumenten Verwaltung</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-6">
                    
                    {/* Auto-Reset Timer */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Auto-Reset Timer
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Automatisches Löschen nach Scan (Minuten)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={localSettings.autoResetMinutes}
                            onChange={(e) => setLocalSettings({ ...localSettings, autoResetMinutes: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Daten werden automatisch gelöscht nach dieser Zeit. Timer wird bei jeder Interaktion zurückgesetzt.
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Fehlerhafte Dokumente - Meldungen */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Fehlerhafte Dokumente - Meldungen
                      </h3>
                      <div className="space-y-6">
                        {/* Schwellwerte */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Max. Versuche: Unbekannte Dokumente
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={localSettings.maxUnknownAttempts}
                              onChange={(e) => setLocalSettings({ ...localSettings, maxUnknownAttempts: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Nach x Versuchen wird IT benachrichtigt
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Max. Versuche: Fehlerhafte Dokumente
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={localSettings.maxErrorAttempts}
                              onChange={(e) => setLocalSettings({ ...localSettings, maxErrorAttempts: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Nach x Versuchen wird Security benachrichtigt
                            </p>
                          </div>
                        </div>

                        {/* Bestätigung erforderlich */}
                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                          <input
                            type="checkbox"
                            id="requireConfirmation"
                            checked={localSettings.requireConfirmation}
                            onChange={(e) => setLocalSettings({ ...localSettings, requireConfirmation: e.target.checked })}
                            className="h-5 w-5 rounded border-border"
                          />
                          <label htmlFor="requireConfirmation" className="text-sm font-medium text-foreground cursor-pointer">
                            Benutzer muss Meldung bestätigen (Scan wird blockiert bis Bestätigung)
                          </label>
                        </div>

                        {/* Nachricht für unbekannte Dokumente */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Nachricht: Unbekannte Dokumente
                          </label>
                          <textarea
                            value={localSettings.unknownDocumentMessage}
                            onChange={(e) => setLocalSettings({ ...localSettings, unknownDocumentMessage: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                            placeholder="Text der bei unbekannten Dokumenten angezeigt wird..."
                          />
                        </div>

                        {/* Nachricht für fehlerhafte Dokumente */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Nachricht: Fehlerhafte Dokumente
                          </label>
                          <textarea
                            value={localSettings.errorDocumentMessage}
                            onChange={(e) => setLocalSettings({ ...localSettings, errorDocumentMessage: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                            placeholder="Text der bei fehlerhaften Dokumenten angezeigt wird..."
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Automatische Dokumentensperre */}
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="h-5 w-5 text-red-500" />
                          <h3 className="text-lg font-semibold text-foreground">
                            Automatische Dokumentensperre
                          </h3>
                        </div>
                        
                        {/* Auto-Ban aktivieren */}
                        {/* Scanner-Modus: Live vs Simulation */}
                        <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-2">
                              📡 Scanner-Modus
                              <span className={`text-xs px-2 py-0.5 rounded ${localSettings.scannerMode === 'simulation' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>
                                {localSettings.scannerMode === 'simulation' ? 'SIMULATION' : 'LIVE'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <strong>Live:</strong> Echter Regula Scanner (localhost) - Electron-App<br/>
                              <strong>Simulation:</strong> Mock-Daten - Entwicklung bei Emergent
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground font-medium">
                              {localSettings.scannerMode === 'simulation' ? 'Simulation' : 'Live Scanner'}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={localSettings.scannerMode !== 'simulation'}
                                onChange={(e) => setLocalSettings({ 
                                  ...localSettings, 
                                  scannerMode: e.target.checked ? 'live' : 'simulation' 
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                          </div>
                        </div>

                        {/* Test-Modus: Banned Check deaktivieren */}
                        <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-2">
                              🧪 Gesperrte Dokumente Prüfung
                              <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">TEST</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Aktivieren um gesperrte Dokumente zu blockieren. Deaktivieren für Testing.
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {localSettings.enableBannedCheck === false ? 'AUS' : 'AN'}
                            </span>
                            <input
                              type="checkbox"
                              checked={localSettings.enableBannedCheck !== false}
                              onChange={(e) => setLocalSettings({ ...localSettings, enableBannedCheck: e.target.checked })}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium text-foreground">Auto-Ban aktivieren</div>
                            <div className="text-sm text-muted-foreground">
                              Dokumente automatisch nach X Ablehnungen sperren
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={localSettings.autoBanEnabled || false}
                              onChange={(e) => setLocalSettings({ ...localSettings, autoBanEnabled: e.target.checked })}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>

                        {/* Threshold für Auto-Ban */}
                        {localSettings.autoBanEnabled && (
                          <div className="space-y-4 pl-4 border-l-2 border-red-500">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Anzahl Ablehnungen bis Auto-Sperrung
                              </label>
                              <input
                                type="number"
                                min="2"
                                max="10"
                                value={localSettings.autoBanThreshold || 3}
                                onChange={(e) => setLocalSettings({ ...localSettings, autoBanThreshold: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-md"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Standard: 3 Ablehnungen
                              </p>
                            </div>

                            {/* Ban-Dauer */}
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Standard-Sperrdauer
                              </label>
                              <select
                                value={localSettings.autoBanDuration || 'permanent'}
                                onChange={(e) => setLocalSettings({ ...localSettings, autoBanDuration: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-md"
                              >
                                <option value="7">7 Tage</option>
                                <option value="14">14 Tage</option>
                                <option value="30">30 Tage</option>
                                <option value="90">90 Tage</option>
                                <option value="permanent">Permanent</option>
                              </select>
                            </div>

                            {/* Email Benachrichtigungen */}
                            <div className="flex items-center justify-between p-3 bg-muted/20 rounded">
                              <div className="text-sm text-foreground">Email-Benachrichtigungen</div>
                              <input
                                type="checkbox"
                                checked={localSettings.autoBanEmailNotifications || false}
                                onChange={(e) => setLocalSettings({ ...localSettings, autoBanEmailNotifications: e.target.checked })}
                                className="h-4 w-4"
                              />
                            </div>

                            {/* SMS Benachrichtigungen */}
                            <div className="flex items-center justify-between p-3 bg-muted/20 rounded">
                              <div className="text-sm text-foreground">SMS-Benachrichtigungen</div>
                              <input
                                type="checkbox"
                                checked={localSettings.autoBanSmsNotifications || false}
                                onChange={(e) => setLocalSettings({ ...localSettings, autoBanSmsNotifications: e.target.checked })}
                                className="h-4 w-4"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Dokumenten-Upload Einstellungen */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Dokumenten-Upload
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium text-foreground">Upload-Button aktivieren</div>
                            <div className="text-sm text-muted-foreground">
                              Ermöglicht das Hochladen von Dokumentenbildern (JPG, PNG) für die Verifizierung
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={localSettings.uploadEnabled !== undefined ? localSettings.uploadEnabled : true}
                              onChange={(e) => setLocalSettings({ ...localSettings, uploadEnabled: e.target.checked })}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>
                        <div className="bg-muted/20 border border-border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">
                            <strong>Hinweis:</strong> Der Upload-Button erscheint unter dem Dokumenten-Vorschaubereich. 
                            Unterstützte Formate: JPEG, JPG, PNG. Es können bis zu 2 Bilder gleichzeitig hochgeladen werden (Vorder- und Rückseite).
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* PDF-Dokumente Verwaltung */}
                    <PDFManagement />
                  </AccordionContent>
                </AccordionItem>

                {/* 4. System & Datenschutz */}
                <AccordionItem value="system" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold">System & Datenschutz</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-6">
                    
                    {/* Datenschutz */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Datenschutz-Einstellungen
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Verifizierungs-Historie löschen nach (Tage)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={localSettings.datenschutzTage}
                            onChange={(e) => setLocalSettings({ ...localSettings, datenschutzTage: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Verifizierungen werden automatisch nach dieser Zeit aus der Historie gelöscht.
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Netzwerk-Einstellungen */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Wifi className="h-5 w-5" />
                        Netzwerk-Einstellungen
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Netzwerkmodus
                          </label>
                          <select
                            value={localSettings.networkMode}
                            onChange={(e) => setLocalSettings({ ...localSettings, networkMode: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                          >
                            <option value="DHCP">DHCP (Automatisch)</option>
                            <option value="STATIC">Statische IP</option>
                          </select>
                        </div>
                        {localSettings.networkMode === 'STATIC' && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              IP-Adresse
                            </label>
                            <input
                              type="text"
                              value={localSettings.ipAddress}
                              onChange={(e) => setLocalSettings({ ...localSettings, ipAddress: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                            />
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Simulationsmodus */}
                    <Card className="p-6 border-blue-500/30">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Monitor className="h-5 w-5 text-blue-500" />
                          <h3 className="text-lg font-semibold text-foreground">
                            Simulationsmodus
                          </h3>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                            Testing
                          </Badge>
                        </div>
                        
                        <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-200">
                            <strong>🎯 Multi-Station Simulation:</strong> Aktivieren Sie diesen Modus, um verschiedene Standorte 
                            in mehreren Browser-Tabs zu testen.
                          </p>
                        </div>
                        
                        {/* Simulationsmodus aktivieren */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium text-foreground">Simulationsmodus aktivieren</div>
                            <div className="text-sm text-muted-foreground">
                              Überschreibt echte Station für Testing-Zwecke
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={localSettings.simulationMode || false}
                              onChange={(e) => setLocalSettings({ ...localSettings, simulationMode: e.target.checked })}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button onClick={handleSaveSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Einstellungen speichern
              </Button>
            </div>
          )}

          {/* Geräte & Scanner Tab */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Geräte & Scanner</h2>
              
              <Accordion type="single" collapsible defaultValue="device-setup" className="space-y-4">
                {/* Geräteeinrichtung */}
                <AccordionItem value="device-setup" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Geräteeinrichtung & Standort</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <DeviceSetup />
                  </AccordionContent>
                </AccordionItem>

                {/* Scanner Management */}
                <AccordionItem value="scanner" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Scanner Verwaltung</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <ScannerManager />
                  </AccordionContent>
                </AccordionItem>

                {/* Master-Sync */}
                <AccordionItem value="sync" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Master-Geräte Synchronisation</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <MasterSyncManager 
                      currentDeviceId={localSettings.deviceId}
                      currentSettings={localSettings}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* Lizenzverwaltung Tab */}
          {activeTab === 'license' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Lizenzverwaltung</h2>
              <LicenseManager deviceId={settings.deviceId} />
            </div>
          )}

          {/* Benutzerverwaltung Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Benutzerverwaltung</h2>
              
              <Accordion type="single" collapsible className="space-y-4">
                {/* System Users */}
                <AccordionItem value="system-users" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-semibold">System-Benutzer</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Verwalten Sie Administratoren und Operatoren</p>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Neuer Benutzer
                        </Button>
                      </div>
                      
                      <Card className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Name</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Rolle</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Letzter Login</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => (
                              <tr key={user.id} className="border-b border-border/50">
                                <td className="p-3 text-foreground">{user.name}</td>
                                <td className="p-3 text-muted-foreground">{user.role}</td>
                                <td className="p-3 text-muted-foreground">{user.lastLogin}</td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">Bearbeiten</Button>
                                    <Button variant="outline" size="sm" className="text-destructive">Löschen</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Security Users */}
                <AccordionItem value="security-users" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Security-Mitarbeiter</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {/* Add new security user */}
                      <Card className="p-6">
                        <h4 className="font-semibold text-foreground mb-4">Neuer Security-Mitarbeiter</h4>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Mitarbeiternummer (2-stellig)
                            </label>
                            <input
                              type="text"
                              maxLength="2"
                              value={newSecurityUser.employeeNumber}
                              onChange={(e) => setNewSecurityUser({ ...newSecurityUser, employeeNumber: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Name
                            </label>
                            <input
                              type="text"
                              value={newSecurityUser.name}
                              onChange={(e) => setNewSecurityUser({ ...newSecurityUser, name: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="Max Mustermann"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              PIN (4-stellig)
                            </label>
                            <input
                              type="password"
                              maxLength="4"
                              value={newSecurityUser.pin}
                              onChange={(e) => setNewSecurityUser({ ...newSecurityUser, pin: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="****"
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddSecurityUser} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Security-Mitarbeiter hinzufügen
                        </Button>
                      </Card>

                      {/* Security users list */}
                      <Card className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Mitarbeiter-Nr.</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Name</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Rolle</th>
                              <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-foreground">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {securityUsers.map((user) => (
                              <tr key={user.id} className="border-b border-border/50">
                                <td className="p-3 text-foreground text-sm font-semibold">{user.employeeNumber}</td>
                                <td className="p-3 text-foreground">{user.name}</td>
                                <td className="p-3 text-muted-foreground">{user.role}</td>
                                <td className="p-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive gap-2"
                                    onClick={() => handleDeleteSecurityUser(user.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Löschen
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Security Settings */}
                <AccordionItem value="security-settings" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Sicherheitseinstellungen</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-6">
                      <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Key className="h-5 w-5" />
                          Admin-PIN ändern
                        </h3>
                        <div className="space-y-4 max-w-md">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Aktuelle PIN
                            </label>
                            <input
                              type="password"
                              maxLength="4"
                              value={localSettings.currentPin}
                              onChange={(e) => setLocalSettings({ ...localSettings, currentPin: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="****"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Neue PIN
                            </label>
                            <input
                              type="password"
                              maxLength="4"
                              value={localSettings.newPin}
                              onChange={(e) => setLocalSettings({ ...localSettings, newPin: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="****"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              PIN bestätigen
                            </label>
                            <input
                              type="password"
                              maxLength="4"
                              value={localSettings.confirmPin}
                              onChange={(e) => setLocalSettings({ ...localSettings, confirmPin: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                              placeholder="****"
                            />
                          </div>
                          <Button onClick={handleChangePIN} className="gap-2">
                            <Save className="h-4 w-4" />
                            PIN ändern
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                          Sicherheitseinstellungen
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Auto-Lock Timer</p>
                              <p className="text-sm text-muted-foreground">2 Minuten Inaktivität</p>
                            </div>
                            <Button variant="outline" size="sm">Ändern</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Session Timeout</p>
                              <p className="text-sm text-muted-foreground">30 Minuten</p>
                            </div>
                            <Button variant="outline" size="sm">Ändern</Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* Station PIN Tab */}
          {activeTab === 'station-pin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Stations-PIN</h2>
                  <p className="text-muted-foreground">PIN-Schutz für die Station konfigurieren</p>
                </div>
              </div>

              {!isElectronApp ? (
                <Card className="p-6">
                  <div className="text-center py-8">
                    <Monitor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nur in Desktop-App verfügbar</h3>
                    <p className="text-muted-foreground">
                      Die Stations-PIN-Funktion ist nur in der installierten TSRID Agent Desktop-App verfügbar.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Neue Stations-PIN setzen
                    </h3>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Neue PIN (4-6 Ziffern)
                        </label>
                        <input
                          type="password"
                          maxLength="6"
                          value={stationPinSettings.newPin}
                          onChange={(e) => setStationPinSettings({ ...stationPinSettings, newPin: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                          placeholder="****"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          PIN bestätigen
                        </label>
                        <input
                          type="password"
                          maxLength="6"
                          value={stationPinSettings.confirmPin}
                          onChange={(e) => setStationPinSettings({ ...stationPinSettings, confirmPin: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                          placeholder="****"
                        />
                      </div>
                      <Button onClick={saveStationPin} className="gap-2">
                        <Save className="h-4 w-4" />
                        PIN speichern
                      </Button>
                      {stationPinSettings.hasPin && (
                        <p className="text-sm text-green-500 flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          Stations-PIN ist aktiv
                        </p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">PIN-Einstellungen</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">PIN beim Start erforderlich</p>
                          <p className="text-sm text-muted-foreground">Benutzer muss sich beim App-Start anmelden</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stationPinSettings.requirePinOnStart}
                            onChange={(e) => setStationPinSettings({ ...stationPinSettings, requirePinOnStart: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Screensaver Tab */}
          {activeTab === 'screensaver' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Bildschirmschoner</h2>
                  <p className="text-muted-foreground">Einbrennen verhindern und Station schützen</p>
                </div>
              </div>

              {/* Test Button - works in browser too */}
              <Card className="p-6 border-2 border-yellow-500/50 bg-yellow-500/10">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Bildschirmschoner testen
                </h3>
                <p className="text-muted-foreground mb-4">
                  Testen Sie den Bildschirmschoner direkt im Browser. Klicken Sie auf den Bildschirm oder geben Sie die PIN ein, um ihn zu deaktivieren.
                </p>
                <Button 
                  onClick={() => {
                    // Dispatch custom event to trigger screensaver test
                    window.dispatchEvent(new CustomEvent('test-screensaver'));
                    onClose(); // Close admin panel
                  }}
                  className="gap-2 bg-yellow-600 hover:bg-yellow-700"
                >
                  <Monitor className="h-4 w-4" />
                  Bildschirmschoner jetzt testen
                </Button>
              </Card>

              {!isElectronApp ? (
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <Monitor className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Desktop-App Einstellungen</h3>
                      <p className="text-muted-foreground mb-4">
                        Die vollständigen Einstellungen (Autostart, Timeout-Speicherung) sind nur in der installierten TSRID Agent Desktop-App verfügbar.
                        Der Test-Button oben funktioniert aber auch im Browser!
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      Bildschirmschoner-Einstellungen
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">Bildschirmschoner aktivieren</p>
                          <p className="text-sm text-muted-foreground">Schützt vor Einbrennen bei Inaktivität</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stationPinSettings.screensaverEnabled}
                            onChange={(e) => setStationPinSettings({ ...stationPinSettings, screensaverEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-foreground">Timeout (Minuten)</p>
                            <p className="text-sm text-muted-foreground">Zeit bis Bildschirmschoner aktiv wird</p>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{stationPinSettings.screensaverTimeout}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="30"
                          value={stationPinSettings.screensaverTimeout}
                          onChange={(e) => setStationPinSettings({ ...stationPinSettings, screensaverTimeout: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1 Min</span>
                          <span>15 Min</span>
                          <span>30 Min</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Autostart
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">Mit Windows starten</p>
                          <p className="text-sm text-muted-foreground">TSRID Agent startet automatisch beim Hochfahren</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stationPinSettings.autoStartEnabled}
                            onChange={(e) => setStationPinSettings({ ...stationPinSettings, autoStartEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                    </div>
                  </Card>

                  <Button onClick={saveScreensaverSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Einstellungen speichern
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Server Configuration Tab */}
          {activeTab === 'server-config' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Server-Verbindung</h2>
                  <p className="text-muted-foreground">Aktueller Server und Konfiguration</p>
                </div>
              </div>

              {/* Current Connection Status */}
              <Card className="p-6 border-2 border-green-500/50 bg-green-500/10">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-green-500" />
                  Aktuelle Verbindung
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <span className="text-muted-foreground">Server-URL:</span>
                    <span className="font-mono text-green-400 text-sm break-all">{serverConfig.currentUrl}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <span className="text-muted-foreground">App-Version:</span>
                    <span className="font-mono text-foreground">{serverConfig.appVersion || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <span className="text-muted-foreground">Plattform:</span>
                    <span className="font-mono text-foreground">{serverConfig.platform || 'Web'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Verbunden
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Custom Server Configuration */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Eigener Server (Produktivbetrieb)
                </h3>
                <p className="text-muted-foreground mb-4">
                  Wenn Sie die App mit einem eigenen Server betreiben möchten, geben Sie hier die URL ein.
                  Die App wird nach dem Speichern automatisch neu geladen.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Server-URL
                    </label>
                    <input
                      type="url"
                      value={serverConfig.customUrl}
                      onChange={(e) => setServerConfig({ ...serverConfig, customUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-mono text-sm"
                      placeholder="https://mein-server.de"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Beispiel: https://tsrid.meine-firma.de
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={saveServerUrl} className="gap-2">
                      <Save className="h-4 w-4" />
                      Server-URL speichern
                    </Button>
                    {isElectronApp && (
                      <Button onClick={resetServerUrl} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Zurücksetzen
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Links */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Schnellzugriff
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="justify-start gap-2"
                    onClick={() => window.open(`${serverConfig.currentUrl}/portal/admin`, '_blank')}
                  >
                    <Monitor className="h-4 w-4" />
                    Admin-Portal öffnen
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start gap-2"
                    onClick={() => window.open(`${serverConfig.currentUrl}/api/docs`, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                    API-Dokumentation
                  </Button>
                </div>
              </Card>

              {/* Development Info */}
              {!isElectronApp && (
                <Card className="p-6 border border-blue-500/50 bg-blue-500/10">
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-500" />
                    Entwicklungsmodus
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Sie verwenden die App im Browser. Für den vollständigen Funktionsumfang 
                    (Kiosk-Modus, Autostart, Offline-Fähigkeit) installieren Sie den TSRID Agent Desktop-Client.
                  </p>
                </Card>
              )}
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
