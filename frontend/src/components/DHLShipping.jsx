import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Package, Truck, MapPin, User, Mail, Phone, Home, Calendar, Clock, CheckCircle, XCircle, Search, TrendingUp, Settings, Plus, FileText } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const DHLShipping = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [shipments, setShipments] = useState([
    {
      id: 'DHL001234567',
      recipient: 'Max Mustermann',
      address: 'Hauptstraße 123, 10115 Berlin',
      status: 'in_transit',
      created: '2024-12-01T10:30:00',
      estimated_delivery: '2024-12-03T16:00:00',
      weight: '2.5 kg',
      service: 'DHL Paket'
    },
    {
      id: 'DHL001234568',
      recipient: 'Anna Schmidt',
      address: 'Marienplatz 5, 80331 München',
      status: 'delivered',
      created: '2024-11-30T14:20:00',
      delivered: '2024-12-01T11:45:00',
      weight: '1.2 kg',
      service: 'DHL Express'
    },
    {
      id: 'DHL001234569',
      recipient: 'Thomas Weber',
      address: 'Reeperbahn 45, 20359 Hamburg',
      status: 'pending',
      created: '2024-12-01T15:00:00',
      estimated_delivery: '2024-12-04T14:00:00',
      weight: '0.8 kg',
      service: 'DHL Paket'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered':
        return 'Zugestellt';
      case 'in_transit':
        return 'Unterwegs';
      case 'pending':
        return 'Ausstehend';
      case 'failed':
        return 'Fehlgeschlagen';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_transit':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'overview', label: 'Übersicht', icon: TrendingUp },
          { id: 'tracking', label: 'Sendungsverfolgung', icon: Search },
          { id: 'create', label: 'Neue Sendung', icon: Plus },
          { id: 'history', label: 'Historie', icon: Clock },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📦 DHL Paketversand
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Verwalten Sie Ihre DHL-Sendungen und erstellen Sie neue Versandaufträge
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Package className={`h-5 w-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {shipments.length}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Gesamt Sendungen
          </p>
        </div>

        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {shipments.filter(s => s.status === 'in_transit').length}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Unterwegs
          </p>
        </div>

        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {shipments.filter(s => s.status === 'delivered').length}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Zugestellt
          </p>
        </div>

        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {shipments.filter(s => s.status === 'pending').length}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ausstehend
          </p>
          </div>
          </div>

          {/* Shipments Table */}
          <div className={`rounded-lg border border-gray-700 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
          <div className="overflow-x-auto">
            <table className="w-full font-mono">
              <thead>
                <tr className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sendungs-ID
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Empfänger
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Adresse
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gewicht
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Service
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zustellung
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className={`border-t border-gray-700 transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#2a2a2a]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.id}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.recipient}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.address}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(shipment.status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(shipment.status)}`}>
                          {getStatusLabel(shipment.status)}
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.weight}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.service}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shipment.status === 'delivered'
                        ? new Date(shipment.delivered).toLocaleDateString('de-DE')
                        : new Date(shipment.estimated_delivery).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="max-w-2xl mx-auto">
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Sendungsverfolgung
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Sendungsnummer eingeben..."
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all">
                <Search className="h-4 w-4" />
                Verfolgen
              </button>
            </div>
            <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Geben Sie Ihre DHL-Sendungsnummer ein, um den aktuellen Status Ihrer Sendung zu verfolgen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DHLShipping;
