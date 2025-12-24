import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ChevronRight, ChevronDown, Settings, Building2, Database, 
  MapPin, Wrench, Key, FileText, Menu, X, Server
} from 'lucide-react';

const SettingsSidebar = ({ activeSection, onSectionChange, collapsed, onToggleCollapse }) => {
  const { theme } = useTheme();
  const [expandedCategories, setExpandedCategories] = useState(['company', 'data', 'locations', 'portals', 'system', 'infrastructure']);

  const menuStructure = [
    {
      id: 'company',
      label: 'Firma',
      icon: Building2,
      items: [
        { id: 'branding', label: 'Branding', emoji: '🎨' },
        { id: 'portal-metadata', label: 'Portal-Metadaten', emoji: '🌐' },
        { id: 'api-keys', label: 'API Keys', emoji: '🔑' }
      ]
    },
    {
      id: 'infrastructure',
      label: 'Infrastruktur',
      icon: Server,
      items: [
        { id: 'servers', label: 'Server', emoji: '🖥️' },
        { id: 'deployments', label: 'Deployments', emoji: '🚀' },
        { id: 'health', label: 'Health', emoji: '💚' }
      ]
    },
    {
      id: 'data',
      label: 'Daten',
      icon: Database,
      items: [
        { id: 'backup', label: 'Backup', emoji: '💾' },
        { id: 'data', label: 'Management', emoji: '📁' }
      ]
    },
    {
      id: 'locations',
      label: 'Standorte',
      icon: MapPin,
      items: [
        { id: 'categories', label: 'Kategorien', emoji: '📍' }
      ]
    },
    {
      id: 'portals',
      label: 'Portale',
      icon: Settings,
      items: [
        { id: 'portal-scan', label: 'Scan App', emoji: '📱' },
        { id: 'portal-catalog', label: 'Catalog', emoji: '📚' },
        { id: 'portal-kiosk', label: 'Kiosk', emoji: '🖥️' },
        { id: 'portal-tickets', label: 'Ticket System', emoji: '🎫' },
        { id: 'portal-wallboard', label: 'Wall Board', emoji: '📺' }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: Wrench,
      items: [
        { id: 'customers-management', label: 'Kunden', emoji: '🏢' },
        { id: 'assets', label: 'Assets', emoji: '📦' },
        { id: 'portal', label: 'Portal', emoji: '🚀' },
        { id: 'scanner-pin', label: 'Scanner PIN', emoji: '🔒' },
        { id: 'subscription-plans', label: 'Subscription Plans', emoji: '💳' },
        { id: 'microservices', label: 'Microservices', emoji: '⚙️' },
        { id: 'integrations', label: 'Integrationen', emoji: '🔌' }
      ]
    }
  ];

  const toggleCategory = (categoryId) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  return (
    <div className={`flex flex-col h-full ${
      collapsed ? 'w-16' : 'w-64'
    } transition-all duration-300 border-r ${
      theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header with Collapse Button */}
      <div className={`flex items-center justify-between p-4 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#c00000]" />
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Einstellungen
            </h3>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-800 text-gray-400'
              : 'hover:bg-gray-200 text-gray-600'
          } ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Menü erweitern' : 'Menü minimieren'}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuStructure.map((category) => (
          <div key={category.id} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => !collapsed && toggleCategory(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title={collapsed ? category.label : ''}
            >
              <category.icon className={`h-5 w-5 flex-shrink-0 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-semibold text-sm">
                    {category.label}
                  </span>
                  {expandedCategories.includes(category.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>

            {/* Sub-items */}
            {!collapsed && (expandedCategories.includes(category.id) || category.id === 'system') && (
              <div className="ml-8 mt-1 space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === item.id
                        ? theme === 'dark'
                          ? 'bg-[#c00000]/20 text-[#c00000] font-medium'
                          : 'bg-red-50 text-[#c00000] font-medium'
                        : theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapsed State - Quick Icons */}
      {collapsed && (
        <div className="p-2 border-t border-gray-700">
          <div className="space-y-2">
            {menuStructure.flatMap(cat => cat.items).map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-[#c00000]/20'
                    : theme === 'dark'
                    ? 'hover:bg-gray-800'
                    : 'hover:bg-gray-200'
                }`}
                title={item.label}
              >
                <span className="text-xl">{item.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSidebar;
