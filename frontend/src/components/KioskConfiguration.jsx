import React, { useState } from 'react';
import { Settings, Monitor, Palette, Type, Layout, List, BarChart3, Wrench } from 'lucide-react';

const KioskConfiguration = ({ theme }) => {
  const [activeTab, setActiveTab] = useState('display');
  const [config, setConfig] = useState({
    display: {
      orientation: 'landscape',
      brightness: 80,
      sleepTimeout: 300,
      screensaver: true
    },
    interface: {
      language: 'de',
      fontSize: 'medium',
      theme: 'light',
      showLogo: true
    },
    functionality: {
      enablePrinting: true,
      enableScanning: true,
      enablePayment: true,
      enableCamera: false
    },
    maintenance: {
      autoReboot: true,
      rebootTime: '03:00',
      updateAutomatic: false
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Kiosk-Konfiguration
        </h2>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Konfigurieren Sie Anzeigeeinstellungen, Funktionen und Wartungsoptionen
        </p>
      </div>

      {/* Display Settings */}
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="h-5 w-5 text-[#c00000]" />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Anzeigeeinstellungen
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Ausrichtung
            </label>
            <select
              value={config.display.orientation}
              onChange={(e) => setConfig({
                ...config,
                display: { ...config.display, orientation: e.target.value }
              })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="landscape">Querformat</option>
              <option value="portrait">Hochformat</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Helligkeit: {config.display.brightness}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.display.brightness}
              onChange={(e) => setConfig({
                ...config,
                display: { ...config.display, brightness: parseInt(e.target.value) }
              })}
              className="w-full"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Standby-Timeout (Sekunden)
            </label>
            <input
              type="number"
              value={config.display.sleepTimeout}
              onChange={(e) => setConfig({
                ...config,
                display: { ...config.display, sleepTimeout: parseInt(e.target.value) }
              })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="screensaver"
              checked={config.display.screensaver}
              onChange={(e) => setConfig({
                ...config,
                display: { ...config.display, screensaver: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="screensaver"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Bildschirmschoner aktivieren
            </label>
          </div>
        </div>
      </div>

      {/* Interface Settings */}
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Palette className="h-5 w-5 text-[#c00000]" />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Oberfläche
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Sprache
            </label>
            <select
              value={config.interface.language}
              onChange={(e) => setConfig({
                ...config,
                interface: { ...config.interface, language: e.target.value }
              })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Schriftgröße
            </label>
            <select
              value={config.interface.fontSize}
              onChange={(e) => setConfig({
                ...config,
                interface: { ...config.interface, fontSize: e.target.value }
              })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="small">Klein</option>
              <option value="medium">Mittel</option>
              <option value="large">Groß</option>
              <option value="xlarge">Sehr groß</option>
            </select>
          </div>
        </div>
      </div>

      {/* Functionality Settings */}
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Layout className="h-5 w-5 text-[#c00000]" />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Funktionen
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enablePrinting"
              checked={config.functionality.enablePrinting}
              onChange={(e) => setConfig({
                ...config,
                functionality: { ...config.functionality, enablePrinting: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="enablePrinting"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Drucken aktivieren
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableScanning"
              checked={config.functionality.enableScanning}
              onChange={(e) => setConfig({
                ...config,
                functionality: { ...config.functionality, enableScanning: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="enableScanning"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Scannen aktivieren
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enablePayment"
              checked={config.functionality.enablePayment}
              onChange={(e) => setConfig({
                ...config,
                functionality: { ...config.functionality, enablePayment: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="enablePayment"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Zahlungsfunktion aktivieren
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableCamera"
              checked={config.functionality.enableCamera}
              onChange={(e) => setConfig({
                ...config,
                functionality: { ...config.functionality, enableCamera: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="enableCamera"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Kamera aktivieren
            </label>
          </div>
        </div>
      </div>

      {/* Maintenance Settings */}
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-[#c00000]" />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Wartung
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoReboot"
              checked={config.maintenance.autoReboot}
              onChange={(e) => setConfig({
                ...config,
                maintenance: { ...config.maintenance, autoReboot: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="autoReboot"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Automatischer Neustart
            </label>
          </div>

          {config.maintenance.autoReboot && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Neustartzeit
              </label>
              <input
                type="time"
                value={config.maintenance.rebootTime}
                onChange={(e) => setConfig({
                  ...config,
                  maintenance: { ...config.maintenance, rebootTime: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateAutomatic"
              checked={config.maintenance.updateAutomatic}
              onChange={(e) => setConfig({
                ...config,
                maintenance: { ...config.maintenance, updateAutomatic: e.target.checked }
              })}
              className="w-4 h-4"
            />
            <label
              htmlFor="updateAutomatic"
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Automatische Updates
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            console.log('Saving config:', config);
            // TODO: API call to save configuration
          }}
          className="px-6 py-3 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors font-semibold"
        >
          Konfiguration speichern
        </button>
      </div>
    </div>
  );
};

export default KioskConfiguration;
