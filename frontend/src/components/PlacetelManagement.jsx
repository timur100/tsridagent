import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Phone, Users, PhoneCall, Settings } from 'lucide-react';

const PlacetelManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('numbers');

  const tabs = [
    { id: 'numbers', label: 'Rufnummern', icon: Phone }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation - ganz oben */}
      <div className={`flex gap-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Placetel Integration
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Telefonie-Integration und Rufnummernverwaltung
          </p>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'numbers' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Rufnummern
              </h2>
            </div>

            {/* Placeholder Content */}
            <div className="text-center py-12">
              <Phone className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Rufnummernverwaltung
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Hier können Sie Ihre Placetel Rufnummern verwalten
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlacetelManagement;
