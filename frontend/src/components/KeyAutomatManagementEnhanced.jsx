import React, { useState, useEffect } from 'react';
import { Key, Plus, Edit, Trash2, Lock, Unlock, User, Building, Clock, AlertCircle, CheckCircle, Search, Filter, Calendar, MapPin, RefreshCw, Car, Hotel, Briefcase, Globe, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const KeyAutomatManagementEnhanced = ({ theme }) => {
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('keys'); // keys, automats, locations, rentals, history
  const [keys, setKeys] = useState([]);
  const [automats, setAutomats] = useState([]);
  const [locations, setLocations] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [keyTypes, setKeyTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [showAutomatModal, setShowAutomatModal] = useState(false);
  const [editingAutomat, setEditingAutomat] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    loadKeyTypes();
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadKeys(),
      loadAutomats(),
      loadLocations(),
      loadRentals()
    ]);
  };

  const loadKeyTypes = async () => {
    try {
      const response = await apiCall('/api/key-automat/key-types/list', { method: 'GET' });
      if (response.success) {
        setKeyTypes(response.key_types || []);
      }
    } catch (error) {
      console.error('Error loading key types:', error);
    }
  };

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/key-automat/keys/list', { method: 'GET' });
      if (response.success) {
        setKeys(response.keys || []);
      }
    } catch (error) {
      console.error('Error loading keys:', error);
      toast.error('Fehler beim Laden der Schlüssel');
    } finally {
      setLoading(false);
    }
  };

  const loadAutomats = async () => {
    try {
      const response = await apiCall('/api/key-automat/automats/list', { method: 'GET' });
      if (response.success) {
        setAutomats(response.automats || []);
      }
    } catch (error) {
      console.error('Error loading automats:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiCall('/api/key-automat/locations/list', { method: 'GET' });
      if (response.success) {
        setLocations(response.locations || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadRentals = async () => {
    try {
      const response = await apiCall('/api/key-automat/rentals/active', { method: 'GET' });
      if (response.success) {
        setRentals(response.rentals || []);
      }
    } catch (error) {
      console.error('Error loading rentals:', error);
    }
  };

  const getKeyTypeIcon = (type) => {
    switch (type) {
      case 'car': return <Car className="h-4 w-4" />;
      case 'hotel': return <Hotel className="h-4 w-4" />;
      case 'office': return <Briefcase className="h-4 w-4" />;
      default: return <Key className="h-4 w-4" />;
    }
  };

  const getKeyTypeLabel = (type) => {
    const keyType = keyTypes.find(kt => kt.name === type);
    return keyType ? keyType.display_name : type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'rented': return 'text-yellow-500';
      case 'maintenance': return 'text-red-500';
      case 'reserved': return 'text-blue-500';
      case 'online': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Verfügbar';
      case 'rented': return 'Ausgeliehen';
      case 'maintenance': return 'Wartung';
      case 'reserved': return 'Reserviert';
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'active': return 'Aktiv';
      case 'returned': return 'Zurückgegeben';
      case 'overdue': return 'Überfällig';
      default: return status;
    }
  };

  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.key_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         key.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || key.status === statusFilter;
    const matchesType = typeFilter === 'all' || key.key_type === typeFilter;
    const matchesLocation = locationFilter === 'all' || key.location_id === locationFilter;
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Schlüsselautomat - Erweiterte Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Schlüssel, Automaten, Standorte und Ausleihvorgänge
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'keys'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Key className="h-4 w-4" />
          Schlüssel
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'locations'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Globe className="h-4 w-4" />
          Standorte
        </button>
        <button
          onClick={() => setActiveTab('automats')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'automats'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Lock className="h-4 w-4" />
          Automaten
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'rentals'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <User className="h-4 w-4" />
          Aktive Ausleihen
          {rentals.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[#c00000] text-white rounded-full">
              {rentals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          Verlauf
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <KeysTab
          theme={theme}
          keys={filteredKeys}
          locations={locations}
          automats={automats}
          keyTypes={keyTypes}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          onEdit={(key) => {
            setEditingKey(key);
            setShowKeyModal(true);
          }}
          onDelete={async (keyId) => {
            if (window.confirm('Schlüssel wirklich löschen?')) {
              try {
                await apiCall(`/api/key-automat/keys/delete/${keyId}`, { method: 'DELETE' });
                toast.success('Schlüssel gelöscht');
                loadKeys();
              } catch (error) {
                toast.error('Fehler beim Löschen');
              }
            }
          }}
          onCreate={() => {
            setEditingKey({
              key_number: '',
              key_type: 'office',
              description: '',
              location_id: '',
              automat_id: '',
              tenant_id: 'tenant-europcar',
              status: 'available'
            });
            setShowKeyModal(true);
          }}
          getKeyTypeIcon={getKeyTypeIcon}
          getKeyTypeLabel={getKeyTypeLabel}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <LocationsTab
          theme={theme}
          locations={locations}
          onEdit={(location) => {
            setEditingLocation(location);
            setShowLocationModal(true);
          }}
          onDelete={async (locationId) => {
            if (window.confirm('Standort wirklich löschen?')) {
              try {
                await apiCall(`/api/key-automat/locations/delete/${locationId}`, { method: 'DELETE' });
                toast.success('Standort gelöscht');
                loadLocations();
              } catch (error) {
                toast.error('Fehler beim Löschen');
              }
            }
          }}
          onCreate={() => {
            setEditingLocation({
              name: '',
              address: '',
              city: '',
              country: 'Deutschland',
              tenant_id: 'tenant-europcar'
            });
            setShowLocationModal(true);
          }}
        />
      )}

      {/* Automats Tab */}
      {activeTab === 'automats' && (
        <AutomatsTab
          theme={theme}
          automats={automats}
          locations={locations}
          onEdit={(automat) => {
            setEditingAutomat(automat);
            setShowAutomatModal(true);
          }}
          onDelete={async (automatId) => {
            if (window.confirm('Automat wirklich löschen?')) {
              try {
                await apiCall(`/api/key-automat/automats/delete/${automatId}`, { method: 'DELETE' });
                toast.success('Automat gelöscht');
                loadAutomats();
              } catch (error) {
                toast.error('Fehler beim Löschen');
              }
            }
          }}
          onCreate={() => {
            setEditingAutomat({
              name: '',
              location_id: '',
              kiosk_ids: [],
              tenant_id: 'tenant-europcar',
              status: 'offline',
              total_slots: 50,
              ip_address: ''
            });
            setShowAutomatModal(true);
          }}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <RentalsTab
          theme={theme}
          rentals={rentals}
          onReturn={async (rentalId) => {
            try {
              await apiCall(`/api/key-automat/rentals/return/${rentalId}`, { method: 'POST' });
              toast.success('Schlüssel zurückgegeben');
              loadRentals();
              loadKeys();
            } catch (error) {
              toast.error('Fehler bei Rückgabe');
            }
          }}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <HistoryTab theme={theme} />
      )}

      {/* Modals */}
      {showKeyModal && editingKey && (
        <KeyEditorModal
          theme={theme}
          keyData={editingKey}
          locations={locations}
          automats={automats}
          keyTypes={keyTypes}
          onSave={async (data) => {
            try {
              if (data.key_id) {
                await apiCall(`/api/key-automat/keys/update/${data.key_id}`, {
                  method: 'PUT',
                  body: data
                });
                toast.success('Schlüssel aktualisiert');
              } else {
                await apiCall('/api/key-automat/keys/create', {
                  method: 'POST',
                  body: data
                });
                toast.success('Schlüssel erstellt');
              }
              setShowKeyModal(false);
              setEditingKey(null);
              loadKeys();
            } catch (error) {
              toast.error('Fehler beim Speichern');
            }
          }}
          onClose={() => {
            setShowKeyModal(false);
            setEditingKey(null);
          }}
        />
      )}

      {showLocationModal && editingLocation && (
        <LocationEditorModal
          theme={theme}
          locationData={editingLocation}
          onSave={async (data) => {
            try {
              if (data.location_id) {
                await apiCall(`/api/key-automat/locations/update/${data.location_id}`, {
                  method: 'PUT',
                  body: data
                });
                toast.success('Standort aktualisiert');
              } else {
                await apiCall('/api/key-automat/locations/create', {
                  method: 'POST',
                  body: data
                });
                toast.success('Standort erstellt');
              }
              setShowLocationModal(false);
              setEditingLocation(null);
              loadLocations();
            } catch (error) {
              toast.error('Fehler beim Speichern');
            }
          }}
          onClose={() => {
            setShowLocationModal(false);
            setEditingLocation(null);
          }}
        />
      )}

      {showAutomatModal && editingAutomat && (
        <AutomatEditorModal
          theme={theme}
          automatData={editingAutomat}
          locations={locations}
          onSave={async (data) => {
            try {
              if (data.automat_id) {
                await apiCall(`/api/key-automat/automats/update/${data.automat_id}`, {
                  method: 'PUT',
                  body: data
                });
                toast.success('Automat aktualisiert');
              } else {
                await apiCall('/api/key-automat/automats/create', {
                  method: 'POST',
                  body: data
                });
                toast.success('Automat erstellt');
              }
              setShowAutomatModal(false);
              setEditingAutomat(null);
              loadAutomats();
            } catch (error) {
              toast.error('Fehler beim Speichern');
            }
          }}
          onClose={() => {
            setShowAutomatModal(false);
            setEditingAutomat(null);
          }}
        />
      )}
    </div>
  );
};

export default KeyAutomatManagementEnhanced;