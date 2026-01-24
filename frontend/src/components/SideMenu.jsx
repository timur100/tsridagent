import React, { useState, useEffect } from 'react';
import { X, Home, Settings, Users, FileText, BarChart, Shield, Lock, Monitor } from 'lucide-react';
import { Button } from './ui/button';

const SideMenu = ({ isOpen, onClose, onAdminClick, onHistoryClick }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Prüfe ob User als Admin eingeloggt ist
    const adminStatus = sessionStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, [isOpen]);

  const handleAdminLogin = async () => {
    const pin = prompt('Admin-PIN eingeben:');
    if (!pin) return;
    
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${BACKEND_URL}/api/scanner-pin/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      
      if (data.valid && data.role === 'admin') {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', 'admin');
        setIsAdmin(true);
        alert('Admin-Zugang aktiviert');
      } else {
        alert('Falscher Admin-PIN');
      }
    } catch (e) {
      alert('Fehler: ' + e.message);
    }
  };

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
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Menü</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
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
          
          {/* Admin Badge */}
          {isAdmin && (
            <div className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full text-center">
              ✓ Administrator-Modus aktiv
            </div>
          )}
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Menu Items */}
          <div className="space-y-2 mb-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'verifications') onHistoryClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-primary/10 border-2 border-transparent transition-all"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {!isAdmin ? (
            <Button
              onClick={handleAdminLogin}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              <Lock className="h-5 w-5" />
              Administrator-Bereich (PIN: 9988)
            </Button>
          ) : (
            <Button
              onClick={() => {
                sessionStorage.removeItem('isAdmin');
                sessionStorage.setItem('userRole', 'user');
                setIsAdmin(false);
                alert('Admin-Modus beendet');
              }}
              variant="outline"
              className="w-full gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Lock className="h-5 w-5" />
              Admin-Modus beenden
            </Button>
          )}
          
          <Button
            onClick={() => window.location.href = '/portal/admin'}
            variant="outline"
            className="w-full gap-2 border-2 border-primary/50 hover:bg-primary/10"
          >
            <Settings className="h-5 w-5" />
            Admin Portal öffnen
          </Button>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            TSRID GmbH - Version 1.2
          </p>
        </div>
      </div>
    </>
  );
};

export default SideMenu;
