import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, Save, Monitor, HardDrive, Activity, MapPin, Video, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const DeviceDetailsModal = ({ device, onClose, onUpdate, onDelete }) => {
  const { theme } = useTheme();
  const { apiCall, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const toastShownRef = useRef(false); // Prevent duplicate toasts
  const [formData, setFormData] = useState({
    device_id: device.device_id || '',
    locationcode: device.locationcode || '',
    city: device.city || '',
    sn_pc: device.sn_pc || '',
    sn_sc: device.sn_sc || '',
    status: device.status || 'offline',
    hardware_model: device.hardware_model || '',
    customer: device.customer || '',
    last_activity: device.last_activity || '',
    tvid: device.tvid || ''
  });

  // Fetch location information and other devices at the same location
  useEffect(() => {
    const fetchLocationInfo = async () => {
      try {
        setLoadingLocation(true);
        const result = await apiCall(`/api/portal/europcar-devices/${device.device_id}/location-info`);
        
        if (result.success) {
          setLocationInfo(result.data);
        }
      } catch (error) {
        console.error('Error fetching location info:', error);
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchLocationInfo();
  }, [device.device_id, apiCall]);

  const handleConnectTeamViewer = () => {
    const tvid = formData.tvid || device.tvid;
    if (!tvid) {
      toast.error('Keine TeamViewer-ID verfügbar');
      return;
    }
    
    // TeamViewer Deep-Link
    const deepLink = `teamviewer10://control?device=${tvid}`;
    window.location.href = deepLink;
    toast.success('TeamViewer wird geöffnet...');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/europcar-devices/${device.device_id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        // Prevent duplicate toasts from StrictMode
        if (!toastShownRef.current) {
          toast.success('Gerät erfolgreich aktualisiert');
          toastShownRef.current = true;
          setTimeout(() => {
            toastShownRef.current = false;
          }, 1000);
        }
        
        setIsEditing(false);
        
        if (onUpdate) {
          onUpdate(result.data?.device || formData);
        }
      } else {
        toast.error(result.data?.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    
    // Get token and backend URL directly
    const token = localStorage.getItem('portal_token');
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
    
    if (!token) {
      toast.error('Nicht authentifiziert');
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Make DELETE request
      const response = await fetch(`${BACKEND_URL}/api/portal/europcar-devices/${device.device_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Read response IMMEDIATELY as text
      const responseText = await response.text();
      
      // Parse JSON manually
      let data = null;
      if (responseText && responseText.trim().length > 0) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }

      // Check success
      if (response.ok) {
        toast.success('Gerät erfolgreich gelöscht');
        setShowDeleteConfirm(false);
        if (onDelete) {
          onDelete(device.device_id);
        }
        onClose();
      } else {
        const errorMsg = data?.detail || data?.message || `Fehler ${response.status}`;
        toast.error(`Löschen fehlgeschlagen: ${errorMsg}`);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Delete error:', error);
      if (error.name === 'AbortError') {
        toast.error('Zeitüberschreitung beim Löschen');
      } else {
        toast.error(`Fehler: ${error.message}`);
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const InfoField = ({ label, value, name, isEditing, onChange, type = 'text', disabled = false }) => (
    <div>
      <label className={`block text-xs font-medium mb-1 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {label}
      </label>
      {isEditing && !disabled ? (
        type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="in_vorbereitung">In Vorbereitung</option>
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-red-500`}
          />
        )
      ) : (
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {value || '-'}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Geräte-Details
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {device.device_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete Button (Admin only) */}
              {isAdmin && !isEditing && (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </Button>
              )}
              
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Bearbeiten
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        device_id: device.device_id || '',
                        locationcode: device.locationcode || '',
                        city: device.city || '',
                        sn_pc: device.sn_pc || '',
                        sn_sc: device.sn_sc || '',
                        status: device.status || 'offline',
                        hardware_model: device.hardware_model || '',
                        customer: device.customer || '',
                        last_activity: device.last_activity || '',
                        tvid: device.tvid || ''
                      });
                    }}
                    className={`${
                      theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Speichern...' : 'Speichern'}
                  </Button>
                </>
              )}
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Status Badge with Connect Button */}
          <div className="mb-6 flex items-center gap-4">
            {/* Online Status Badge - Pill Shape with Green Dot */}
            <div className="relative inline-flex items-center">
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold ${
                formData.status === 'online' 
                  ? 'bg-[#1e5631] text-[#4ade80]'
                  : formData.status === 'offline'
                  ? 'bg-red-900/40 text-red-400'
                  : 'bg-yellow-900/40 text-yellow-400'
              }`}>
                {formData.status === 'online' && (
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ade80]"></span>
                  </span>
                )}
                {formData.status === 'online' ? 'Online' : formData.status === 'offline' ? 'Offline' : 'In Vorbereitung'}
              </span>
            </div>
            
            {/* Connect Button - Pill Shape Blue */}
            {formData.tvid && (
              <Button
                onClick={handleConnectTeamViewer}
                className="bg-[#1e90ff] hover:bg-[#1873cc] text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all"
              >
                <Video className="h-4 w-4" />
                Connect
              </Button>
            )}
          </div>

          {/* Device Information */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Monitor className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Geräteinformationen
                </h3>
              </div>
              <div className="space-y-3">
                <InfoField label="Device-ID" value={formData.device_id} name="device_id" isEditing={false} disabled={true} />
                <InfoField label="TeamViewer-ID" value={formData.tvid} name="tvid" isEditing={isEditing} onChange={handleChange} />
                <InfoField label="Locationcode" value={formData.locationcode} name="locationcode" isEditing={isEditing} onChange={handleChange} />
                <InfoField label="Stadt" value={formData.city} name="city" isEditing={isEditing} onChange={handleChange} />
                <InfoField label="Kunde" value={formData.customer} name="customer" isEditing={false} disabled={true} />
              </div>
            </div>

            {/* Hardware Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Hardware-Details
                </h3>
              </div>
              <div className="space-y-3">
                <InfoField label="SN-PC (Tablet/Computer)" value={formData.sn_pc} name="sn_pc" isEditing={isEditing} onChange={handleChange} />
                <InfoField label="SN-SC (Scanner)" value={formData.sn_sc} name="sn_sc" isEditing={isEditing} onChange={handleChange} />
                <InfoField label="Hardware-Modell" value={formData.hardware_model} name="hardware_model" isEditing={isEditing} onChange={handleChange} />
              </div>
            </div>

            {/* Status Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Status & Aktivität
                </h3>
              </div>
              <div className="space-y-3">
                <InfoField 
                  label="Status" 
                  value={formData.status} 
                  name="status" 
                  isEditing={isEditing} 
                  onChange={handleChange}
                  type="select"
                />
                <InfoField 
                  label="Letzte Aktivität" 
                  value={formData.last_activity ? new Date(formData.last_activity).toLocaleString('de-DE') : '-'} 
                  name="last_activity" 
                  isEditing={false}
                  disabled={true}
                />
              </div>
            </div>
          </div>

          {/* Assigned Location Section */}
          {loadingLocation ? (
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Lade Standortinformationen...
              </p>
            </div>
          ) : locationInfo && locationInfo.location ? (
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Zugewiesener Standort
                </h3>
              </div>
              
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="space-y-2 mb-4">
                  <p className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {locationInfo.location.stationsname || locationInfo.location.ort}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {locationInfo.location.str}, {locationInfo.location.plz} {locationInfo.location.ort}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Standortcode: {locationInfo.location.main_code}
                  </p>
                </div>

                <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Geräte an diesem Standort: <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{locationInfo.device_count}</span>
                  </p>
                </div>

                {locationInfo.devices && locationInfo.devices.length > 0 && (
                  <div className="mt-4">
                    <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Weitere Geräte an diesem Standort:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {locationInfo.devices.map((otherDevice) => (
                        <div
                          key={otherDevice.device_id}
                          className={`p-3 rounded-lg border ${
                            theme === 'dark' 
                              ? 'bg-[#2a2a2a] border-gray-700 hover:bg-[#333333]' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          } transition-colors`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {otherDevice.device_id}
                              </p>
                              {otherDevice.hardware_model && (
                                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {otherDevice.hardware_model}
                                </p>
                              )}
                              {otherDevice.tvid && (
                                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  TV-ID: {otherDevice.tvid}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Online Status Badge - Pill Shape with Green Dot */}
                              <div className="relative inline-flex items-center">
                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                                  otherDevice.status === 'online' 
                                    ? 'bg-[#1e5631] text-[#4ade80]'
                                    : otherDevice.status === 'offline'
                                    ? 'bg-red-900/40 text-red-400'
                                    : 'bg-yellow-900/40 text-yellow-400'
                                }`}>
                                  {otherDevice.status === 'online' && (
                                    <span className="flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]"></span>
                                    </span>
                                  )}
                                  {otherDevice.status === 'online' ? 'Online' : otherDevice.status === 'offline' ? 'Offline' : 'In Vorbereitung'}
                                </span>
                              </div>
                              {/* Connect Button - Pill Shape Blue */}
                              {otherDevice.tvid && (
                                <Button
                                  onClick={() => {
                                    const deepLink = `teamviewer10://control?device=${otherDevice.tvid}`;
                                    window.location.href = deepLink;
                                    toast.success('TeamViewer wird geöffnet...');
                                  }}
                                  size="sm"
                                  className="bg-[#1e90ff] hover:bg-[#1873cc] text-white font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5"
                                >
                                  <Video className="h-3 w-3" />
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Kein Standort zugewiesen
              </p>
            </div>
          )}

          {/* Metadata */}
          {device.created_at && (
            <div className={`mt-6 pt-4 border-t text-xs ${
              theme === 'dark' ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'
            }`}>
              <p>Erstellt: {new Date(device.created_at).toLocaleString('de-DE')}</p>
              {device.updated_at && (
                <p className="mt-1">
                  Zuletzt bearbeitet: {new Date(device.updated_at).toLocaleString('de-DE')}
                  {device.updated_by && ` von ${device.updated_by}`}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <Card className={`w-full max-w-md rounded-2xl ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Gerät löschen?
              </h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Möchten Sie das Gerät <span className="font-semibold">{device.device_id}</span> wirklich löschen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className={`${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Wird gelöscht...' : 'Löschen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeviceDetailsModal;
