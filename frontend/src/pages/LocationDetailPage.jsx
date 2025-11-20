import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
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
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const LocationDetailPage = () => {
  const { theme } = useTheme();
  const { locationId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0
  });
  const [openingHours, setOpeningHours] = useState(null);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editedHours, setEditedHours] = useState(null);
  const [saving, setSaving] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLocationData(data.location);
        setDevices(data.devices || []);
        setStats(data.stats || { total_devices: 0, online_devices: 0, offline_devices: 0 });
        setOpeningHours(data.opening_hours);
        
        // Initialize edited hours if opening hours exist
        if (data.opening_hours) {
          setEditedHours(data.opening_hours);
        } else {
          // Initialize with default structure
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
        `${BACKEND_URL}/api/tenant-locations/location-details/${locationId}/opening-hours`,
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

  const handleBack = () => {
    navigate(-1);
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`p-6 rounded-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Geräte Gesamt
                </p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.total_devices}
                </p>
              </div>
              <Server className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
            </div>
          </Card>

          <Card className={`p-6 rounded-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Online
                </p>
                <p className="text-3xl font-bold text-green-500">
                  {stats.online_devices}
                </p>
              </div>
              <Wifi className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className={`p-6 rounded-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Offline
                </p>
                <p className="text-3xl font-bold text-red-500">
                  {stats.offline_devices}
                </p>
              </div>
              <WifiOff className="h-12 w-12 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Opening Hours Section */}
        <Card className={`p-6 rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="flex items-center justify-between mb-6">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'border border-gray-600 text-gray-400 hover:bg-gray-800'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Abbrechen
                </button>
              )}
              <button
                onClick={isEditingHours ? handleSaveOpeningHours : () => setIsEditingHours(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Speichern...
                  </>
                ) : isEditingHours ? (
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
          </div>

          {/* Google Places API Notice */}
          <div className={`mb-4 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
              <strong>Hinweis:</strong> Google Places API Integration ist vorbereitet. 
              API-Schlüssel wird später hinzugefügt. Aktuell können Sie die Öffnungszeiten manuell pflegen.
            </p>
          </div>

          {/* Opening Hours Table */}
          <div className="space-y-3">
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
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-32">
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {day.label}
                    </p>
                  </div>

                  {isEditingHours ? (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dayData.is_open}
                          onChange={(e) => handleDayChange(day.key, 'is_open', e.target.checked)}
                          className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                        />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Geöffnet
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dayData.is_24h}
                          onChange={(e) => handleDayChange(day.key, 'is_24h', e.target.checked)}
                          disabled={!dayData.is_open}
                          className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                        />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          24h
                        </span>
                      </label>

                      {dayData.is_open && !dayData.is_24h && (
                        <>
                          <input
                            type="time"
                            value={dayData.open_time || ''}
                            onChange={(e) => handleDayChange(day.key, 'open_time', e.target.value)}
                            className={`px-3 py-2 rounded-lg border ${
                              theme === 'dark'
                                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                          />
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>bis</span>
                          <input
                            type="time"
                            value={dayData.close_time || ''}
                            onChange={(e) => handleDayChange(day.key, 'close_time', e.target.value)}
                            className={`px-3 py-2 rounded-lg border ${
                              theme === 'dark'
                                ? 'bg-[#2a2a2a] border-gray-700 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <div className={`flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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

        {/* Google Maps Section */}
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

          {/* Google Maps Placeholder */}
          <div className={`relative w-full h-96 rounded-lg overflow-hidden ${
            theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-100'
          }`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Google Maps Integration vorbereitet
                </p>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  API-Schlüssel wird später hinzugefügt
                </p>
                <div className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p><strong>Adresse:</strong></p>
                  <p>{locationData.street}</p>
                  <p>{locationData.postal_code} {locationData.city}</p>
                  <p>{locationData.country || 'Deutschland'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Assigned Devices Section */}
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
                      SN-PC
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SN-SC
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Status
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
                        {device.sn_pc}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {device.sn_sc}
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
