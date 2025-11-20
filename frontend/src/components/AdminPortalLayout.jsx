import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, MapPin, Monitor, Users, Settings, Key } from 'lucide-react';
import { Button } from './ui/button';
import ThemeToggle from './ThemeToggle';
import PortalSwitcher from './PortalSwitcher';
import GlobalSearch from './GlobalSearch';

const AdminPortalLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('TSRID');

  // Navigation tabs
  const tabs = [
    { id: 'tenants', label: 'Tenants', icon: Users, path: '/portal/admin' },
    { id: 'standorte', label: 'Standorte', icon: MapPin, path: '/portal/admin?tab=standorte' },
    { id: 'devices', label: 'Geräte', icon: Monitor, path: '/portal/admin?tab=devices' },
    { id: 'settings', label: 'Einstellungen', icon: Settings, path: '/portal/admin?tab=settings' },
  ];

  const handleTabClick = (tab) => {
    navigate(tab.path);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5' }}>
      {/* Red Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#c00000] shadow-lg">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Tabs */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-[#c00000]" />
                </div>
                <span className="text-white font-bold text-xl">{companyName}</span>
              </div>

              {/* Navigation Tabs */}
              <div className="hidden md:flex items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:bg-[#a00000] transition-all"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Search, Theme Toggle, Portal Switcher, Logout */}
            <div className="flex items-center gap-4">
              <GlobalSearch theme={theme} />
              <ThemeToggle />
              <PortalSwitcher />
              <Button
                onClick={logout}
                variant="ghost"
                className="text-white hover:bg-[#a00000]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};

export default AdminPortalLayout;
