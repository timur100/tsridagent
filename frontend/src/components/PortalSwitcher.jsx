import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftRight, ChevronDown, User, Shield } from 'lucide-react';

const PortalSwitcher = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const currentPortal = location.pathname.includes('/admin') ? 'admin' : 'customer';

  // Only show switcher for admins
  if (!isAdmin) {
    return null;
  }

  const portals = [
    {
      id: 'admin',
      name: 'Admin Portal',
      path: '/admin',
      icon: Shield,
      description: 'Vollständige Systemverwaltung'
    },
    {
      id: 'customer',
      name: 'Kunden Portal',
      path: '/customer',
      icon: User,
      description: 'Kundenansicht'
    }
  ];

  const handleSwitch = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const currentPortalInfo = portals.find(p => p.id === currentPortal);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20"
      >
        <ArrowLeftRight className="h-4 w-4" />
        <span className="font-medium">{currentPortalInfo?.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 w-72 bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
            {portals.map((portal) => {
              const Icon = portal.icon;
              const isActive = portal.id === currentPortal;
              
              return (
                <button
                  key={portal.id}
                  onClick={() => handleSwitch(portal.path)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    isActive ? 'bg-[#c00000]/10 border-l-4 border-[#c00000]' : ''
                  }`}
                  disabled={isActive}
                >
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-[#c00000]' : 'bg-white/10'
                  }`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className={`font-semibold ${isActive ? 'text-[#c00000]' : 'text-white'}`}>
                      {portal.name}
                      {isActive && <span className="ml-2 text-xs">(Aktiv)</span>}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {portal.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PortalSwitcher;
