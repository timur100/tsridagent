import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ParkingCircle, MapPin, CreditCard, Settings } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const ParkingSystemManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'overview', label: 'Übersicht', icon: ParkingCircle },
          { id: 'spaces', label: 'Parkplätze', icon: MapPin },
          { id: 'payment', label: 'Bezahlung', icon: CreditCard },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div>
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🅿️ Parkhaussystem
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwaltung und Überwachung von Parkhäusern
          </p>
        </div>

        <div className="text-center py-12">
          <ParkingCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Feature in Planung - Wird bald verfügbar sein
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParkingSystemManagement;
