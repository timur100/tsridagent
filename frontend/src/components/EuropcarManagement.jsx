import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SubTabNavigation from './SubTabNavigation';
import EuropcarVehicles from './EuropcarVehicles';
import EuropcarReservations from './EuropcarReservations';
import EuropcarCustomers from './EuropcarCustomers';
import EuropcarContracts from './EuropcarContracts';
import EuropcarReturns from './EuropcarReturns';
import { Car, Calendar, Users, FileText, RotateCcw, TrendingUp } from 'lucide-react';

const EuropcarManagement = ({ activeSubTab, setActiveSubTab }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();

  const tabs = [
    { id: 'vehicles', label: 'Fahrzeuge', icon: Car },
    { id: 'reservations', label: 'Reservierungen', icon: Calendar },
    { id: 'customers', label: 'Kunden', icon: Users },
    { id: 'contracts', label: 'Verträge', icon: FileText },
    { id: 'returns', label: 'Rückgaben', icon: RotateCcw },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'stations', label: 'Stationen', icon: Users },
    { id: 'damage', label: 'Schäden', icon: Users },
    { id: 'ai', label: 'KI-Features', icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🔑 Europcar PKW-Vermietung
        </h2>
        <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Vollständiges Flottenmanagement, Reservierungen und Kundenverwaltung
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <SubTabNavigation
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
        theme={theme}
      />

      {/* Content Area */}
      <div className="mt-6">
        {activeSubTab === 'vehicles' && <EuropcarVehicles />}
        {activeSubTab === 'reservations' && <EuropcarReservations />}
        {activeSubTab === 'customers' && <EuropcarCustomers />}
        {activeSubTab === 'contracts' && <EuropcarContracts />}
        {activeSubTab === 'returns' && <EuropcarReturns />}
        {activeSubTab === 'reports' && (
          <div className={`p-8 rounded-xl text-center ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
          } border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <TrendingUp className={`h-16 w-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Berichte & Analytics
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Wird in Phase 2 implementiert (Modul 11)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EuropcarManagement;
