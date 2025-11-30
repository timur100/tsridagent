import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SubTabNavigation from './SubTabNavigation';
import EuropcarVehicles from './EuropcarVehicles';
import EuropcarReservations from './EuropcarReservations';
import EuropcarCustomers from './EuropcarCustomers';
import EuropcarContracts from './EuropcarContracts';
import EuropcarReturns from './EuropcarReturns';
import EuropcarAnalytics from './EuropcarAnalytics';
import EuropcarAI from './EuropcarAI';
import { Car, Calendar, Users, FileText, RotateCcw, TrendingUp, MapPin, AlertTriangle, Brain } from 'lucide-react';

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
    { id: 'ai', label: 'KI-Features', icon: Brain }
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
        {activeSubTab === 'analytics' && <EuropcarAnalytics />}
        {activeSubTab === 'ai' && <EuropcarAI />}
      </div>
    </div>
  );
};

export default EuropcarManagement;
