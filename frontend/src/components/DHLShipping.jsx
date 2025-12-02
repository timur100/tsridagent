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
  
  // Modal state
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Tracking state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  
  // Create shipment state
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);
  const [formData, setFormData] = useState({
    // Sender
    senderName: 'TSR Technologies GmbH',
    senderStreet: '',
    senderHouseNumber: '',
    senderPostalCode: '',
    senderCity: '',
    senderEmail: '',
    senderPhone: '',
    // Receiver
    receiverName: '',
    receiverStreet: '',
    receiverHouseNumber: '',
    receiverPostalCode: '',
    receiverCity: '',
    receiverEmail: '',
    // Package
    weight: '',
    length: '',
    width: '',
    height: '',
    description: ''
  });

  // Format date with leading zeros
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Open modal with shipment details
  const openShipmentDetails = (shipment) => {
    setSelectedShipment(shipment);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShipment(null);
  };

  // Track shipment
  const trackShipment = async () => {
    if (!trackingNumber.trim()) {
      setTrackingError('Bitte geben Sie eine Sendungsnummer ein');
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError(null);
      setTrackingData(null);
      
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/dhl/shipments/${trackingNumber.trim()}/tracking`;
      console.log('[DHL] Tracking shipment:', trackingNumber, 'from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('[DHL] Tracking response:', data);
      
      if (data.success) {
        setTrackingData(data.tracking);
      } else {
        setTrackingError(data.message || 'Sendung nicht gefunden');
      }
    } catch (err) {
      console.error('[DHL] Error tracking shipment:', err);
      setTrackingError('Fehler bei der Sendungsverfolgung');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Create shipment
  const createShipment = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      'receiverName', 'receiverStreet', 'receiverHouseNumber', 
      'receiverPostalCode', 'receiverCity', 'receiverEmail',
      'senderStreet', 'senderHouseNumber', 'senderPostalCode', 
      'senderCity', 'senderEmail', 'senderPhone',
      'weight', 'length', 'width', 'height'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        setCreateError(`Bitte füllen Sie alle Pflichtfelder aus`);
        return;
      }
    }
    
    try {
      setCreateLoading(true);
      setCreateError(null);
      setCreateSuccess(null);
      
      const payload = {
        reference_id: `ORDER-${Date.now()}`,
        sender_name: formData.senderName,
        sender_phone: formData.senderPhone,
        sender_email: formData.senderEmail,
        sender_street: formData.senderStreet,
        sender_house_number: formData.senderHouseNumber,
        sender_postal_code: formData.senderPostalCode,
        sender_city: formData.senderCity,
        receiver_name: formData.receiverName,
        receiver_phone: formData.receiverEmail, // Use email as phone placeholder
        receiver_email: formData.receiverEmail,
        receiver_street: formData.receiverStreet,
        receiver_house_number: formData.receiverHouseNumber,
        receiver_postal_code: formData.receiverPostalCode,
        receiver_city: formData.receiverCity,
        receiver_country_code: 'DE',
        package_weight_grams: parseInt(formData.weight) * 1000,
        package_length_cm: parseInt(formData.length),
        package_width_cm: parseInt(formData.width),
        package_height_cm: parseInt(formData.height),
        package_description: formData.description || 'Paket'
      };
      
      console.log('[DHL] Creating shipment with payload:', payload);
      
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/dhl/shipments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log('[DHL] Create shipment response:', data);
      
      if (data.success) {
        setCreateSuccess({
          shipmentNumber: data.shipment_number,
          trackingUrl: data.tracking_url,
          labelUrl: data.label_url
        });
        
        // Reset form
        setFormData({
          ...formData,
          receiverName: '',
          receiverStreet: '',
          receiverHouseNumber: '',
          receiverPostalCode: '',
          receiverCity: '',
          receiverEmail: '',
          weight: '',
          length: '',
          width: '',
          height: '',
          description: ''
        });
        
        // Refresh shipments list
        fetchShipments();
        fetchStatistics();
      } else {
        setCreateError(data.message || 'Fehler beim Erstellen der Sendung');
      }
    } catch (err) {
      console.error('[DHL] Error creating shipment:', err);
      setCreateError('Verbindungsfehler zum Server');
    } finally {
      setCreateLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
      case 'imported':
        return 'bg-purple-100 text-purple-800';
      case 'created':
        return 'bg-cyan-100 text-cyan-800';
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
      case 'created':
        return 'Erstellt';
      case 'failed':
        return 'Fehlgeschlagen';
      case 'imported':
        return 'Importiert';
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
            <FileText className="h-5 w-5 text-purple-600" />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {statistics.imported || 0}
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Importiert
          </p>
        </div>

        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {statistics.pending || 0}
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
                    Straße & Nr.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    PLZ & Ort
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Versand
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Zustellung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Gewicht
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                    Maße (LxBxH)
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center">
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
                    <td colSpan="9" className="px-4 py-8 text-center">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Keine Sendungen vorhanden
                      </span>
                    </td>
                  </tr>
                ) : (
                  shipments.map((shipment) => (
                  <tr
                    key={shipment.shipment_number || shipment.reference_id}
                    onClick={() => openShipmentDetails(shipment)}
                    className="border-t border-gray-700 hover:bg-[#2a2a2a] transition-colors duration-150 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.shipment_number || shipment.reference_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.receiver_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.receiver_street && shipment.receiver_house_number 
                        ? `${shipment.receiver_street} ${shipment.receiver_house_number}`
                        : shipment.receiver_street || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.receiver_postal_code} {shipment.receiver_city}
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
                      {formatDate(shipment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(shipment.delivered_at || shipment.estimated_delivery)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {(shipment.package_weight_grams / 1000).toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {shipment.package_length_cm && shipment.package_width_cm && shipment.package_height_cm
                        ? `${shipment.package_length_cm}×${shipment.package_width_cm}×${shipment.package_height_cm}`
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

      {/* Shipment Details Modal - Outside of tabs for global access */}
      {isModalOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={closeModal}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"></div>

            {/* Modal panel */}
            <div 
              className="relative inline-block align-bottom bg-[#1f1f1f] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#2a2a2a] px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
                    <Package className="h-6 w-6 text-[#c00000]" />
                    Sendungsdetails
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {/* Sendungsnummer & Status */}
                <div className="mb-6 pb-6 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Sendungsnummer</p>
                      <p className="text-2xl font-mono font-bold text-white">
                        {selectedShipment.shipment_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedShipment.status)}
                      <span className={`px-4 py-2 rounded text-sm font-medium ${getStatusColor(selectedShipment.status)}`}>
                        {getStatusLabel(selectedShipment.status)}
                      </span>
                    </div>
                  </div>
                  {selectedShipment.tracking_url && (
                    <a
                      href={selectedShipment.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#c00000] hover:text-[#a00000] transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Sendung verfolgen</span>
                    </a>
                  )}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Absender */}
                  <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-[#c00000]" />
                      Absender
                    </h4>
                    <div className="space-y-3 font-mono text-sm">
                      <div>
                        <p className="text-gray-400">Name</p>
                        <p className="text-gray-200">{selectedShipment.sender_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Adresse</p>
                        <p className="text-gray-200">
                          {selectedShipment.sender_street && selectedShipment.sender_house_number
                            ? `${selectedShipment.sender_street} ${selectedShipment.sender_house_number}`
                            : selectedShipment.sender_street || '-'}
                        </p>
                        <p className="text-gray-200">
                          {selectedShipment.sender_postal_code} {selectedShipment.sender_city}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Empfänger */}
                  <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#c00000]" />
                      Empfänger
                    </h4>
                    <div className="space-y-3 font-mono text-sm">
                      <div>
                        <p className="text-gray-400">Name</p>
                        <p className="text-gray-200">{selectedShipment.receiver_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Adresse</p>
                        <p className="text-gray-200">
                          {selectedShipment.receiver_street && selectedShipment.receiver_house_number
                            ? `${selectedShipment.receiver_street} ${selectedShipment.receiver_house_number}`
                            : selectedShipment.receiver_street || '-'}
                        </p>
                        <p className="text-gray-200">
                          {selectedShipment.receiver_postal_code} {selectedShipment.receiver_city}
                        </p>
                        <p className="text-gray-200">{selectedShipment.receiver_country || 'DEU'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paket Details */}
                <div className="mt-6 bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#c00000]" />
                    Paketinformationen
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
                    <div>
                      <p className="text-gray-400">Gewicht</p>
                      <p className="text-gray-200 text-lg font-bold">
                        {(selectedShipment.package_weight_grams / 1000).toFixed(1)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Maße (LxBxH)</p>
                      <p className="text-gray-200 text-lg font-bold">
                        {selectedShipment.package_length_cm && selectedShipment.package_width_cm && selectedShipment.package_height_cm
                          ? `${selectedShipment.package_length_cm}×${selectedShipment.package_width_cm}×${selectedShipment.package_height_cm} cm`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Service</p>
                      <p className="text-gray-200 text-lg">
                        {selectedShipment.service_type === 'V01PAK' ? 'DHL Paket' : selectedShipment.service_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Referenz-ID</p>
                      <p className="text-gray-200 text-lg">
                        {selectedShipment.reference_id || '-'}
                      </p>
                    </div>
                  </div>
                  {selectedShipment.package_description && (
                    <div className="mt-4">
                      <p className="text-gray-400 text-sm">Beschreibung</p>
                      <p className="text-gray-200">{selectedShipment.package_description}</p>
                    </div>
                  )}
                </div>

                {/* Zeitangaben */}
                <div className="mt-6 bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#c00000]" />
                    Zeitangaben
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
                    <div>
                      <p className="text-gray-400">Erstellt am</p>
                      <p className="text-gray-200 text-lg">
                        {formatDate(selectedShipment.created_at)}
                      </p>
                    </div>
                    {selectedShipment.delivered_at && (
                      <div>
                        <p className="text-gray-400">Zugestellt am</p>
                        <p className="text-gray-200 text-lg text-green-400">
                          {formatDate(selectedShipment.delivered_at)}
                        </p>
                      </div>
                    )}
                    {!selectedShipment.delivered_at && selectedShipment.estimated_delivery && (
                      <div>
                        <p className="text-gray-400">Voraussichtliche Zustellung</p>
                        <p className="text-gray-200 text-lg">
                          {formatDate(selectedShipment.estimated_delivery)}
                        </p>
                      </div>
                    )}
                    {selectedShipment.imported_at && (
                      <div>
                        <p className="text-gray-400">Importiert am</p>
                        <p className="text-gray-200 text-lg">
                          {formatDate(selectedShipment.imported_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#2a2a2a] px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Schließen
                </button>
                {selectedShipment.tracking_url && (
                  <a
                    href={selectedShipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#c00000] hover:bg-[#a00000] text-white rounded transition-colors inline-flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Tracking öffnen
                  </a>
                )}
              </div>
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

          {/* Search Input */}
          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-2xl mx-auto">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Sendungsnummer
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="z.B. 00340434161094015902"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && trackShipment()}
                  disabled={trackingLoading}
                  className={`flex-1 px-4 py-3 rounded-lg border font-mono ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000] disabled:opacity-50`}
                />
                <button 
                  onClick={trackShipment}
                  disabled={trackingLoading || !trackingNumber.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trackingLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {trackingLoading ? 'Lädt...' : 'Verfolgen'}
                </button>
              </div>
              <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                💡 Geben Sie Ihre DHL-Sendungsnummer ein, um den aktuellen Status zu verfolgen
              </p>
            </div>
          </div>

          {/* Error Message */}
          {trackingError && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {trackingError}
                </p>
              </div>
            </div>
          )}

          {/* Tracking Results */}
          {trackingData && (
            <div className="mt-6 space-y-4">
              {/* Shipment Overview */}
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sendungsnummer
                    </p>
                    <p className={`text-2xl font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {trackingData.shipment_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(trackingData.status)}
                    <span className={`px-4 py-2 rounded text-sm font-medium ${getStatusColor(trackingData.status)}`}>
                      {getStatusLabel(trackingData.status)}
                    </span>
                  </div>
                </div>

                {trackingData.tracking_url && (
                  <a
                    href={trackingData.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#c00000] hover:text-[#a00000] transition-colors text-sm"
                  >
                    <MapPin className="h-4 w-4" />
                    DHL Tracking öffnen
                  </a>
                )}
              </div>

              {/* Sender & Receiver Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sender */}
                {trackingData.sender_name && (
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <User className="h-4 w-4 text-[#c00000]" />
                      Absender
                    </h4>
                    <div className={`space-y-1 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <p className="font-semibold">{trackingData.sender_name}</p>
                      {trackingData.sender_street && (
                        <p>{trackingData.sender_street} {trackingData.sender_house_number}</p>
                      )}
                      {trackingData.sender_city && (
                        <p>{trackingData.sender_postal_code} {trackingData.sender_city}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Receiver */}
                {trackingData.receiver_name && (
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <MapPin className="h-4 w-4 text-[#c00000]" />
                      Empfänger
                    </h4>
                    <div className={`space-y-1 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <p className="font-semibold">{trackingData.receiver_name}</p>
                      {trackingData.receiver_street && (
                        <p>{trackingData.receiver_street} {trackingData.receiver_house_number}</p>
                      )}
                      {trackingData.receiver_city && (
                        <p>{trackingData.receiver_postal_code} {trackingData.receiver_city}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Package Info */}
              {trackingData.package_weight_grams && (
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Package className="h-4 w-4 text-[#c00000]" />
                    Paketinformationen
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gewicht</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {(trackingData.package_weight_grams / 1000).toFixed(1)} kg
                      </p>
                    </div>
                    {trackingData.package_length_cm && (
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Maße (LxBxH)</p>
                        <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {trackingData.package_length_cm}×{trackingData.package_width_cm}×{trackingData.package_height_cm} cm
                        </p>
                      </div>
                    )}
                    {trackingData.service_type && (
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Service</p>
                        <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {trackingData.service_type === 'V01PAK' ? 'DHL Paket' : trackingData.service_type}
                        </p>
                      </div>
                    )}
                    {trackingData.reference_id && (
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Referenz</p>
                        <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {trackingData.reference_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Calendar className="h-4 w-4 text-[#c00000]" />
                  Zeitangaben
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
                  {trackingData.created_at && (
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Erstellt</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(trackingData.created_at)}
                      </p>
                    </div>
                  )}
                  {trackingData.delivered_at && (
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zugestellt</p>
                      <p className="font-bold text-green-500">
                        {formatDate(trackingData.delivered_at)}
                      </p>
                    </div>
                  )}
                  {!trackingData.delivered_at && trackingData.estimated_delivery && (
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Voraussichtlich</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(trackingData.estimated_delivery)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No Results Yet */}
          {!trackingData && !trackingError && !trackingLoading && (
            <div className={`mt-6 p-12 text-center rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
              <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Geben Sie eine Sendungsnummer ein, um die Verfolgung zu starten
              </p>
            </div>
          )}
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

          {/* Success Message */}
          {createSuccess && (
            <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-500'}`}>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
                    Sendung erfolgreich erstellt!
                  </p>
                  <p className={`text-sm mt-1 font-mono ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                    Sendungsnummer: {createSuccess.shipmentNumber}
                  </p>
                  {createSuccess.trackingUrl && (
                    <a
                      href={createSuccess.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600 mt-2 inline-block"
                    >
                      → Sendung verfolgen
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setCreateSuccess(null)}
                  className={`text-gray-400 hover:text-gray-600`}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {createError && (
            <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                    Fehler beim Erstellen der Sendung
                  </p>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                    {createError}
                  </p>
                </div>
                <button
                  onClick={() => setCreateError(null)}
                  className={`text-gray-400 hover:text-gray-600`}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={createShipment} className="space-y-6">
            {/* Sender Information */}
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <User className="h-5 w-5 text-[#c00000]" />
                Absender
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Firmenname *
                  </label>
                  <input
                    type="text"
                    name="senderName"
                    value={formData.senderName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Straße *
                  </label>
                  <input
                    type="text"
                    name="senderStreet"
                    value={formData.senderStreet}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. Musterstraße"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hausnummer *
                  </label>
                  <input
                    type="text"
                    name="senderHouseNumber"
                    value={formData.senderHouseNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. 123"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    PLZ *
                  </label>
                  <input
                    type="text"
                    name="senderPostalCode"
                    value={formData.senderPostalCode}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. 10115"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Stadt *
                  </label>
                  <input
                    type="text"
                    name="senderCity"
                    value={formData.senderCity}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. Berlin"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    name="senderEmail"
                    value={formData.senderEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="info@example.com"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    name="senderPhone"
                    value={formData.senderPhone}
                    onChange={handleInputChange}
                    required
                    placeholder="+49 30 12345678"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
              </div>
            </div>

            {/* Receiver Information */}
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <MapPin className="h-5 w-5 text-[#c00000]" />
                Empfänger
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="receiverName"
                    value={formData.receiverName}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. Max Mustermann"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Straße *
                  </label>
                  <input
                    type="text"
                    name="receiverStreet"
                    value={formData.receiverStreet}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. Hauptstraße"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hausnummer *
                  </label>
                  <input
                    type="text"
                    name="receiverHouseNumber"
                    value={formData.receiverHouseNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. 45"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    PLZ *
                  </label>
                  <input
                    type="text"
                    name="receiverPostalCode"
                    value={formData.receiverPostalCode}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. 80331"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Stadt *
                  </label>
                  <input
                    type="text"
                    name="receiverCity"
                    value={formData.receiverCity}
                    onChange={handleInputChange}
                    required
                    placeholder="z.B. München"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    name="receiverEmail"
                    value={formData.receiverEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="empfaenger@example.com"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
              </div>
            </div>

            {/* Package Information */}
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Package className="h-5 w-5 text-[#c00000]" />
                Paketinformationen
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gewicht (kg) *
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    required
                    min="0.1"
                    step="0.1"
                    placeholder="z.B. 2.5"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Länge (cm) *
                  </label>
                  <input
                    type="number"
                    name="length"
                    value={formData.length}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="z.B. 30"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Breite (cm) *
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="z.B. 20"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Höhe (cm) *
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="z.B. 15"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
                
                <div className="md:col-span-4">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Beschreibung (optional)
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="z.B. Elektronikkomponenten"
                    className={`w-full px-4 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } transition-colors`}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-6 py-3 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Erstelle Sendung...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Sendung erstellen
                  </>
                )}
              </button>
            </div>
          </form>
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
