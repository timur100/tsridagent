import React, { useState, useEffect } from 'react';
import { Server, Database, RefreshCw, Cpu, Wifi, HardDrive, Monitor, MapPin, Shield, Clock, Scan, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

/**
 * AgentDeviceInfo - Admin-Only Komponente für Agent/Geräteinformationen
 * Nur sichtbar für Benutzer mit Admin-Rolle (PIN 9988)
 */
const AgentDeviceInfo = () => {
  const [agentInfo, setAgentInfo] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isElectron, setIsElectron] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    system: true,
    network: true,
    scanner: true,
    database: true,
    sync: true
  });

  useEffect(() => {
    // Prüfe ob Electron
    if (window.agentAPI && window.agentAPI.isElectron) {
      setIsElectron(true);
      loadDeviceInfo();
    } else {
      setLoading(false);
      setError('Diese Seite ist nur im TSRID Agent (Electron App) verfügbar.');
    }
  }, []);

  const loadDeviceInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [systemInfo, status, dbStatsData] = await Promise.all([
        window.agentAPI.getSystemInfo ? window.agentAPI.getSystemInfo() : Promise.resolve(null),
        window.agentAPI.getStatus ? window.agentAPI.getStatus() : Promise.resolve(null),
        window.agentAPI.getDatabaseStats ? window.agentAPI.getDatabaseStats() : Promise.resolve(null)
      ]);
      
      setAgentInfo({ ...systemInfo, ...status });
      setDbStats(dbStatsData);
    } catch (e) {
      console.error('Fehler beim Laden der Agent-Informationen:', e);
      setError('Fehler beim Laden der Agent-Informationen: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('de-DE');
    } catch { return dateStr; }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  // Nicht-Electron Ansicht
  if (!isElectron) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Nur im Agent verfügbar</h2>
          <p className="text-muted-foreground">
            Diese Seite zeigt Informationen über den lokalen TSRID Agent an.<br />
            Bitte öffnen Sie die Anwendung im TSRID Agent auf einem Windows-Tablet.
          </p>
        </Card>
      </div>
    );
  }

  // Lade-Ansicht
  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Geräteinformationen...</p>
        </Card>
      </div>
    );
  }

  // Fehler-Ansicht
  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center bg-red-500/10 border-red-500/30">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Fehler</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadDeviceInfo} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Server className="h-7 w-7 text-primary" />
            Agent & Geräteinformationen
          </h1>
          <p className="text-muted-foreground mt-1">
            Detaillierte System- und Hardware-Informationen des lokalen Agents
          </p>
        </div>
        <Button onClick={loadDeviceInfo} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>

      {/* Agent Status Banner */}
      <Card className={`p-4 ${agentInfo?.status === 'running' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full ${agentInfo?.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="font-semibold text-foreground">
              Agent Status: {agentInfo?.status === 'running' ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            <Clock className="h-4 w-4 inline mr-1" />
            Letzter Heartbeat: {formatDate(agentInfo?.lastHeartbeat)}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System-Informationen */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => toggleSection('system')}
            className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">System-Informationen</span>
            </div>
            {expandedSections.system ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.system && (
            <div className="p-4 space-y-3">
              <InfoRow label="Device ID" value={agentInfo?.deviceId} mono />
              <InfoRow label="Hostname" value={agentInfo?.hostname} />
              <InfoRow label="Betriebssystem" value={agentInfo?.osType} />
              <InfoRow label="OS Version" value={agentInfo?.osVersion} />
              <InfoRow label="Plattform" value={agentInfo?.platform} />
              <InfoRow label="Architektur" value={agentInfo?.arch} />
              <InfoRow label="CPU" value={agentInfo?.cpuModel} />
              <InfoRow label="CPU Kerne" value={agentInfo?.cpuCores} />
              <InfoRow label="RAM Gesamt" value={formatBytes(agentInfo?.totalMemory)} />
              <InfoRow label="RAM Frei" value={formatBytes(agentInfo?.freeMemory)} />
              <InfoRow label="Benutzer" value={agentInfo?.userName} />
              <InfoRow label="PC-Seriennummer" value={agentInfo?.pcSerial} mono important />
              <InfoRow label="BIOS-Serial" value={agentInfo?.biosSerial} mono />
              <InfoRow label="Motherboard-Serial" value={agentInfo?.motherboardSerial} mono />
              <InfoRow label="Hardware-Hash" value={agentInfo?.hardwareHash?.substring(0, 16) + '...'} mono />
              <InfoRow label="Windows Product ID" value={agentInfo?.windowsProductId} mono />
              <InfoRow label="TeamViewer-ID" value={agentInfo?.teamviewerId} mono important />
            </div>
          )}
        </Card>

        {/* Netzwerk-Informationen */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => toggleSection('network')}
            className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Netzwerk</span>
            </div>
            {expandedSections.network ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.network && (
            <div className="p-4 space-y-3">
              <InfoRow label="IP-Adresse (IPv4)" value={agentInfo?.ipAddresses?.ipv4?.[0] || agentInfo?.ipAddresses?.[0]} />
              {agentInfo?.ipAddresses?.ipv4?.slice(1).map((ip, i) => (
                <InfoRow key={i} label={`IP-Adresse ${i + 2}`} value={ip} />
              ))}
              <InfoRow label="MAC-Adresse" value={agentInfo?.macAddresses?.[0]} mono important />
              {agentInfo?.macAddresses?.slice(1).map((mac, i) => (
                <InfoRow key={i} label={`MAC ${i + 2}`} value={mac} mono />
              ))}
              {agentInfo?.gpsCoordinates && (
                <>
                  <InfoRow label="GPS Latitude" value={agentInfo.gpsCoordinates.latitude} />
                  <InfoRow label="GPS Longitude" value={agentInfo.gpsCoordinates.longitude} />
                </>
              )}
            </div>
          )}
        </Card>

        {/* Scanner-Informationen */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => toggleSection('scanner')}
            className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Scanner & USB-Geräte</span>
            </div>
            {expandedSections.scanner ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.scanner && (
            <div className="p-4 space-y-3">
              {agentInfo?.connectedScanners && agentInfo.connectedScanners.length > 0 ? (
                agentInfo.connectedScanners.map((scanner, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Scan className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-foreground">{scanner.caption || scanner.manufacturer || 'Unbekannter Scanner'}</span>
                    </div>
                    <InfoRow label="Hersteller" value={scanner.manufacturer} />
                    <InfoRow label="Seriennummer" value={scanner.serial} mono important />
                    <InfoRow label="Device ID" value={scanner.deviceId} mono />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Scan className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Kein Scanner erkannt</p>
                </div>
              )}
              
              {/* USB Geräte Zusammenfassung */}
              {agentInfo?.usbDevices && agentInfo.usbDevices.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {agentInfo.usbDevices.length} USB-Gerät(e) erkannt
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* SQLite Datenbank */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => toggleSection('database')}
            className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Lokale SQLite Datenbank</span>
            </div>
            {expandedSections.database ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.database && (
            <div className="p-4 space-y-3">
              {dbStats ? (
                <>
                  <InfoRow label="Datenbankgröße" value={dbStats.dbSizeFormatted || formatBytes(dbStats.dbSize)} />
                  <InfoRow label="Scans gespeichert" value={dbStats.tables?.scans || 0} />
                  <InfoRow label="Standorte (Cache)" value={dbStats.tables?.locations_cache || 0} />
                  <InfoRow label="Konfigurationen" value={dbStats.tables?.device_config || 0} />
                  <InfoRow label="Sync-Protokoll" value={dbStats.tables?.sync_log || 0} />
                  
                  {dbStats.unsyncedScans > 0 && (
                    <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">{dbStats.unsyncedScans} nicht synchronisierte Scans</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Datenbank-Statistiken verfügbar</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Atlas Sync Status */}
        <Card className="overflow-hidden lg:col-span-2">
          <button 
            onClick={() => toggleSection('sync')}
            className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">MongoDB Atlas Synchronisation</span>
            </div>
            {expandedSections.sync ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.sync && (
            <div className="p-4">
              {dbStats?.lastSync ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-600">Synchronisiert</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Letzter Sync: {formatDate(dbStats.lastSync.completedAt)}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Synchronisierte Datensätze</p>
                    <p className="text-2xl font-bold text-foreground">{dbStats.lastSync.recordsCount || 0}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Sync-Dauer</p>
                    <p className="text-2xl font-bold text-foreground">{dbStats.lastSync.duration || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="font-medium text-yellow-600">Noch nie synchronisiert</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Die lokale Datenbank wurde noch nicht mit MongoDB Atlas synchronisiert.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Footer Info */}
      <Card className="p-4 bg-muted/20">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Daten gesammelt: {formatDate(agentInfo?.collectedAt)}</span>
          <span>TSRID Agent v1.2</span>
        </div>
      </Card>
    </div>
  );
};

// Hilfskomponente für Info-Zeilen
const InfoRow = ({ label, value, mono = false, important = false }) => (
  <div className={`flex items-center justify-between py-1 ${important ? 'bg-primary/5 -mx-2 px-2 rounded' : ''}`}>
    <span className="text-muted-foreground text-sm">{label}:</span>
    <span className={`text-foreground truncate max-w-[250px] ${mono ? 'font-mono text-xs' : 'text-sm'} ${important ? 'font-semibold text-primary' : ''}`}>
      {value || 'N/A'}
    </span>
  </div>
);

export default AgentDeviceInfo;
