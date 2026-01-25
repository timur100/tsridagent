import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Wifi, WifiOff, ChevronUp, ChevronDown, Shield, Server, Activity, LockOpen, User, Scan, Globe, Key } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const FooterInfo = ({ data, settings, onLockClick, isUnlocked, securityUser, scannerOnline = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Portal und Lizenz Status
  const [portalOnline, setPortalOnline] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState({
    active: false,
    message: 'Prüfe...'
  });

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

  // License Check
  const checkLicenseStatus = useCallback(async () => {
    try {
      const deviceConfig = localStorage.getItem('deviceConfig');
      if (!deviceConfig) {
        setLicenseStatus({ active: false, message: 'No License' });
        return;
      }
      const config = JSON.parse(deviceConfig);
      if (config.registered_at) {
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

  // Use settings for location info, fallback to data
  const locationInfo = {
    location: settings?.deviceId || data.location,
    stationName: settings?.stationName || data.stationName,
    street: settings?.street || data.street,
    city: settings?.city || data.city,
    country: settings?.country || data.countryLocation,
    phone: settings?.phone || data.phone,
    email: settings?.email || data.email,
    tvid: settings?.tvid || data.tvid,
    snStation: settings?.snStation || data.snStation,
    snScanner: settings?.snScanner || data.snScanner
  };

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
                  <span className="text-foreground font-medium">{data.ipAddress || '10.102.111.14'}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVID:</span>
                  <span className="text-foreground font-medium">{locationInfo.tvid || '528168516'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SN-Station:</span>
                  <span className="text-foreground font-medium">{locationInfo.snStation || '047926771453'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SN-Scanner:</span>
                  <span className="text-foreground font-medium">{locationInfo.snScanner || '201734 00732'}</span>
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
                  <span className="text-foreground font-medium">{locationInfo.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>Straße:</span>
                  <span className="text-foreground font-medium">{locationInfo.street}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stadt:</span>
                  <span className="text-foreground font-medium">{locationInfo.city}</span>
                </div>
                <div className="flex justify-between">
                  <span>Land:</span>
                  <span className="text-foreground font-medium">{locationInfo.country}</span>
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
                  <span className="text-foreground font-medium">{locationInfo.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>E-Mail:</span>
                  <span className="text-foreground font-medium break-all">{locationInfo.email}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-card border-t border-border px-6 py-3 cursor-pointer hover:bg-card/80 transition-colors relative"
      >
        <div className="flex items-center justify-between">
          {/* Left Side - Location Info */}
          <div className="flex items-center gap-6">
            <div className="font-bold text-foreground text-lg">
              {locationInfo.location}
            </div>
            <div className="text-muted-foreground text-sm">
              {locationInfo.stationName}
            </div>
          </div>
          
          {/* Right Side - Status Indicators, Version, User, Lock */}
          <div className="flex items-center gap-4">
            {/* 3 Status Indikatoren horizontal */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-lg border border-border" data-testid="footer-status-indicators">
              {/* Scanner Status */}
              <div className="flex items-center gap-1.5" title={scannerOnline ? 'Scanner Online' : 'Scanner Offline'}>
                <div className="relative">
                  {scannerOnline && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${scannerOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <Scan className={`h-3.5 w-3.5 ${scannerOnline ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              
              {/* Trennstrich */}
              <div className="h-4 w-px bg-border"></div>
              
              {/* Portal Status */}
              <div className="flex items-center gap-1.5" title={portalOnline ? 'Portal Online' : 'Portal Offline'}>
                <div className="relative">
                  {portalOnline && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${portalOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <Globe className={`h-3.5 w-3.5 ${portalOnline ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              
              {/* Trennstrich */}
              <div className="h-4 w-px bg-border"></div>
              
              {/* License Status */}
              <div className="flex items-center gap-1.5" title={licenseStatus.active ? 'Lizenz Aktiv' : 'Keine Lizenz'}>
                <div className="relative">
                  {licenseStatus.active && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${licenseStatus.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <Key className={`h-3.5 w-3.5 ${licenseStatus.active ? 'text-green-500' : 'text-red-500'}`} />
                {!licenseStatus.active && (
                  <span className="text-xs text-red-500 font-medium">No License</span>
                )}
              </div>
            </div>
            
            <span className="text-muted-foreground text-xs">
              v{data.version}
            </span>
            
            {/* Security User Info */}
            {securityUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-verification-success/20 rounded-lg border border-verification-success/40">
                <User className="h-4 w-4 text-verification-success" />
                <span className="text-sm font-medium text-foreground">
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
              className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-lg cursor-pointer"
            >
              {securityUser ? (
                <LockOpen className="h-6 w-6 text-verification-success" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            
            {/* Expand/Collapse Indicator */}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronUp className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>
        
        {/* TSRID Logo - Absolutely Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <img 
            src="https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/1angt2am_TSRID_Logo1_white.svg"
            alt="TSRID GmbH"
            className="h-10 w-auto"
          />
        </div>
      </div>
    </>
  );
};

export default FooterInfo;
