import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Package, Truck, MapPin, User, Mail, Phone, Home, Calendar, Clock, CheckCircle, XCircle, Search, TrendingUp, Settings, Plus, FileText, RefreshCw } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const DHLShipping = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [shipments, setShipments] = useState([]);
  const [allShipments, setAllShipments] = useState([]); // All unfiltered shipments
  const [statistics, setStatistics] = useState({
    total: 0,
    created: 0,
    failed: 0,
    in_transit: 0,
    delivered: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Fetch shipments from backend
  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/dhl/shipments`;
      console.log('[DHL] Fetching shipments from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('[DHL] Received data:', data);
      console.log('[DHL] Shipments count:', data.shipments?.length);
      
      if (data.success) {
        setAllShipments(data.shipments || []);
        setShipments(data.shipments || []);
        console.log('[DHL] Shipments set to state:', data.shipments?.length);
      } else {
        setError('Fehler beim Laden der Sendungen');
        console.error('[DHL] API returned success:false');
      }
    } catch (err) {
      console.error('[DHL] Error fetching shipments:', err);
      setError('Verbindungsfehler zum Server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/dhl/shipments/stats/summary`;
      console.log('[DHL] Fetching statistics from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('[DHL] Statistics received:', data.statistics);
      
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error('[DHL] Error fetching statistics:', err);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchShipments();
    fetchStatistics();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchShipments();
      fetchStatistics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...allShipments];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(shipment => 
        shipment.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.receiver_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.reference_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }
    
    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.receiver_city === cityFilter);
    }
    
    setShipments(filtered);
  }, [searchTerm, statusFilter, cityFilter, allShipments]);

  // Get unique cities for filter
  const uniqueCities = [...new Set(allShipments.map(s => s.receiver_city).filter(Boolean))].sort();

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
          {/* Header with Refresh Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📦 DHL Paketversand
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Verwalten Sie Ihre DHL-Sendungen und erstellen Sie neue Versandaufträge
              </p>
            </div>
            <button
              onClick={() => { fetchShipments(); fetchStatistics(); }}
              disabled={loading}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                theme === 'dark' 
                  ? 'bg-[#c00000] hover:bg-[#a00000] text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } transition-colors disabled:opacity-50`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>

          {/* Search and Filters */}
          <div className={`mb-6 p-4 rounded-lg border border-gray-700 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Field */}
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Search className="inline h-4 w-4 mr-2" />
                  Suche
                </label>
                <input
                  type="text"
                  placeholder="Sendungsnummer, Empfänger, Stadt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 rounded border border-gray-700 font-mono ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-300 placeholder-gray-500'
                      : 'bg-white text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-4 py-2 rounded border border-gray-700 font-mono ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-300'
                      : 'bg-white text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                >
                  <option value="all">Alle Status</option>
                  <option value="delivered">Zugestellt</option>
                  <option value="in_transit">Unterwegs</option>
                  <option value="created">Erstellt</option>
                  <option value="imported">Importiert</option>
                  <option value="failed">Fehlgeschlagen</option>
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stadt
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={`w-full px-4 py-2 rounded border border-gray-700 font-mono ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-300'
                      : 'bg-white text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                >
                  <option value="all">Alle Städte</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || statusFilter !== 'all' || cityFilter !== 'all') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Aktive Filter:
                </span>
                {searchTerm && (
                  <span className="px-3 py-1 bg-[#c00000] text-white text-sm rounded-full flex items-center gap-2">
                    Suche: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-gray-200">
                      ×
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="px-3 py-1 bg-[#c00000] text-white text-sm rounded-full flex items-center gap-2">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-gray-200">
                      ×
                    </button>
                  </span>
                )}
                {cityFilter !== 'all' && (
                  <span className="px-3 py-1 bg-[#c00000] text-white text-sm rounded-full flex items-center gap-2">
                    Stadt: {cityFilter}
                    <button onClick={() => setCityFilter('all')} className="hover:text-gray-200">
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCityFilter('all');
                  }}
                  className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            )}

            {/* Results Count */}
            <div className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {shipments.length} von {allShipments.length} Sendungen
            </div>
          </div>

          {/* Info Banner */}
          {statistics.total > 0 && (
            <div className={`mb-4 p-4 rounded-lg border-l-4 ${
              theme === 'dark' 
                ? 'bg-green-900/20 border-green-500 text-green-200' 
                : 'bg-green-50 border-green-500 text-green-800'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold">{statistics.total} echte DHL-Sendungen importiert</p>
                  <p className="text-sm mt-1">
                    Ihre Sendungen aus diesem Jahr wurden erfolgreich importiert. 
                    Neue Sendungen werden automatisch gespeichert und hier angezeigt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Package className={`h-5 w-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {statistics.total}
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
              {statistics.in_transit}
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
              {statistics.delivered}
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
              {statistics.pending}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ausstehend
          </p>
          </div>
          </div>

          {/* Shipments Table */}
          <div className="rounded-lg border border-gray-700 bg-[#1f1f1f]">
          <div className="overflow-x-auto">
            <table className="w-full font-mono">
              <thead>
                <tr className="bg-[#1f1f1f] border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Sendungs-ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Empfänger
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Adresse
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Gewicht
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Zustellung
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          Lade Sendungen...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : shipments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Keine Sendungen vorhanden
                      </span>
                    </td>
                  </tr>
                ) : (
                  shipments.map((shipment) => (
                  <tr
                    key={shipment.shipment_number || shipment.reference_id}
                    className="border-t border-gray-700 hover:bg-[#2a2a2a] transition-colors duration-150 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.shipment_number || shipment.reference_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.receiver_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.receiver_city}, {shipment.receiver_postal_code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(shipment.status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(shipment.status)}`}>
                          {getStatusLabel(shipment.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {(shipment.package_weight_grams / 1000).toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.service_type === 'V01PAK' ? 'DHL Paket' : shipment.service_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.estimated_delivery
                        ? new Date(shipment.estimated_delivery).toLocaleDateString('de-DE')
                        : '-'}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Tab */}
      {activeTab === 'tracking' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Sendungsverfolgung
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Verfolgen Sie den Status Ihrer DHL-Sendungen in Echtzeit
            </p>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
            <div className="max-w-2xl mx-auto">
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
        </div>
      )}

      {/* Create Shipment Tab */}
      {activeTab === 'create' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Neue Sendung erstellen
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Erstellen Sie einen neuen DHL-Versandauftrag
            </p>
          </div>

          <div className={`p-8 text-center rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
            <div className="inline-block p-4 bg-blue-500 bg-opacity-10 rounded-full mb-4">
              <Plus className="h-16 w-16 text-blue-500" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              In Entwicklung
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Sendungserstellung wird implementiert
            </p>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Sendungshistorie
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Übersicht aller vergangenen Sendungen
            </p>
          </div>

          <div className="text-center p-12">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Historie - In Entwicklung</p>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              DHL Einstellungen
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Konfigurieren Sie Ihre DHL-Integration
            </p>
          </div>

          <div className="text-center p-12">
            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Einstellungen - In Entwicklung</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DHLShipping;
