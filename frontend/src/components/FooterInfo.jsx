import React, { useState, useEffect, useCallback } from 'react';
import { Lock, ChevronUp, ChevronDown, Shield, Server, Activity, LockOpen, User, Scan, Globe, Key, Clock } from 'lucide-react';
import { Card } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const FooterInfo = ({ data, settings, onLockClick, isUnlocked, securityUser, scannerOnline = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Portal und Lizenz Status
  const [portalOnline, setPortalOnline] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState({
    active: false,
    message: 'Prüfe...'
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Portal Health Check
  const checkPortalStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      setPortalOnline(response.ok);
    } catch {
      setPortalOnline(false);
    }
  }, []);

  // License Check - auch basierend auf gekoppeltem Gerät
  const checkLicenseStatus = useCallback(async () => {
    try {
      const deviceConfig = localStorage.getItem('deviceConfig');
      if (!deviceConfig) {
        setLicenseStatus({ active: false, message: 'No License' });
        return;
      }
      const config = JSON.parse(deviceConfig);
      // Wenn Gerät gekoppelt ist, gilt es als lizenziert
      if (config.coupled_at || config.registered_at) {
        setLicenseStatus({ active: true, message: 'Aktiv' });
      } else {
        setLicenseStatus({ active: false, message: 'No License' });
      }
    } catch {
      setLicenseStatus({ active: false, message: 'No License' });
    }
  }, []);

  useEffect(() => {
    checkPortalStatus();
    checkLicenseStatus();
    const interval = setInterval(() => {
      checkPortalStatus();
      checkLicenseStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkPortalStatus, checkLicenseStatus]);

  // Format date and time
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Lade gekoppelte Gerätedaten aus localStorage
  const [coupledDevice, setCoupledDevice] = useState(null);
  
  useEffect(() => {
    const loadCoupledDevice = () => {
      try {
        const saved = localStorage.getItem('deviceConfig');
        if (saved) {
          const config = JSON.parse(saved);
          if (config.coupled_at || config.registered_at) {
            setCoupledDevice(config);
          }
        }
      } catch (e) {
        console.error('Fehler beim Laden der Gerätekonfiguration:', e);
      }
    };
    
    loadCoupledDevice();
    
    // Listener für Storage-Änderungen (wenn in anderem Tab/Fenster gekoppelt wird)
    const handleStorageChange = (e) => {
      if (e.key === 'deviceConfig') {
        loadCoupledDevice();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Prüfe regelmäßig auf Änderungen (für gleichen Tab)
    const interval = setInterval(loadCoupledDevice, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Debug: Log coupled device data
  useEffect(() => {
    if (coupledDevice) {
      console.log('FooterInfo: Coupled device loaded:', coupledDevice);
    }
  }, [coupledDevice]);

  // Use coupled device data first, then settings, then data as fallback
  const locationInfo = {
    location: coupledDevice?.device_id || coupledDevice?.station_code || settings?.deviceId || data.location,
    stationName: coupledDevice?.location_name || settings?.stationName || data.stationName,
    street: coupledDevice?.street || settings?.street || data.street,
    zip: coupledDevice?.zip || '',
    city: coupledDevice?.city || settings?.city || data.city,
    country: coupledDevice?.country || settings?.country || data.countryLocation,
    phone: coupledDevice?.phone || settings?.phone || data.phone,
    email: coupledDevice?.email || settings?.email || data.email,
    tvid: coupledDevice?.tvid || settings?.tvid || data.tvid,
    snStation: coupledDevice?.sn_pc || settings?.snStation || data.snStation,
    snScanner: coupledDevice?.sn_sc || settings?.snScanner || data.snScanner,
    customer: coupledDevice?.customer || ''
  };

  // Status Indicator Component
  const StatusIndicator = ({ online, label, icon: Icon }) => (
    <div className="flex items-center gap-1.5" title={label}>
      <div className="relative">
        {online && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${online ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </div>
      <Icon className={`h-3 w-3 ${online ? 'text-green-500' : 'text-red-500'}`} />
    </div>
  );

  return (
    <>
      {isExpanded && (
        <div className="bg-card border-t border-border px-6 py-4 animate-in slide-in-from-bottom duration-300">
          <div className="grid grid-cols-3 gap-6">
            <Card className="bg-muted/20 border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">System</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="text-foreground font-medium">{data.version || '1.2'}</span>
                </div>
                <div className="flex justify-between">
                  <span>IP:</span>
                  <span className="text-foreground font-medium">{data.ipAddress || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVID:</span>
                  <span className="text-foreground font-medium">{locationInfo.tvid || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SN-Station:</span>
                  <span className="text-foreground font-medium">{locationInfo.snStation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SN-Scanner:</span>
                  <span className="text-foreground font-medium">{locationInfo.snScanner || '-'}</span>
                </div>
              </div>
            </Card>
            
            <Card className="bg-muted/20 border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Standort</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Station:</span>
                  <span className="text-foreground font-medium">{locationInfo.location || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Straße:</span>
                  <span className="text-foreground font-medium">{locationInfo.street || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stadt:</span>
                  <span className="text-foreground font-medium">{locationInfo.city || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Land:</span>
                  <span className="text-foreground font-medium">{locationInfo.country || '-'}</span>
                </div>
              </div>
            </Card>
            
            <Card className="bg-muted/20 border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Kontakt</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Telefon:</span>
                  <span className="text-foreground font-medium">{locationInfo.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>E-Mail:</span>
                  <span className="text-foreground font-medium break-all">{locationInfo.email || '-'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-card border-t border-border px-4 py-1.5 cursor-pointer hover:bg-card/80 transition-colors relative"
      >
        <div className="flex items-center justify-between">
          {/* Left Side - Location Info */}
          <div className="flex items-center gap-4">
            <div className="font-bold text-foreground text-sm">
              {locationInfo.location || 'Nicht konfiguriert'}
            </div>
            <div className="text-muted-foreground text-xs">
              {locationInfo.stationName || '-'}
            </div>
            {locationInfo.customer && (
              <div className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                {locationInfo.customer}
              </div>
            )}
          </div>
          
          {/* Right Side - Status, DateTime, User, Lock */}
          <div className="flex items-center gap-3">
            {/* 2 Status Indikatoren ÜBEREINANDER mit Text */}
            <div className="flex flex-col gap-0.5 px-2 py-0.5 bg-muted/30 rounded border border-border" data-testid="footer-status-indicators">
              {/* Scanner Status */}
              <div className="flex items-center gap-1" title={scannerOnline ? 'Scanner Online' : 'Scanner Offline'}>
                <div className="relative">
                  {scannerOnline && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${scannerOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <Scan className={`h-2.5 w-2.5 ${scannerOnline ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-[9px] font-medium ${scannerOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {scannerOnline ? 'Scan Online' : 'Scan Offline'}
                </span>
              </div>
              {/* Portal Status */}
              <div className="flex items-center gap-1" title={portalOnline ? 'Portal Online' : 'Portal Offline'}>
                <div className="relative">
                  {portalOnline && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${portalOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <Globe className={`h-2.5 w-2.5 ${portalOnline ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-[9px] font-medium ${portalOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {portalOnline ? 'Portal Online' : 'Portal Offline'}
                </span>
              </div>
            </div>
            
            {/* Datum und Uhrzeit - gleiche Höhe wie Status-Box */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{formatTime(currentTime)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground text-right">{formatDate(currentTime)}</span>
            </div>
            
            {/* Version */}
            <span className="text-muted-foreground text-[10px]">
              v{data.version}
            </span>
            
            {/* Security User Info */}
            {securityUser && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-verification-success/20 rounded border border-verification-success/40">
                <User className="h-3 w-3 text-verification-success" />
                <span className="text-xs font-medium text-foreground">
                  {securityUser.name} ({securityUser.employeeNumber})
                </span>
              </div>
            )}
            
            {/* Clickable Lock Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLockClick();
              }}
              className="flex items-center text-foreground font-medium hover:text-primary transition-colors p-1 hover:bg-primary/10 rounded cursor-pointer"
            >
              {securityUser ? (
                <LockOpen className="h-5 w-5 text-verification-success" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            
            {/* Expand/Collapse Indicator */}
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-primary" />
            ) : (
              <ChevronUp className="h-3 w-3 text-primary" />
            )}
          </div>
        </div>
        
        {/* TSRID Logo - Absolutely Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <img 
            src="https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/1angt2am_TSRID_Logo1_white.svg"
            alt="TSRID GmbH"
            className="h-7 w-auto"
          />
        </div>
      </div>
    </>
  );
};

export default FooterInfo;
