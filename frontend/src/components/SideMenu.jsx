import React from 'react';
import { X, Home, Settings, Users, FileText, BarChart, Shield, Lock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const SideMenu = ({ isOpen, onClose, onAdminClick, onHistoryClick }) => {
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
