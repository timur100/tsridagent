import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, GitBranch, Package, Wrench, Settings, PlayCircle } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const AutomationManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'overview', label: 'Übersicht', icon: Zap },
          { id: 'workflows', label: 'Workflow Builder', icon: GitBranch },
          { id: 'batch', label: 'Stapelverarbeitung', icon: Package },
          { id: 'api-testing', label: 'API Testing', icon: Wrench },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div>
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ⚡ Automatisierung
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Prozessautomatisierung und Workflow-Management
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="text-center py-12">
            <Zap className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Feature in Planung - Wird bald verfügbar sein
            </p>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="text-center py-12">
            <GitBranch className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Workflow Builder - In Entwicklung
            </p>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="text-center py-12">
            <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Stapelverarbeitung - In Entwicklung
            </p>
          </div>
        )}

        {activeTab === 'api-testing' && (
          <div className="text-center py-12">
            <Wrench className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              API Testing - In Entwicklung
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

export default AutomationManagement;
