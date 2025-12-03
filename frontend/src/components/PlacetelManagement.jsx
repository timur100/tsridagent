import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Phone, Users, PhoneCall, Settings, Headphones, GitBranch, FileText, UserCircle } from 'lucide-react';

const PlacetelManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('numbers');

  const tabs = [
    { id: 'numbers', label: 'Rufnummern', icon: Phone },
    { id: 'calls', label: 'Anrufe', icon: PhoneCall },
    { id: 'contacts', label: 'Kontakte', icon: Users },
    { id: 'callcenter', label: 'Call Center', icon: Headphones },
    { id: 'routing', label: 'Routing', icon: GitBranch },
    { id: 'faxes', label: 'Faxe', icon: FileText },
    { id: 'sipusers', label: 'SIP Users', icon: UserCircle },
    { id: 'settings', label: 'Einstellungen', icon: Settings }
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
            <div className="text-center py-12">
              <Phone className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Rufnummernverwaltung
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Rufnummern auflisten, Profile erstellen/aktivieren, Rufnummern aktivieren/deaktivieren
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'calls' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Anrufe
              </h2>
            </div>
            <div className="text-center py-12">
              <PhoneCall className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Anrufliste & Voicemails
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Eingehende Anrufe, Voicemails, verpasste Anrufe, Anruf-Details mit Kontaktinformationen
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'contacts' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kontakte
              </h2>
            </div>
            <div className="text-center py-12">
              <Users className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Kontaktverwaltung
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Kontakte erstellen/bearbeiten/löschen, Speeddial-Nummern, Filter nach Name/Email/Telefon
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'callcenter' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Call Center
              </h2>
            </div>
            <div className="text-center py-12">
              <Headphones className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Call Center Management
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Agents verwalten, Warteschlangen (Queues), Call Center Anrufe, Anruf-Picking
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'routing' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Routing
              </h2>
            </div>
            <div className="text-center py-12">
              <GitBranch className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Routing-Pläne & IVR
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Routing-Pläne erstellen/verwalten, IVR (Interactive Voice Response), Ansagen
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'faxes' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Faxe
              </h2>
            </div>
            <div className="text-center py-12">
              <FileText className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fax-Ein- & Ausgang
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Eingehende/Ausgehende Faxe abrufen, Fax senden, Fax-Details
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'sipusers' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                SIP Users
              </h2>
            </div>
            <div className="text-center py-12">
              <UserCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                SIP-Benutzerverwaltung
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                SIP-Benutzer erstellen/verwalten, Short Codes (Kurzwahlen), Online-Status
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Einstellungen
              </h2>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  API Konfiguration
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Base URL
                    </label>
                    <input
                      type="text"
                      value="https://api.placetel.de/v2/"
                      readOnly
                      className={`w-full mt-1 px-3 py-2 rounded border text-sm font-mono ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-gray-300'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value="de1636b285181b054e5871e25aae99d9ac24c018c177d504010246e964a2b327d20a416f598ecf78525605cf19d281a8c12819c82ae1913935a4a90217aa33aa"
                      readOnly
                      className={`w-full mt-1 px-3 py-2 rounded border text-sm font-mono ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-gray-300'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Webhooks & Subscriptions
                </h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Webhook-Subscriptions für Events wie eingehende/ausgehende Anrufe, CTI Events
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlacetelManagement;
