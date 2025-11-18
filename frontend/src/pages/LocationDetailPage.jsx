import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import LocationModal from '../components/LocationModal';
import {
  ArrowLeft,
  MapPin,
  Edit2,
  Save,
  X,
  Trash2,
  Phone,
  Mail,
  User,
  Navigation,
  Circle,
  Building2,
  Server,
  Monitor,
  BarChart3,
  CheckCircle,
  HelpCircle,
  XCircle,
  Users,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mapping für Bundesländer-Abkürzungen zu vollen Namen
const STATE_NAMES = {
  'BB': 'Brandenburg',
  'BE': 'Berlin',
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'HB': 'Bremen',
  'HE': 'Hessen',
  'HH': 'Hamburg',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SH': 'Schleswig-Holstein',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'TH': 'Thüringen'
};

const LocationDetailPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [locationFormData, setLocationFormData] = useState(null);
  const [stats, setStats] = useState({
    scans: {
      total: 0,
      correct: 0,
      unknown: 0,
      failed: 0
    },
    users: 0,
    devices: {
      total: 0,
      online: 0,
      offline: 0
    },
    tickets: {
      open: 0
    }
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Hilfsfunktion um Bundesland-Namen zu bekommen
  const getStateName = (stateCode) => {
    return STATE_NAMES[stateCode] || stateCode;
  };

  useEffect(() => {
    fetchLocationDetails();
    fetchLocationStats();
  }, [locationId]);

  const fetchLocationStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Mock data for now - in production, these would be real API calls
      // You can replace these with actual API endpoints when available
      setStats({
        scans: {
          total: 1234,
          correct: 1180,
          unknown: 38,
          failed: 16
        },
        users: 12,
        devices: {
          total: 8,
          online: 6,
          offline: 2
        },
        tickets: {
          open: 3
        }
      });
    } catch (error) {
      console.error('Error fetching location stats:', error);
    }
  };

  const fetchLocationDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the new endpoint to get location by ID
      const response = await fetch(
        `${BACKEND_URL}/api/tenant-locations/by-id/${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.location) {
          setLocation(data.location);
          setLocationFormData(data.location);
        } else {
          toast.error('Standort nicht gefunden');
          navigate('/portal/admin');
        }
      } else if (response.status === 404) {
        toast.error('Standort nicht gefunden');
        navigate('/portal/admin');
      } else {
        toast.error('Fehler beim Laden des Standorts');
        navigate('/portal/admin');
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      toast.error('Fehler beim Laden des Standorts');
      navigate('/portal/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diesen Standort wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/tenant-locations/${location.tenant_id}/${location.location_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        toast.success('Standort erfolgreich gelöscht');
        navigate(`/portal/admin/tenants/${location.tenant_id}`);
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleLocationSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/tenant-locations/${location.tenant_id}/${location.location_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        toast.success('Standort erfolgreich aktualisiert');
        setShowEditModal(false);
        fetchLocationDetails();
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getStatusBadge = () => {
    if (!location) return null;
    const isOnline = location.id_checker !== null && location.id_checker !== undefined;
    return (
      <div className="flex items-center gap-2">
        <Circle 
          className={`w-3 h-3 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} 
        />
        <span className={`text-sm font-medium ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            Standort nicht gefunden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  // Navigate back to tenant's Standorte tab
                  if (location && location.tenant_id) {
                    // Store the tenant ID and tab preference in sessionStorage
                    sessionStorage.setItem('returnToTenant', location.tenant_id);
                    sessionStorage.setItem('returnToTab', 'locations');
                    // Navigate to the admin portal - it will pick up the session storage
                    navigate('/portal/admin');
                  } else {
                    navigate('/portal/admin');
                  }
                }}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'hover:bg-[#333] text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {location.location_code}
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {location.station_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-400'
                    : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                }`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Scans Insgesamt */}
          <Card className={`p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800 hover:bg-[#333333]' : 'bg-white border-gray-200 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Scans Insgesamt
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.scans.total.toLocaleString('de-DE')}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  diesen Monat
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <BarChart3 className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
          </Card>

          {/* Korrekte Scans */}
          <Card className={`p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800 hover:bg-[#333333]' : 'bg-white border-gray-200 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Korrekte Scans
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.scans.correct.toLocaleString('de-DE')}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} mt-1`}>
                  {((stats.scans.correct / stats.scans.total) * 100).toFixed(1)}% Erfolgsrate
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <CheckCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
          </Card>

          {/* Unbekannte Scans */}
          <Card className={`p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800 hover:bg-[#333333]' : 'bg-white border-gray-200 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Unbekannte Scans
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.scans.unknown.toLocaleString('de-DE')}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} mt-1`}>
                  {((stats.scans.unknown / stats.scans.total) * 100).toFixed(1)}% der Scans
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                <HelpCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
            </div>
          </Card>

          {/* Fehlgeschlagene Scans */}
          <Card className={`p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800 hover:bg-[#333333]' : 'bg-white border-gray-200 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fehlgeschlagene Scans
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.scans.failed.toLocaleString('de-DE')}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} mt-1`}>
                  {((stats.scans.failed / stats.scans.total) * 100).toFixed(1)}% der Scans
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <XCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              </div>
            </div>
          </Card>
        </div>

        {/* Second Row of Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Benutzer */}
          <Card className={`p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800 hover:bg-[#333333]' : 'bg-white border-gray-200 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Benutzer
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.users}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                <Users className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            </div>
          </Card>

          {/* Geräte */}
          <Card className={`p-5 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Geräte
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.devices.total}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                <Monitor className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
            </div>
          </Card>

          {/* Online (Aktive Geräte) */}
          <Card className={`p-5 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Online
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.devices.online}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  Aktive Geräte
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <Wifi className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
          </Card>

          {/* Offline (Inaktive Geräte) */}
          <Card className={`p-5 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Offline
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.devices.offline}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  Inaktive Geräte
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <WifiOff className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </div>
            </div>
          </Card>

          {/* Tickets offen */}
          <Card className={`p-5 ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tickets offen
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {stats.tickets.open}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                <AlertCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className={`rounded-xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Basisinformationen
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Location Code
                    </label>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.location_code}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Stationsname
                    </label>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.station_name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Main Typ
                    </label>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.main_type || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Anzahl ID Checker
                    </label>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.id_checker || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Address */}
            <Card className={`rounded-xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Adresse
                  </h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Straße
                    </label>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.street || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        PLZ
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.postal_code || '-'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Stadt
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.city || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Bundesland
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.state ? getStateName(location.state) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Land
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.country || '-'}
                      </p>
                    </div>
                  </div>
                  {location.continent && (
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Kontinent
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.continent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Technical Information */}
            <Card className={`rounded-xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Technische Informationen
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      SN-PC
                    </label>
                    <p className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.sn_pc || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      SN-SC
                    </label>
                    <p className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.sn_sc || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      TV-ID
                    </label>
                    <p className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.tv_id || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Switch
                    </label>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.switch_info || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Port
                    </label>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.port || '-'}
                    </p>
                  </div>
                </div>
                {location.it_comment && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      IT Kommentar
                    </label>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-1`}>
                      {location.it_comment}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Contact & GPS */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className={`rounded-xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Kontaktinformationen
                  </h2>
                </div>
                <div className="space-y-4">
                  {location.manager && (
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Manager
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.manager}
                      </p>
                    </div>
                  )}
                  {location.email && (
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        E-Mail
                      </label>
                      <a
                        href={`mailto:${location.email}`}
                        className={`text-sm flex items-center gap-2 hover:text-[#c00000] transition-colors ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        {location.email}
                      </a>
                    </div>
                  )}
                  {location.phone && (
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Telefon
                      </label>
                      <a
                        href={`tel:${location.phone}`}
                        className={`text-sm flex items-center gap-2 hover:text-[#c00000] transition-colors ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        {location.phone}
                      </a>
                    </div>
                  )}
                  {location.phone_internal && (
                    <div>
                      <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Telefon Intern
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.phone_internal}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* GPS Coordinates */}
            {(location.latitude || location.longitude) && (
              <Card className={`rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
              }`}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Navigation className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      GPS Koordinaten
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {location.latitude && (
                      <div>
                        <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Breitengrad
                        </label>
                        <p className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {location.latitude}
                        </p>
                      </div>
                    )}
                    {location.longitude && (
                      <div>
                        <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Längengrad
                        </label>
                        <p className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {location.longitude}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* TSR Remarks */}
            {location.tsr_remarks && (
              <Card className={`rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
              }`}>
                <div className="p-6">
                  <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    TSR Remarks
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {location.tsr_remarks}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && locationFormData && (
        <LocationModal
          theme={theme}
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleLocationSubmit}
          editingLocation={locationFormData}
          formData={locationFormData}
          setFormData={setLocationFormData}
        />
      )}
    </div>
  );
};

export default LocationDetailPage;
