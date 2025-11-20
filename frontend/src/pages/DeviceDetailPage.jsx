import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/card';
import { ArrowLeft, Edit2, Save, X, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DeviceDetailPage = () => {
  const { theme } = useTheme();
  const { deviceId, tenantId } = useParams();
  const navigate = useNavigate();
  const { token, apiCall } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [deviceData, setDeviceData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // WebSocket integration
  const handleWSDeviceUpdate = useCallback((data) => {
    console.log('[DeviceDetail] WebSocket device update:', data);
    if (data.device_id === deviceId) {
      fetchDeviceDetails();
      if (!isEditing) {
        toast.success('Gerät wurde aktualisiert', {
          duration: 3000,
          icon: '🔄'
        });
      }
    }
  }, [deviceId, isEditing]);

  useWebSocket(tenantId, token, {
    autoConnect: true,
    onDeviceUpdate: handleWSDeviceUpdate
  });

  useEffect(() => {
    fetchDeviceDetails();
    fetchAvailableTenants();
  }, [deviceId]);

  const fetchDeviceDetails = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('token') || localStorage.getItem('portal_token');
      console.log('[DeviceDetail] Fetching device:', deviceId, 'Token present:', !!authToken);
      
      const response = await fetch(`${BACKEND_URL}/api/tenant-devices/device/${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      console.log('[DeviceDetail] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DeviceDetail] Error response:', errorText);
        throw new Error(`Failed to fetch device details: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DeviceDetail] Device data loaded:', data);
      setDeviceData(data.device);
      setEditedData(data.device);
    } catch (error) {
      console.error('[DeviceDetail] Error fetching device details:', error);
      toast.error('Fehler beim Laden der Gerätedetails: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTenants = async () => {
    try {
      const result = await apiCall('/api/tenants');
      const tenantsArray = result?.data || result || [];
      setAvailableTenants(tenantsArray);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedData({ ...deviceData });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({ ...deviceData });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-devices/device/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update device');
      }

      const data = await response.json();
      setDeviceData(data.device);
      setEditedData(data.device);
      setIsEditing(false);
      toast.success('Gerät erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-devices/device/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete device');
      }

      toast.success('Gerät erfolgreich gelöscht');
      navigate(`/admin/tenants/${tenantId}`);
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleTransfer = async () => {
    if (!selectedTenant) {
      toast.error('Bitte wählen Sie einen Tenant aus');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-devices/device/${deviceId}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenant_id: selectedTenant })
      });

      if (!response.ok) {
        throw new Error('Failed to transfer device');
      }

      toast.success('Gerät erfolgreich verschoben');
      setShowTransferModal(false);
      navigate(`/admin/tenants/${selectedTenant}`);
    } catch (error) {
      console.error('Error transferring device:', error);
      toast.error('Fehler beim Verschieben');
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Laden...</div>
        </div>
      </div>
    );
  }

  if (!deviceData) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Gerät nicht gefunden</div>
        </div>
      </div>
    );
  }

  const currentData = isEditing ? editedData : deviceData;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'} p-6`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/admin/tenants/${tenantId}`)}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {currentData.device_id}
              </h1>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Gerätedetails
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEditClick}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-[#c00000] hover:bg-[#a00000] text-white'
                      : 'bg-[#c00000] hover:bg-[#a00000] text-white'
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Verschieben
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white'}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Basisinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Device ID
                </label>
                <input
                  type="text"
                  value={currentData.device_id || ''}
                  disabled
                  className={`w-full px-3 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-400 border-gray-700'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status
                </label>
                <select
                  value={currentData.status || ''}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="in_preparation">In Vorbereitung</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Location Code
                </label>
                <input
                  type="text"
                  value={currentData.locationcode || ''}
                  onChange={(e) => handleFieldChange('locationcode', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hardware-Modell
                </label>
                <input
                  type="text"
                  value={currentData.hardware_model || ''}
                  onChange={(e) => handleFieldChange('hardware_model', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Hardware Details */}
        <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white'}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Hardware-Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  SN-PC (Tablet/Computer)
                </label>
                <input
                  type="text"
                  value={currentData.sn_pc || ''}
                  onChange={(e) => handleFieldChange('sn_pc', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  SN-SC (Scanner)
                </label>
                <input
                  type="text"
                  value={currentData.sn_sc || ''}
                  onChange={(e) => handleFieldChange('sn_sc', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  TeamViewer-ID
                </label>
                <input
                  type="text"
                  value={currentData.tvid || ''}
                  onChange={(e) => handleFieldChange('tvid', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  IP-Adresse
                </label>
                <input
                  type="text"
                  value={currentData.ip || ''}
                  onChange={(e) => handleFieldChange('ip', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Software-Version
                </label>
                <input
                  type="text"
                  value={currentData.sw_version || ''}
                  onChange={(e) => handleFieldChange('sw_version', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Location Information */}
        <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white'}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Standortinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Straße
                </label>
                <input
                  type="text"
                  value={currentData.street || ''}
                  onChange={(e) => handleFieldChange('street', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={currentData.zip || ''}
                    onChange={(e) => handleFieldChange('zip', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] text-white border-gray-700'
                        : 'bg-white text-gray-900 border-gray-300'
                    } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={currentData.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] text-white border-gray-700'
                        : 'bg-white text-gray-900 border-gray-300'
                    } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Land
                </label>
                <input
                  type="text"
                  value={currentData.country || ''}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <Card className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white'}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Zusätzliche Informationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Erstellt von
                </label>
                <input
                  type="text"
                  value={currentData.created_by || ''}
                  disabled
                  className={`w-full px-3 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-400 border-gray-700'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Erstellt am
                </label>
                <input
                  type="text"
                  value={currentData.created_at ? new Date(currentData.created_at).toLocaleString('de-DE') : ''}
                  disabled
                  className={`w-full px-3 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-400 border-gray-700'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zuletzt aktualisiert
                </label>
                <input
                  type="text"
                  value={currentData.updated_at ? new Date(currentData.updated_at).toLocaleString('de-DE') : ''}
                  disabled
                  className={`w-full px-3 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-400 border-gray-700'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } border`}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Gerät löschen
            </h3>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              Möchten Sie das Gerät "{deviceData.device_id}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Gerät zu anderem Tenant verschieben
            </h3>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Ziel-Tenant auswählen
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                <option value="">Bitte wählen...</option>
                {availableTenants.map(tenant => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.name || tenant.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleTransfer}
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Verschieben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDetailPage;
