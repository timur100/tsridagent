import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ChevronRight, ChevronDown, FlaskConical, UserCheck, Fingerprint, 
  Search, Menu, X, Brain, Camera, Zap, Car, ParkingCircle, 
  Clock, Shield, CreditCard, Truck, Radio, Video, UtensilsCrossed, Bike, Monitor, Package, Phone
} from 'lucide-react';

const RnDSidebar = ({ activeSection, onSectionChange, collapsed, onToggleCollapse }) => {
  const { theme } = useTheme();
  const [expandedCategories, setExpandedCategories] = useState(['biometrics', 'vehicles', 'parking', 'access', 'ai', 'imaging', 'kiosk', 'automation', 'control', 'surveillance', 'services', 'shipping', 'telephony', 'test-center']);

  const menuStructure = [
    {
      id: 'biometrics',
      label: 'Biometrie',
      icon: UserCheck,
      items: [
        { id: 'facematch', label: 'Facematch', emoji: '👤' },
        { id: 'fingerprint', label: 'Fingerprint', emoji: '👆' },
        { id: 'iris-scan', label: 'Iris Scan', emoji: '👁️' },
        { id: 'document-scan', label: 'Dokumentenscan', emoji: '📄' }
      ]
    },
    {
      id: 'vehicles',
      label: 'Fahrzeuge & Mobilität',
      icon: Car,
      items: [
        { id: 'license-plate-recognition', label: 'Kennzeichenerkennung', emoji: '🚗' },
        { id: 'fleet-management', label: 'Flottenmanagement', emoji: '🚚' },
        { id: 'europcar-integration', label: 'Europcar PKW-Vermietung', emoji: '🔑' }
      ]
    },
    {
      id: 'parking',
      label: 'Parksysteme',
      icon: ParkingCircle,
      items: [
        { id: 'parking-system', label: 'Parkhaussystem', emoji: '🅿️' },
        { id: 'parking-payment', label: 'Parkhaus-Bezahlsystem', emoji: '💳' },
        { id: 'parking-overstay', label: 'Parkzeitüberschreitung', emoji: '⏱️' }
      ]
    },
    {
      id: 'access',
      label: 'Zutrittskontrolle',
      icon: Shield,
      items: [
        { id: 'access-control', label: 'Zutrittssysteme', emoji: '🚪' },
        { id: 'time-tracking', label: 'Zeiterfassung', emoji: '🕐' }
      ]
    },
    {
      id: 'ai',
      label: 'KI & Analyse',
      icon: Brain,
      items: [
        { id: 'ki-search', label: 'KI-Suche', emoji: '🔍' },
        { id: 'document-analysis', label: 'Dokumentenanalyse', emoji: '📄' },
        { id: 'anomaly-detection', label: 'Anomalieerkennung', emoji: '⚠️' }
      ]
    },
    {
      id: 'imaging',
      label: 'Bildverarbeitung',
      icon: Camera,
      items: [
        { id: 'background-removal', label: 'Hintergrund-Entfernung', emoji: '🖼️' },
        { id: 'image-enhancement', label: 'Bildverbesserung', emoji: '✨' },
        { id: 'ocr-advanced', label: 'Erweiterte OCR', emoji: '📝' }
      ]
    },
    {
      id: 'kiosk',
      label: 'Kiosksysteme',
      icon: Monitor,
      items: [
        { id: 'kiosk-management', label: 'Kiosk-Verwaltung', emoji: '🖥️' },
        { id: 'kiosk-configuration', label: 'Kiosk-Konfiguration', emoji: '⚙️' },
        { id: 'kiosk-monitoring', label: 'Kiosk-Monitoring', emoji: '📊' },
        { id: 'key-automat', label: 'Schlüsselautomat', emoji: '🔐' }
      ]
    },
    {
      id: 'automation',
      label: 'Automatisierung',
      icon: Zap,
      items: [
        { id: 'workflow-builder', label: 'Workflow Builder', emoji: '⚙️' },
        { id: 'batch-processing', label: 'Stapelverarbeitung', emoji: '📦' },
        { id: 'api-testing', label: 'API Testing', emoji: '🔧' },
        { id: 'quick-menu', label: 'Schnellmenü', emoji: '⚡' }
      ]
    },
    {
      id: 'control',
      label: 'Steuerung',
      icon: Radio,
      items: [
        { id: 'control-system', label: 'Steuerungssysteme', emoji: '🎛️' }
      ]
    },
    {
      id: 'surveillance',
      label: 'Surveillance',
      icon: Video,
      items: [
        { id: 'surveillance-system', label: 'Überwachungssysteme', emoji: '📹' }
      ]
    },
    {
      id: 'services',
      label: 'Services',
      icon: Truck,
      items: [
        { id: 'fastfood-system', label: 'Fastfood Bestellsystem', emoji: '🍔' },
        { id: 'delivery-service', label: 'Lieferservice', emoji: '📦' },
        { id: 'mobility-services', label: 'Mobility Services', emoji: '🚗' }
      ]
    },
    {
      id: 'shipping',
      label: 'Paketversand',
      icon: Package,
      items: [
        { id: 'dhl-shipping', label: 'DHL', emoji: '📦' }
      ]
    },
    {
      id: 'telephony',
      label: 'Telefonie',
      icon: Phone,
      items: [
        { id: 'placetel', label: 'Placetel', emoji: '☎️' }
      ]
    },
    {
      id: 'test-center',
      label: 'Test Center',
      icon: FlaskConical,
      items: [
        { id: 'data-check', label: 'Daten Check', emoji: '🔍' }
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
            <FlaskConical className="h-5 w-5 text-[#c00000]" />
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              R&D
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
            {!collapsed && expandedCategories.includes(category.id) && (
              <div className="ml-8 mt-1 space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      activeSection === item.id
                        ? theme === 'dark'
                          ? 'bg-[#c00000]/20 text-[#c00000] font-medium'
                          : 'bg-red-50 text-[#c00000] font-medium'
                        : theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
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
            {menuStructure.flatMap(cat => cat.items).slice(0, 6).map((item) => (
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

export default RnDSidebar;
