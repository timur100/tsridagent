import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle, Clock, BarChart3, Bell, Settings as SettingsIcon } from 'lucide-react';

const KioskMonitoring = ({ theme }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [monitoringData, setMonitoringData] = useState([
    {
      kiosk_id: '1',
      name: 'Kiosk Haupteingang',
      status: 'online',
      metrics: {
        cpu_usage: 45,
        memory_usage: 68,
        disk_usage: 52,
        network_strength: 85,
        uptime: '12d 5h 23m',
        last_heartbeat: '2 Sekunden'
      },
      alerts: []
    },
    {
      kiosk_id: '2',
      name: 'Kiosk Empfang',
      status: 'online',
      metrics: {
        cpu_usage: 32,
        memory_usage: 54,
        disk_usage: 48,
        network_strength: 92,
        uptime: '8d 14h 12m',
        last_heartbeat: '1 Sekunde'
      },
      alerts: []
    },
    {
      kiosk_id: '3',
      name: 'Kiosk Parkhaus',
      status: 'error',
      metrics: {
        cpu_usage: 89,
        memory_usage: 95,
        disk_usage: 88,
        network_strength: 45,
        uptime: '2h 45m',
        last_heartbeat: '45 Sekunden'
      },
      alerts: [
        { type: 'error', message: 'Hohe CPU-Auslastung (89%)' },
        { type: 'warning', message: 'Schwaches Netzwerksignal (45%)' }
      ]
    }
  ]);

  const getUsageColor = (usage) => {
    if (usage >= 80) return 'text-red-500';
    if (usage >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageBarColor = (usage) => {
    if (usage >= 80) return 'bg-red-500';
    if (usage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getNetworkIcon = (strength) => {
    if (strength >= 70) return '📶';
    if (strength >= 40) return '📡';
    return '📵';
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Übersicht', icon: BarChart3 },
            { id: 'alerts', label: 'Warnungen', icon: Bell },
            { id: 'settings', label: 'Einstellungen', icon: SettingsIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#c00000] text-[#c00000]'
                    : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Kiosk-Monitoring
        </h2>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Überwachen Sie Systemmetriken und Status aller Kiosksysteme in Echtzeit
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {monitoringData.length}
              </p>
            </div>
            <Activity className="h-8 w-8 text-gray-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Online
              </p>
              <p className="text-2xl font-bold text-green-500">
                {monitoringData.filter(k => k.status === 'online').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fehler
              </p>
              <p className="text-2xl font-bold text-red-500">
                {monitoringData.filter(k => k.status === 'error').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Warnungen
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {monitoringData.reduce((sum, k) => sum + k.alerts.length, 0)}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Kiosk Monitoring Cards */}
      <div className="space-y-4">
        {monitoringData.map((kiosk) => (
          <div
            key={kiosk.kiosk_id}
            className={`p-6 rounded-xl border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Kiosk Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  kiosk.status === 'online' ? 'bg-green-500' :
                  kiosk.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {kiosk.name}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Uptime: {kiosk.metrics.uptime}
                  </span>
                </div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  ❤️ {kiosk.metrics.last_heartbeat}
                </span>
              </div>
            </div>

            {/* Alerts */}
            {kiosk.alerts.length > 0 && (
              <div className="mb-4 space-y-2">
                {kiosk.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      alert.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.type === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <span className={`text-sm ${
                      alert.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {alert.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      CPU
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${getUsageColor(kiosk.metrics.cpu_usage)}`}>
                    {kiosk.metrics.cpu_usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageBarColor(kiosk.metrics.cpu_usage)}`}
                    style={{ width: `${kiosk.metrics.cpu_usage}%` }}
                  ></div>
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      RAM
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${getUsageColor(kiosk.metrics.memory_usage)}`}>
                    {kiosk.metrics.memory_usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageBarColor(kiosk.metrics.memory_usage)}`}
                    style={{ width: `${kiosk.metrics.memory_usage}%` }}
                  ></div>
                </div>
              </div>

              {/* Disk Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Disk
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${getUsageColor(kiosk.metrics.disk_usage)}`}>
                    {kiosk.metrics.disk_usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageBarColor(kiosk.metrics.disk_usage)}`}
                    style={{ width: `${kiosk.metrics.disk_usage}%` }}
                  ></div>
                </div>
              </div>

              {/* Network Strength */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Netzwerk
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${getUsageColor(100 - kiosk.metrics.network_strength)}`}>
                    {kiosk.metrics.network_strength}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageBarColor(100 - kiosk.metrics.network_strength)}`}
                    style={{ width: `${kiosk.metrics.network_strength}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KioskMonitoring;
