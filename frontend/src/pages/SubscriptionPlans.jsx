import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import { Plus, Edit2, Trash2, Package, DollarSign, Settings as SettingsIcon } from 'lucide-react';

const SubscriptionPlans = () => {
  const { theme } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 29,
      currency: '€',
      interval: 'Monat',
      features: ['100 Benutzer', '1.000 Geräte', '50 GB Storage', '10.000 API Calls/Tag'],
      limits: { max_users: 100, max_devices: 1000, max_storage_gb: 50, max_api_calls: 10000 }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 99,
      currency: '€',
      interval: 'Monat',
      features: ['500 Benutzer', '5.000 Geräte', '250 GB Storage', '50.000 API Calls/Tag'],
      limits: { max_users: 500, max_devices: 5000, max_storage_gb: 250, max_api_calls: 50000 }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 299,
      currency: '€',
      interval: 'Monat',
      features: ['Unbegrenzte Benutzer', 'Unbegrenzte Geräte', 'Unbegrenzter Storage', 'Unbegrenzte API Calls'],
      limits: { max_users: -1, max_devices: -1, max_storage_gb: -1, max_api_calls: -1 }
    }
  ];

  const subTabs = [
    { id: 'overview', label: 'Übersicht', icon: Package },
    { id: 'create', label: 'Plan anlegen', icon: Plus },
    { id: 'features', label: 'Feature-Editor', icon: SettingsIcon },
    { id: 'pricing', label: 'Preisgestaltung', icon: DollarSign }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Subscription Plans
        </h2>
        <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Verwalten Sie Ihre Subscription-Pläne und deren Features
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 flex-wrap">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeSubTab === tab.id
                  ? 'bg-[#c00000] text-white'
                  : theme === 'dark'
                  ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#1a1a1a]'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1'
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
                }`}
              >
                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                      {plan.currency}
                    </span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      / {plan.interval}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className={`space-y-2 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c00000]" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className={`flex gap-2 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    className={`flex-1 px-3 py-2 rounded-lg border transition-all hover:scale-105 ${
                      theme === 'dark'
                        ? 'border-gray-700 text-gray-300 hover:bg-[#1a1a1a]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Edit2 className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 rounded-lg border transition-all hover:scale-105 ${
                      theme === 'dark'
                        ? 'border-gray-700 text-gray-300 hover:bg-[#1a1a1a]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'create' && (
        <Card className={`p-6 rounded-xl ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Neuen Plan erstellen
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Formular zum Erstellen eines neuen Subscription-Plans wird hier implementiert.
          </p>
        </Card>
      )}

      {activeSubTab === 'features' && (
        <Card className={`p-6 rounded-xl ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Feature-Editor
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Verwalten Sie Features und Berechtigungen für jeden Plan.
          </p>
        </Card>
      )}

      {activeSubTab === 'pricing' && (
        <Card className={`p-6 rounded-xl ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Preisgestaltung
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Konfigurieren Sie Preise, Währungen und Abrechnungsintervalle.
          </p>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionPlans;
