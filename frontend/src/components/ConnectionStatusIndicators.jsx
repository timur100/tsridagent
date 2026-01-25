import React, { useState, useEffect, useCallback } from 'react';
import { Scan, Globe, Key } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * ConnectionStatusIndicators - 3 übereinander liegende Status-Indikatoren
 * 1. Scan Online - USB-Scanner angeschlossen & kommuniziert
 * 2. Portal Online - Verbindung zum Admin-Portal aktiv
 * 3. License Active - Grün = aktive Lizenz, Rot = keine/abgelaufen
 */
const ConnectionStatusIndicators = ({ 
  scannerOnline = false,
  onStatusChange,
  checkInterval = 30000 // 30 Sekunden
}) => {
  const [portalOnline, setPortalOnline] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState({
    active: false,
    daysRemaining: 0,
    message: 'Prüfe...'
  });
  const [checking, setChecking] = useState(true);

  // Portal Health Check
  const checkPortalStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setPortalOnline(true);
        return true;
      }
      setPortalOnline(false);
      return false;
    } catch (error) {
      console.log('Portal offline:', error.message);
      setPortalOnline(false);
      return false;
    }
  }, []);

  // License Check
  const checkLicenseStatus = useCallback(async () => {
    try {
      // Versuche Lizenz vom gespeicherten Device zu laden
      const deviceConfig = localStorage.getItem('deviceConfig');
      if (!deviceConfig) {
        setLicenseStatus({
          active: false,
          daysRemaining: 0,
          message: 'Nicht aktiviert'
        });
        return;
      }

      const config = JSON.parse(deviceConfig);
      const deviceId = config.device_id || config.station_code;
      
      if (!deviceId) {
        setLicenseStatus({
          active: false,
          daysRemaining: 0,
          message: 'Keine Geräte-ID'
        });
        return;
      }

      // Prüfe Lizenz beim Portal
      const response = await fetch(`${BACKEND_URL}/api/license/check/${deviceId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.valid || data.active) {
          const daysRemaining = data.days_remaining || data.daysRemaining || 999;
          setLicenseStatus({
            active: true,
            daysRemaining: daysRemaining,
            message: daysRemaining > 30 ? 'Aktiv' : `${daysRemaining} Tage`
          });
        } else {
          setLicenseStatus({
            active: false,
            daysRemaining: 0,
            message: data.message || 'Abgelaufen'
          });
        }
      } else {
        // Fallback: Prüfe lokale Aktivierung
        if (config.registered_at) {
          setLicenseStatus({
            active: true,
            daysRemaining: 365,
            message: 'Lokal aktiv'
          });
        } else {
          setLicenseStatus({
            active: false,
            daysRemaining: 0,
            message: 'No License'
          });
        }
      }
    } catch (error) {
      console.log('License check error:', error.message);
      // Bei Netzwerkfehler: Prüfe lokale Aktivierung
      const deviceConfig = localStorage.getItem('deviceConfig');
      if (deviceConfig) {
        const config = JSON.parse(deviceConfig);
        if (config.registered_at) {
          setLicenseStatus({
            active: true,
            daysRemaining: 365,
            message: 'Offline'
          });
          return;
        }
      }
      setLicenseStatus({
        active: false,
        daysRemaining: 0,
        message: 'No License'
      });
    }
  }, []);

  // Initiale und regelmäßige Checks
  useEffect(() => {
    const runChecks = async () => {
      setChecking(true);
      await checkPortalStatus();
      await checkLicenseStatus();
      setChecking(false);
    };

    runChecks();
    
    const interval = setInterval(runChecks, checkInterval);
    return () => clearInterval(interval);
  }, [checkPortalStatus, checkLicenseStatus, checkInterval]);

  // Status-Änderungen nach außen kommunizieren
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        scannerOnline,
        portalOnline,
        licenseActive: licenseStatus.active,
        licenseMessage: licenseStatus.message
      });
    }
  }, [scannerOnline, portalOnline, licenseStatus, onStatusChange]);

  // Status-Indikator Komponente
  const StatusIndicator = ({ online, label, icon: Icon, warning = false }) => (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="relative">
        {/* Ping Animation wenn online */}
        {online && !warning && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
        )}
        {/* Haupt-Indikator */}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          online 
            ? warning 
              ? 'bg-yellow-500' 
              : 'bg-green-500' 
            : 'bg-red-500'
        }`}></span>
      </div>
      <Icon className={`h-3.5 w-3.5 ${
        online 
          ? warning 
            ? 'text-yellow-500' 
            : 'text-green-500' 
          : 'text-red-500'
      }`} />
      <span className={`text-xs font-medium ${
        online 
          ? warning 
            ? 'text-yellow-600' 
            : 'text-green-600' 
          : 'text-red-500'
      }`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-sm" data-testid="connection-status-indicators">
      {/* 1. Scanner Status */}
      <StatusIndicator 
        online={scannerOnline} 
        label={scannerOnline ? 'Scanner Online' : 'Scanner Offline'}
        icon={Scan}
      />
      
      {/* Trennlinie */}
      <div className="border-t border-border/50"></div>
      
      {/* 2. Portal Status */}
      <StatusIndicator 
        online={portalOnline} 
        label={portalOnline ? 'Portal Online' : 'Portal Offline'}
        icon={Globe}
      />
      
      {/* Trennlinie */}
      <div className="border-t border-border/50"></div>
      
      {/* 3. Lizenz Status */}
      <StatusIndicator 
        online={licenseStatus.active} 
        label={licenseStatus.active ? licenseStatus.message : 'No License'}
        icon={Key}
        warning={licenseStatus.active && licenseStatus.daysRemaining <= 30}
      />
    </div>
  );
};

export default ConnectionStatusIndicators;
