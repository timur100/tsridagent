import React from 'react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useTheme } from '../contexts/ThemeContext';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';

const ImpersonationBanner = () => {
  const { impersonatedCustomer, clearImpersonation } = useImpersonation();
  const { theme } = useTheme();

  if (!impersonatedCustomer) {
    return null;
  }

  return (
    <div className={`w-full border-b-2 border-orange-500 ${
      theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-full">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            
            <div>
              <div className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
              }`}>
                Administrator-Ansicht
              </div>
              <div className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Sie betrachten das Portal als: {impersonatedCustomer.name} ({impersonatedCustomer.company})
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Alle Änderungen werden als dieser Kunde gespeichert
              </div>
            </div>
          </div>

          <Button
            onClick={clearImpersonation}
            className={`flex items-center gap-2 ${
              theme === 'dark'
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <X className="h-4 w-4" />
            <span>Zurück zur Verwaltung</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
