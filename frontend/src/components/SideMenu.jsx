import React, { useState, useEffect } from 'react';
import { X, Home, Settings, Users, FileText, BarChart, Shield, Lock, Monitor, Cpu, Wifi, Server } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const SideMenu = ({ isOpen, onClose, onAdminClick, onHistoryClick }) => {
  const [agentInfo, setAgentInfo] = useState(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Prüfe ob wir in Electron sind und hole System-Info
    const checkElectron = async () => {
      if (window.agentAPI && window.agentAPI.isElectron) {
        setIsElectron(true);
        try {
          const systemInfo = await window.agentAPI.getSystemInfo();
          const status = await window.agentAPI.getStatus();
          setAgentInfo({ ...systemInfo, ...status });
        } catch (e) {
          console.log('Agent Info nicht verfügbar');
        }
      }
    };
    
    if (isOpen) {
      checkElectron();
    }
  }, [isOpen]);

  const menuItems = [
    { id: 'home', label: 'Startseite', icon: Home },
    { id: 'verifications', label: 'Verifizierungen', icon: Shield },
    { id: 'statistics', label: 'Statistiken', icon: BarChart },
    { id: 'users', label: 'Benutzer', icon: Users },
    { id: 'reports', label: 'Berichte', icon: FileText },
    { id: 'settings', label: 'Einstellungen', icon: Settings }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Slide Menu */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r-2 border-border z-50 animate-in slide-in-from-left duration-300 flex flex-col">
        {/* Header with Logo */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Menü</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>
          </div>
          
          {/* Logo */}
          <div className="flex items-center justify-center py-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/1angt2am_TSRID_Logo1_white.svg"
              alt="TSRID GmbH"
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'verifications') {
                      onHistoryClick();
                    }
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-primary/10 hover:border-primary/30 border-2 border-transparent transition-all group"
                >
                  <Icon className="h-6 w-6 text-primary group-hover:text-primary" />
                  <span className="text-base font-medium text-foreground group-hover:text-foreground">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Agent System Info (nur in Electron sichtbar) */}
          {isElectron && agentInfo && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Agent Status</h3>
                <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
                  agentInfo.status === 'running' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {agentInfo.status === 'running' ? '● Online' : '○ Offline'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Device:</span>
                  <span className="text-foreground font-mono text-xs truncate">
                    {agentInfo.deviceId || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Hostname:</span>
                  <span className="text-foreground">
                    {agentInfo.hostname || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <span className="text-foreground">
                    {agentInfo.ipAddresses?.[0] || 'N/A'}
                  </span>
                </div>
                
                {agentInfo.teamviewerId && (
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">TeamViewer:</span>
                    <span className="text-foreground font-mono">
                      {agentInfo.teamviewerId}
                    </span>
                  </div>
                )}
                
                {agentInfo.pcSerial && (
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="text-foreground font-mono text-xs">
                      {agentInfo.pcSerial}
                    </span>
                  </div>
                )}
                
                {agentInfo.macAddresses?.[0] && (
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">MAC:</span>
                    <span className="text-foreground font-mono text-xs">
                      {agentInfo.macAddresses[0]}
                    </span>
                  </div>
                )}
                
                {agentInfo.lastHeartbeat && (
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    Letzter Heartbeat: {agentInfo.lastHeartbeat}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Admin Button */}
          <Button
            onClick={() => {
              onAdminClick();
              onClose();
            }}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Lock className="h-5 w-5" />
            Administrator-Bereich
          </Button>
          
          {/* Admin Portal Button */}
          <Button
            onClick={() => {
              window.location.href = '/portal/admin';
            }}
            variant="outline"
            className="w-full gap-2 border-2 border-primary/50 hover:bg-primary/10"
          >
            <Settings className="h-5 w-5" />
            Admin Portal öffnen
          </Button>
          
          {/* Version Info */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            TSRID GmbH - Version 1.2
          </p>
        </div>
      </div>
    </>
  );
};

export default SideMenu;
