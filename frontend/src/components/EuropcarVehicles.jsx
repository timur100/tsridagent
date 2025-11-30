import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Car, Edit, Trash2, Wrench, AlertTriangle, Fuel, Gauge, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarVehicles = () => {
  {
    id: 'v1',
    marke: 'BMW',
    modell: '3er',
    baujahr: 2023,
    vin: 'WBAXG51050CN12345',
    kennzeichen: 'B-EC 2023',
    status: 'available',
    kraftstoff: 'Diesel',
    getriebe: 'Automatik',
    kilometerstand: 12500,
    tankstand: 85,
    farbe: 'Schwarz',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v2',
    marke: 'Mercedes',
    modell: 'C-Klasse',
    baujahr: 2022,
    vin: 'WDD2050761F123456',
    kennzeichen: 'M-EC 5678',
    status: 'rented',
    kraftstoff: 'Benzin',
    getriebe: 'Automatik',
    kilometerstand: 28000,
    tankstand: 60,
    farbe: 'Silber',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v3',
    marke: 'Audi',
    modell: 'A4',
    baujahr: 2023,
    vin: 'WAUZZZ8V8KA123789',
    kennzeichen: 'F-EC 9012',
    status: 'available',
    kraftstoff: 'Diesel',
    getriebe: 'Automatik',
    kilometerstand: 8500,
    tankstand: 95,
    farbe: 'Blau',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v4',
    marke: 'VW',
    modell: 'Passat',
    baujahr: 2021,
    vin: 'WVWZZZ3CZMB123456',
    kennzeichen: 'HH-EC 3456',
    status: 'maintenance',
    kraftstoff: 'Diesel',
    getriebe: 'Manuell',
    kilometerstand: 45000,
    tankstand: 40,
    farbe: 'Grau',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v5',
    marke: 'BMW',
    modell: '5er',
    baujahr: 2022,
    vin: 'WBAXG71090CD98765',
    kennzeichen: 'B-EC 7890',
    status: 'rented',
    kraftstoff: 'Benzin',
    getriebe: 'Automatik',
    kilometerstand: 22000,
    tankstand: 70,
    farbe: 'Weiß',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v6',
    marke: 'Mercedes',
    modell: 'E-Klasse',
    baujahr: 2023,
    vin: 'WDD2130451A234567',
    kennzeichen: 'M-EC 1234',
    status: 'available',
    kraftstoff: 'Benzin',
    getriebe: 'Automatik',
    kilometerstand: 5000,
    tankstand: 100,
    farbe: 'Schwarz',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v7',
    marke: 'Audi',
    modell: 'A6',
    baujahr: 2021,
    vin: 'WAUZZZ4G2EN123456',
    kennzeichen: 'F-EC 5678',
    status: 'damaged',
    kraftstoff: 'Diesel',
    getriebe: 'Automatik',
    kilometerstand: 38000,
    tankstand: 55,
    farbe: 'Grau',
    sitzplaetze: 5,
    schaeden: [
      { typ: 'Kratzer', beschreibung: 'Kratzer an der Tür rechts' }
    ]
  },
  {
    id: 'v8',
    marke: 'VW',
    modell: 'Golf',
    baujahr: 2023,
    vin: 'WVWZZZ1KZEW123456',
    kennzeichen: 'HH-EC 9012',
    status: 'reserved',
    kraftstoff: 'Benzin',
    getriebe: 'Manuell',
    kilometerstand: 2000,
    tankstand: 90,
    farbe: 'Rot',
    sitzplaetze: 5,
    schaeden: []
  },
  {
    id: 'v9',
    marke: 'BMW',
    modell: 'X5',
    baujahr: 2022,
    vin: 'WBAXG91060CN56789',
    kennzeichen: 'B-EC 3456',
    status: 'available',
    kraftstoff: 'Diesel',
    getriebe: 'Automatik',
    kilometerstand: 31000,
    tankstand: 75,
    farbe: 'Schwarz',
    sitzplaetze: 7,
    schaeden: []
  },
  {
    id: 'v10',
    marke: 'Mercedes',
    modell: 'GLC',
    baujahr: 2023,
    vin: 'WDD2530131F234567',
    kennzeichen: 'M-EC 7890',
    status: 'rented',
    kraftstoff: 'Benzin',
    getriebe: 'Automatik',
    kilometerstand: 15000,
    tankstand: 65,
    farbe: 'Blau',
    sitzplaetze: 5,
    schaeden: []
  }
];

const EuropcarVehicles = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    marke: '',
    modell: '',
    baujahr: new Date().getFullYear(),
    vin: '',
    kennzeichen: '',
    status: 'available',
    kraftstoff: 'Benzin',
    getriebe: 'Automatik',
    kilometerstand: 0,
    tankstand: 100,
    farbe: '',
    sitzplaetze: 5
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/europcar/vehicles/list');
      if (result.success) {
        setVehicles(result.data.vehicles || []);
      } else {
        toast.error('Fehler beim Laden der Fahrzeuge');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Fehler beim Laden der Fahrzeuge');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: 'Verfügbar', color: 'green' },
      rented: { label: 'Vermietet', color: 'blue' },
      maintenance: { label: 'Wartung', color: 'yellow' },
      damaged: { label: 'Beschädigt', color: 'red' },
      reserved: { label: 'Reserviert', color: 'purple' }
    };
    const config = statusConfig[status] || { label: status, color: 'gray' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.label}
      </span>
    );
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.marke?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modell?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.kennzeichen?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    rented: vehicles.filter(v => v.status === 'rented').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    damaged: vehicles.filter(v => v.status === 'damaged').length
  };

  const resetForm = () => {
    setFormData({
      marke: '',
      modell: '',
      baujahr: new Date().getFullYear(),
      vin: '',
      kennzeichen: '',
      status: 'available',
      kraftstoff: 'Benzin',
      getriebe: 'Automatik',
      kilometerstand: 0,
      tankstand: 100,
      farbe: '',
      sitzplaetze: 5
    });
  };

  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      marke: vehicle.marke,
      modell: vehicle.modell,
      baujahr: vehicle.baujahr,
      vin: vehicle.vin,
      kennzeichen: vehicle.kennzeichen,
      status: vehicle.status,
      kraftstoff: vehicle.kraftstoff,
      getriebe: vehicle.getriebe,
      kilometerstand: vehicle.kilometerstand,
      tankstand: vehicle.tankstand,
      farbe: vehicle.farbe || '',
      sitzplaetze: vehicle.sitzplaetze || 5
    });
    setShowEditModal(true);
  };

  const handleDelete = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteModal(true);
  };

  const validateForm = () => {
    if (!formData.marke || !formData.modell || !formData.kennzeichen) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return false;
    }
    if (formData.baujahr < 1900 || formData.baujahr > new Date().getFullYear() + 1) {
      toast.error('Ungültiges Baujahr');
      return false;
    }
    return true;
  };

  const saveVehicle = async () => {
    if (!validateForm()) return;

    try {
      if (showAddModal) {
        // Create new vehicle via API
        const result = await apiCall('/api/europcar/vehicles/create', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Fahrzeug erfolgreich hinzugefügt!');
          setShowAddModal(false);
          await loadVehicles(); // Reload list
        } else {
          toast.error(result.message || 'Fehler beim Hinzufügen');
        }
      } else if (showEditModal) {
        // Update vehicle via API
        const result = await apiCall(`/api/europcar/vehicles/${selectedVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Fahrzeug erfolgreich aktualisiert!');
          setShowEditModal(false);
          await loadVehicles(); // Reload list
        } else {
          toast.error(result.message || 'Fehler beim Aktualisieren');
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Fehler beim Speichern des Fahrzeugs');
    }
  };

  const confirmDelete = async () => {
    try {
      const result = await apiCall(`/api/europcar/vehicles/${selectedVehicle.id}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Fahrzeug erfolgreich gelöscht!');
        setShowDeleteModal(false);
        setSelectedVehicle(null);
        await loadVehicles(); // Reload list
      } else {
        toast.error(result.message || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Fehler beim Löschen des Fahrzeugs');
    }
  };

  const VehicleFormModal = ({ isEdit }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug hinzufügen'}
            </h3>
            <button
              onClick={() => {
                isEdit ? setShowEditModal(false) : setShowAddModal(false);
                resetForm();
              }}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Marke *
              </label>
              <input
                type="text"
                value={formData.marke}
                onChange={(e) => setFormData({...formData, marke: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="z.B. BMW"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Modell *
              </label>
              <input
                type="text"
                value={formData.modell}
                onChange={(e) => setFormData({...formData, modell: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="z.B. 3er"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Baujahr
              </label>
              <input
                type="number"
                value={formData.baujahr}
                onChange={(e) => setFormData({...formData, baujahr: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                min="2000"
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Kennzeichen *
              </label>
              <input
                type="text"
                value={formData.kennzeichen}
                onChange={(e) => setFormData({...formData, kennzeichen: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="z.B. B-EC 1234"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                VIN
              </label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({...formData, vin: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Fahrzeugidentnummer"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Farbe
              </label>
              <input
                type="text"
                value={formData.farbe}
                onChange={(e) => setFormData({...formData, farbe: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="z.B. Schwarz"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="available">Verfügbar</option>
                <option value="rented">Vermietet</option>
                <option value="maintenance">Wartung</option>
                <option value="damaged">Beschädigt</option>
                <option value="reserved">Reserviert</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Kraftstoff
              </label>
              <select
                value={formData.kraftstoff}
                onChange={(e) => setFormData({...formData, kraftstoff: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="Benzin">Benzin</option>
                <option value="Diesel">Diesel</option>
                <option value="Elektro">Elektro</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Getriebe
              </label>
              <select
                value={formData.getriebe}
                onChange={(e) => setFormData({...formData, getriebe: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="Automatik">Automatik</option>
                <option value="Manuell">Manuell</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Sitzplätze
              </label>
              <input
                type="number"
                value={formData.sitzplaetze}
                onChange={(e) => setFormData({...formData, sitzplaetze: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                min="2"
                max="9"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Kilometerstand
              </label>
              <input
                type="number"
                value={formData.kilometerstand}
                onChange={(e) => setFormData({...formData, kilometerstand: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                min="0"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Tankstand (%)
              </label>
              <input
                type="number"
                value={formData.tankstand}
                onChange={(e) => setFormData({...formData, tankstand: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={saveVehicle}
              className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              {isEdit ? 'Aktualisieren' : 'Hinzufügen'}
            </Button>
            <Button
              onClick={() => {
                isEdit ? setShowEditModal(false) : setShowAddModal(false);
                resetForm();
              }}
              variant="outline"
              className="flex-1"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="text-center">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Gesamt
            </p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.total}
            </p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-green-500/30`}>
          <div className="text-center">
            <p className={`text-sm text-green-600`}>Verfügbar</p>
            <p className={`text-2xl font-bold text-green-600`}>{stats.available}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-blue-500/30`}>
          <div className="text-center">
            <p className={`text-sm text-blue-600`}>Vermietet</p>
            <p className={`text-2xl font-bold text-blue-600`}>{stats.rented}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-yellow-500/30`}>
          <div className="text-center">
            <p className={`text-sm text-yellow-600`}>Wartung</p>
            <p className={`text-2xl font-bold text-yellow-600`}>{stats.maintenance}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-red-500/30`}>
          <div className="text-center">
            <p className={`text-sm text-red-600`}>Beschädigt</p>
            <p className={`text-2xl font-bold text-red-600`}>{stats.damaged}</p>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Marke, Modell oder Kennzeichen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          >
            <option value="all">Alle Status</option>
            <option value="available">Verfügbar</option>
            <option value="rented">Vermietet</option>
            <option value="maintenance">Wartung</option>
            <option value="damaged">Beschädigt</option>
            <option value="reserved">Reserviert</option>
          </select>
          <Button
            onClick={handleAdd}
            className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Fahrzeug hinzufügen
          </Button>
        </div>
      </Card>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Car className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Fahrzeuge gefunden
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ändern Sie Ihre Suchkriterien oder Filter
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className={`p-6 hover:shadow-lg transition-shadow ${
              theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {vehicle.marke} {vehicle.modell}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {vehicle.baujahr} • {vehicle.kennzeichen}
                  </p>
                </div>
                {getStatusBadge(vehicle.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {vehicle.kraftstoff} • {vehicle.getriebe}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {vehicle.kilometerstand?.toLocaleString()} km
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Tank: {vehicle.tankstand}%
                  </span>
                </div>
              </div>

              {vehicle.schaeden && vehicle.schaeden.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{vehicle.schaeden.length} Schaden/Schäden</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEdit(vehicle)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(vehicle)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && <VehicleFormModal isEdit={false} />}
      {showEditModal && <VehicleFormModal isEdit={true} />}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Fahrzeug löschen?
              </h3>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Möchten Sie wirklich das Fahrzeug <strong>{selectedVehicle.marke} {selectedVehicle.modell}</strong> ({selectedVehicle.kennzeichen}) löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Löschen
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedVehicle(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EuropcarVehicles;