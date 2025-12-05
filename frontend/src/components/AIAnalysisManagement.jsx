import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Brain, FileText, TrendingUp, Settings, AlertTriangle, BarChart3 } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const AIAnalysisManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'overview', label: 'Übersicht', icon: Brain },
          { id: 'documents', label: 'Dokumentenanalyse', icon: FileText },
          { id: 'anomaly', label: 'Anomalieerkennung', icon: AlertTriangle },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div>
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🧠 KI-Analyse
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Künstliche Intelligenz für fortgeschrittene Datenanalyse und Mustererkennung
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="text-center py-12">
            <Brain className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Feature in Planung - Wird bald verfügbar sein
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="text-center py-12">
            <FileText className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Dokumentenanalyse - In Entwicklung
            </p>
          </div>
        )}

        {activeTab === 'anomaly' && (
          <div className="text-center py-12">
            <AlertTriangle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Anomalieerkennung - In Entwicklung
            </p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Analytics - In Entwicklung
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <Settings className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Einstellungen - In Entwicklung
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisManagement;
