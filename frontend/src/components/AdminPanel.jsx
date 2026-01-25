import React, { useState, useEffect } from 'react';
import { X, Settings, BarChart, Database, Users, Download, Shield, Wifi, Monitor, MapPin, Key, Save, Plus, Trash2, Clock, Timer, AlertTriangle, Upload, HardDrive, Lock, Camera, FileText, QrCode } from 'lucide-react';
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
import ActivationCodeManager from './ActivationCodeManager';
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

  // Load continents on mount
  useEffect(() => {
    fetchContinents();
  }, []);

  // Fetch continents
  const fetchContinents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/continents`);
      const data = await response.json();
      setContinents(data.continents || []);
    } catch (error) {
      console.error('Error fetching continents:', error);
      toast.error('Fehler beim Laden der Kontinente');
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

  const fetchCountries = async (continent) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/countries?continent=${encodeURIComponent(continent)}`);
      const data = await response.json();
      setCountries(data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Fehler beim Laden der Länder');
    }
  };

  // Fetch states when country changes
  useEffect(() => {
    if (selectedCountry) {
      fetchStates(selectedContinent, selectedCountry);
    } else {
      setStates([]);
      setCities([]);
      setLocations([]);
    }
  }, [selectedCountry]);

  const fetchStates = async (continent, country) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/states?continent=${encodeURIComponent(continent)}&country=${encodeURIComponent(country)}`);
      const data = await response.json();
      setStates(data.states || []);
    } catch (error) {
      console.error('Error fetching states:', error);
      toast.error('Fehler beim Laden der Bundesländer');
    }
  };

  // Fetch cities when state changes
  useEffect(() => {
    if (selectedState) {
      fetchCities(selectedContinent, selectedCountry, selectedState);
    } else {
      setCities([]);
      setLocations([]);
    }
  }, [selectedState]);

  const fetchCities = async (continent, country, state) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/cities?continent=${encodeURIComponent(continent)}&country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`);
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Fehler beim Laden der Städte');
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
      const params = new URLSearchParams({
        continent: selectedContinent,
        country: selectedCountry,
        state: selectedState,
        city: selectedCity
      });
      const response = await fetch(`${BACKEND_URL}/api/locations/search?${params}`);
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
      deviceId: `${location.locationCode}-${location.deviceNumber}`,
      stationName: location.locationName,
      street: location.street,
      city: `${location.zip} ${location.city}`,
      country: location.country,
      phone: location.phone || '',
      email: location.email || '',
      tvid: location.tvid || '',
      snStation: location.snStation || '',
      snScanner: location.snScanner || ''
    });
    toast.success(`Standort ${location.locationCode} ausgewählt`);
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

  if (!isOpen) return null;

  const tabs = [
    { id: 'stats', label: 'Statistiken', icon: BarChart },
    { id: 'logs', label: 'System-Logs', icon: Database },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
    { id: 'devices', label: 'Geräte & Scanner', icon: Monitor },
    { id: 'license', label: 'Lizenzverwaltung', icon: Key },
    { id: 'users', label: 'Benutzerverwaltung', icon: Users }
  ];

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
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="h-5 w-5" />
            Schließen
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-muted hover:bg-muted/70 text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          
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

          {/* Aktivierungscodes Tab */}
          {activeTab === 'activation' && (
            <ActivationCodeManager />
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

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
