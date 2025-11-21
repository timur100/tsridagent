import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/card';
import {
  ArrowLeft,
  MapPin,
  Wifi,
  WifiOff,
  Server,
  Edit2,
  Save,
  X,
  Clock,
  Map as MapIcon,
  Phone,
  Mail,
  User,
  Calendar,
  Monitor,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const LocationDetailPage = () => {
  const { theme } = useTheme();
  const { locationId, tenantId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({
    total_devices: 0,
    employees: 0,
    online_devices: 0,
    offline_devices: 0,
    in_preparation: 0,
    open_tickets: 0,
    total_scans: 0,
    correct_scans: 0,
    unknown_scans: 0,
    failed_scans: 0
  });
  const [openingHours, setOpeningHours] = useState(null);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editedHours, setEditedHours] = useState(null);
  
  // General editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [saving, setSaving] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  // WebSocket integration for real-time updates
  // Handle opening hours updates from WebSocket (from other admin users)
  const handleOpeningHoursUpdate = useCallback((data) => {
    console.log('[AdminLocationDetail] WebSocket opening hours update:', data);
    if (data.location_id === locationId && !isEditingHours) {
      // Only update if not currently editing (avoid conflicts)
      setOpeningHours(data.opening_hours);
      setEditedHours(data.opening_hours);
      toast.success('Öffnungszeiten wurden von einem anderen Admin aktualisiert', {
        duration: 3000,
        icon: '🔄'
      });
    }
  }, [locationId, isEditingHours]);
  
  // Handle location updates from WebSocket
  const handleLocationUpdate = useCallback((data) => {
    console.log('[AdminLocationDetail] WebSocket location update:', data);
    if (data.location_id === locationId) {
      // Refresh location data
      fetchLocationDetails();
      toast.success('Standort wurde aktualisiert', {
        duration: 3000,
        icon: '🔄'
      });
    }
  }, [locationId]);
  
  // Connect to WebSocket for real-time updates
  useWebSocket(tenantId, token, {
    autoConnect: true,
    onOpeningHoursUpdate: handleOpeningHoursUpdate,
    onLocationUpdate: handleLocationUpdate
  });

  const days = [
    { key: 'monday', label: 'Montag' },
    { key: 'tuesday', label: 'Dienstag' },
    { key: 'wednesday', label: 'Mittwoch' },
    { key: 'thursday', label: 'Donnerstag' },
    { key: 'friday', label: 'Freitag' },
    { key: 'saturday', label: 'Samstag' },
    { key: 'sunday', label: 'Sonntag' }
  ];

  useEffect(() => {
    if (locationId) {
      fetchLocationDetails();
    }
  }, [locationId]);

  const fetchLocationDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-locations/details/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setLocationData(data.location);
        setDevices(data.devices || []);
        setStats(data.stats || { 
          total_devices: 0, 
          employees: 0,
          online_devices: 0, 
          offline_devices: 0,
          in_preparation: 0,
          open_tickets: 0,
          total_scans: 0,
          correct_scans: 0,
          unknown_scans: 0,
          failed_scans: 0
        });
        setOpeningHours(data.opening_hours);
        
        if (data.opening_hours) {
          setEditedHours(data.opening_hours);
        } else {
          const defaultHours = {};
          days.forEach(day => {
            defaultHours[day.key] = {
              day: day.label,
              is_open: true,
              open_time: '08:00',
              close_time: '18:00',
              is_24h: false
            };
          });
          setEditedHours({
            ...defaultHours,
            manual_override: false
          });
        }
      } else {
        toast.error('Fehler beim Laden der Standortdetails');
        navigate(-1);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      toast.error('Fehler beim Laden der Standortdetails');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpeningHours = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/tenant-locations/details/${locationId}/opening-hours`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editedHours)
        }
      );

      if (response.ok) {
        toast.success('Öffnungszeiten erfolgreich gespeichert');
        setOpeningHours(editedHours);
        setIsEditingHours(false);
        fetchLocationDetails();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern der Öffnungszeiten');
    } finally {
      setSaving(false);
    }
  };

  const handleDayChange = (dayKey, field, value) => {
    setEditedHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
      }
    }));
  };

  const handleTeamViewerConnect = (teamviewerId) => {
    if (teamviewerId && teamviewerId !== '-') {
      window.open(`teamviewer10://control?device=${teamviewerId}`, '_blank');
    } else {
      toast.error('Keine TeamViewer ID verfügbar');
    }
  };

  // General editing handlers
  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({ ...locationData });
  };

  const handleSave = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(
        `${BACKEND_URL}/api/tenant-locations/${locationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editedData)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocationData(data.location || editedData);
        setIsEditing(false);
        toast.success('Standort erfolgreich aktualisiert');
        fetchLocationDetails();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern des Standorts');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBack = () => {
    // Navigate back to AdminPortal with TenantDetailPage embedded, Standorte tab active
    navigate('/portal/admin', { 
      state: { 
        activeTab: 'tenants',
        selectedTenantId: tenantId || locationData?.tenant_id,
        tenantInitialTab: 'locations'
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  if (!locationData) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
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
                {locationData.station_name}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {locationData.location_code}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards - 10 Kacheln */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Geräte */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Server className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Geräte
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.total_devices}
              </p>
            </div>
          </Card>

          {/* Mitarbeiter */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <User className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Mitarbeiter
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.employees}
              </p>
            </div>
          </Card>

          {/* Online */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Wifi className="h-8 w-8 mb-2 text-green-500" />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Online
              </p>
              <p className="text-2xl font-bold text-green-500">
                {stats.online_devices}
              </p>
            </div>
          </Card>

          {/* Offline */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <WifiOff className="h-8 w-8 mb-2 text-red-500" />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Offline
              </p>
              <p className="text-2xl font-bold text-red-500">
                {stats.offline_devices}
              </p>
            </div>
          </Card>

          {/* In Vorbereitung */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Clock className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                In Vorbereitung
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`}>
                {stats.in_preparation}
              </p>
            </div>
          </Card>

          {/* Tickets Offen */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Calendar className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Tickets Offen
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`}>
                {stats.open_tickets}
              </p>
            </div>
          </Card>

          {/* Scans Insgesamt */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Server className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-500'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Scans Insgesamt
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.total_scans}
              </p>
            </div>
          </Card>

          {/* Korrekte Scans */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <Wifi className="h-8 w-8 mb-2 text-green-500" />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Korrekte Scans
              </p>
              <p className="text-2xl font-bold text-green-500">
                {stats.correct_scans}
              </p>
            </div>
          </Card>

          {/* Unbekannte Scans */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <MapPin className={`h-8 w-8 mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Unbekannte Scans
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`}>
                {stats.unknown_scans}
              </p>
            </div>
          </Card>

          {/* Fehlgeschlagene Scans */}
          <Card className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex flex-col items-center text-center">
              <X className="h-8 w-8 mb-2 text-red-500" />
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fehlgeschlagene Scans
              </p>
              <p className="text-2xl font-bold text-red-500">
                {stats.failed_scans}
              </p>
            </div>
          </Card>
        </div>

        {/* Öffnungszeiten und Karte in einer Reihe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Öffnungszeiten */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Öffnungszeiten
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isEditingHours && (
                  <button
                    onClick={() => {
                      setIsEditingHours(false);
                      setEditedHours(openingHours);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'border border-gray-600 text-gray-400 hover:bg-gray-800'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    Abbrechen
                  </button>
                )}
                <button
                  onClick={isEditingHours ? handleSaveOpeningHours : () => setIsEditingHours(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all ${
                    isEditingHours
                      ? 'bg-[#c00000] text-white hover:bg-[#a00000]'
                      : theme === 'dark'
                      ? 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
                      : 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
                  }`}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Speichern...
                    </>
                  ) : isEditingHours ? (
                    <>
                      <Save className="w-3 h-3" />
                      Speichern
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3 h-3" />
                      Bearbeiten
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className={`mb-3 p-3 rounded-lg text-xs ${
              theme === 'dark' ? 'bg-blue-900/20 border border-blue-800 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              <strong>Hinweis:</strong> Google Places API Integration vorbereitet. API-Schlüssel wird später hinzugefügt.
            </div>

            <div className="space-y-2">
              {days.map(day => {
                const dayData = editedHours?.[day.key] || {
                  day: day.label,
                  is_open: true,
                  open_time: '08:00',
                  close_time: '18:00',
                  is_24h: false
                };

                return (
                  <div
                    key={day.key}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                    }`}
                  >
                    <div className="w-24">
                      <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {day.label}
                      </p>
                    </div>

                    {isEditingHours ? (
                      <>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={dayData.is_open}
                            onChange={(e) => handleDayChange(day.key, 'is_open', e.target.checked)}
                            className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                          />
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Geöffnet
                          </span>
                        </label>

                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={dayData.is_24h}
                            onChange={(e) => handleDayChange(day.key, 'is_24h', e.target.checked)}
                            disabled={!dayData.is_open}
                            className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                          />
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            24h
                          </span>
                        </label>

                        {dayData.is_open && !dayData.is_24h && (
                          <>
                            <input
                              type="time"
                              value={dayData.open_time || ''}
                              onChange={(e) => handleDayChange(day.key, 'open_time', e.target.value)}
                              className={`px-2 py-1 text-sm rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-[#2a2a2a] border-gray-700 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                            />
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>bis</span>
                            <input
                              type="time"
                              value={dayData.close_time || ''}
                              onChange={(e) => handleDayChange(day.key, 'close_time', e.target.value)}
                              className={`px-2 py-1 text-sm rounded-lg border ${
                                theme === 'dark'
                                  ? 'bg-[#2a2a2a] border-gray-700 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <div className={`flex-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {dayData.is_open ? (
                          dayData.is_24h ? (
                            <span className="font-medium text-green-500">24 Stunden geöffnet</span>
                          ) : (
                            <span>
                              {dayData.open_time} - {dayData.close_time} Uhr
                            </span>
                          )
                        ) : (
                          <span className="text-red-500">Geschlossen</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Google Maps */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <MapIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Standort auf Karte
              </h3>
            </div>

            <div className={`relative w-full h-[400px] rounded-lg overflow-hidden ${
              theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-100'
            }`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <MapIcon className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Google Maps Integration vorbereitet
                  </p>
                  <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    API-Schlüssel wird später hinzugefügt
                  </p>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="font-semibold mb-1">Adresse:</p>
                    <p>{locationData.street}</p>
                    <p>{locationData.postal_code} {locationData.city}</p>
                    <p>{locationData.country || 'Deutschland'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Adressinformationen & Kontaktinformationen auf einer Zeile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Adressinformationen */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Adressinformationen
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Straße</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.street || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>PLZ</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.postal_code || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ort</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.city || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Bundesland</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.state || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Land</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.country || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Kontinent</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.continent || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Kontaktinformationen */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Phone className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kontaktinformationen
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manager</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.manager || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.phone || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon Intern</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.phone_internal || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>E-Mail</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.email || '-'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Technische Details & Hardware Details auf einer Zeile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technische Details */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Technische Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Main Typ</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.main_type || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>ID Checker</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.id_checker || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Switch</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.switch_info || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Port</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.port || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Hardware Details */}
          <Card className={`p-6 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Hardware Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>SN-PC</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.sn_pc || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>SN-SC</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.sn_sc || '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>TV-ID</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationData.tv_id || '-'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Kommentare & Bemerkungen */}
        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Edit2 className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kommentare & Bemerkungen
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>IT Kommentar</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} whitespace-pre-wrap`}>
                {locationData.it_comment || '-'}
              </p>
            </div>
            <div>
              <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>TSR Bemerkungen</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} whitespace-pre-wrap`}>
                {locationData.tsr_remarks || '-'}
              </p>
            </div>
          </div>
        </Card>

        {/* Zugewiesene Geräte - Detailliert */}
        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center gap-2 mb-6">
            <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Zugewiesene Geräte
            </h3>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
              theme === 'dark' ? 'bg-[#c00000] text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {devices.length}
            </span>
          </div>

          {devices.length === 0 ? (
            <div className="text-center py-12">
              <Server className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine Geräte an diesem Standort zugewiesen
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Gerätename
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Location Code
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SN-PC
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SN-SC
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      TeamViewer ID
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr
                      key={device.device_id || index}
                      className={`border-t ${
                        theme === 'dark' 
                          ? 'border-gray-700 hover:bg-[#333]' 
                          : 'border-gray-100 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <td className={`px-4 py-3 text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {device.device_name}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {device.locationcode}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {device.sn_pc}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {device.sn_sc}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {device.teamviewer_id}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          device.is_online
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {device.is_online ? (
                            <>
                              <Wifi className="w-3 h-3" />
                              Online
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3" />
                              Offline
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTeamViewerConnect(device.teamviewer_id)}
                          disabled={!device.teamviewer_id || device.teamviewer_id === '-'}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            device.teamviewer_id && device.teamviewer_id !== '-'
                              ? 'bg-[#0057b8] text-white hover:bg-[#004494]'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Connect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LocationDetailPage;
