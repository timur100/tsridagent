import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import { 
  ArrowLeft, 
  Users, 
  Server, 
  HardDrive, 
  TrendingUp,
  Edit2,
  Save,
  X,
  MapPin,
  Wifi,
  WifiOff,
  Settings,
  ScanLine,
  CheckCircle,
  HelpCircle,
  XCircle,
  ShoppingCart,
  AlertCircle,
  Calendar,
  Clock
} from 'lucide-react';

const TenantDetailPage = ({ tenantId, onBack }) => {
  const { theme } = useTheme();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditing, setIsEditing] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'overview', label: 'Übersicht' },
    { id: 'subscription', label: 'Vertrag & Subscription' },
    { id: 'locations', label: 'Standorte' },
    { id: 'branding', label: 'Branding' },
    { id: 'statistics', label: 'Statistik' },
    { id: 'billing', label: 'Abrechnung' }
  ];

  useEffect(() => {
    fetchTenantDetails();
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setTenant(data);
      } else {
        console.error('Tenant not found');
        if (onBack) onBack();
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.inactive}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {tenant.display_name}
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {tenant.name}
            </p>
          </div>
          {getStatusBadge(tenant.status)}
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 ${
            isEditing
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
              : 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" />
              Speichern
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Bearbeiten
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-300 hover:bg-[#2a2a2a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Benutzer
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.user_count}
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_users}
                    </p>
                  </div>
                  <Users className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Geräte
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.device_count}
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_devices}
                    </p>
                  </div>
                  <Server className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Standorte */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Standorte
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      5
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_locations || 10}
                    </p>
                  </div>
                  <MapPin className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Online */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Online
                    </p>
                    <p className={`text-3xl font-bold text-green-500`}>
                      3
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Geräte aktiv
                    </p>
                  </div>
                  <Wifi className={`h-12 w-12 text-green-500`} />
                </div>
              </Card>

              {/* Offline */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Offline
                    </p>
                    <p className={`text-3xl font-bold text-red-500`}>
                      2
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Geräte inaktiv
                    </p>
                  </div>
                  <WifiOff className={`h-12 w-12 text-red-500`} />
                </div>
              </Card>

              {/* Scans Insgesamt */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Scans Insgesamt
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      1,234
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      diesen Monat
                    </p>
                  </div>
                  <ScanLine className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Korrekte Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Korrekte Scans
                    </p>
                    <p className={`text-3xl font-bold text-green-500`}>
                      1,180
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      95.6% Erfolgsrate
                    </p>
                  </div>
                  <CheckCircle className={`h-12 w-12 text-green-500`} />
                </div>
              </Card>

              {/* Unbekannte Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Unbekannte Scans
                    </p>
                    <p className={`text-3xl font-bold text-yellow-500`}>
                      38
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      3.1% der Scans
                    </p>
                  </div>
                  <HelpCircle className={`h-12 w-12 text-yellow-500`} />
                </div>
              </Card>

              {/* Fehlgeschlagene Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fehlgeschlagene Scans
                    </p>
                    <p className={`text-3xl font-bold text-red-500`}>
                      16
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      1.3% der Scans
                    </p>
                  </div>
                  <XCircle className={`h-12 w-12 text-red-500`} />
                </div>
              </Card>

              {/* Bestellungen Offen */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Bestellungen Offen
                    </p>
                    <p className={`text-3xl font-bold text-blue-500`}>
                      7
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      in Bearbeitung
                    </p>
                  </div>
                  <ShoppingCart className={`h-12 w-12 text-blue-500`} />
                </div>
              </Card>

              {/* Tickets Offen */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tickets Offen
                    </p>
                    <p className={`text-3xl font-bold text-orange-500`}>
                      3
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      benötigen Aufmerksamkeit
                    </p>
                  </div>
                  <AlertCircle className={`h-12 w-12 text-orange-500`} />
                </div>
              </Card>

              {/* Vertragslaufzeit - Kombinierte Kachel */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Vertragslaufzeit
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-2xl font-bold text-blue-500`}>
                          45
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Tage bis Verlängerung
                        </p>
                      </div>
                      <div className={`h-10 w-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                      <div>
                        <p className={`text-2xl font-bold text-purple-500`}>
                          365
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Tage bis Vertragsende
                        </p>
                      </div>
                    </div>
                  </div>
                  <Calendar className={`h-12 w-12 ml-4 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>
            </div>

            {/* Additional Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`p-6 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              }`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Ressourcen-Nutzung
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Benutzer</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.user_count} / {tenant.limits.max_users}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.user_count / tenant.limits.max_users) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Geräte</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.device_count} / {tenant.limits.max_devices}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.device_count / tenant.limits.max_devices) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Storage</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.storage_used_gb} / {tenant.limits.max_storage_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.storage_used_gb / tenant.limits.max_storage_gb) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className={`p-6 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              }`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tenant-Informationen
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Domain</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.domain || '-'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Subscription Plan</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.subscription_plan}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Admin Email</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.contact.admin_email}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Erstellt</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(tenant.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Vollständige Tenant-Details
              </h3>
              {/* Existing overview content from modal */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name (ID)</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.name}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Domain</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.domain || '-'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'subscription' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Vertrag & Subscription
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Verwalten Sie Verträge und Subscriptions für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'locations' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Standorte
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Verwalten Sie Standorte für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'branding' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Branding
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Konfigurieren Sie Logo, Farben und Corporate Identity für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'statistics' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Statistik
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Detaillierte Statistiken und Analysen für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'billing' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Abrechnung
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Rechnungen, Zahlungshistorie und Abrechnungseinstellungen für diesen Tenant.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TenantDetailPage;
