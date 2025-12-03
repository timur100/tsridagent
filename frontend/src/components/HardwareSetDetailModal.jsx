import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, Plus, Trash2, MapPin, Calendar, Package, 
  AlertTriangle, Settings, RefreshCw, CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const HardwareSetDetailModal = ({ show, onClose, set, onRefresh }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [devices, setDevices] = useState([]);
  const [warehouseDevices, setWarehouseDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => {
    if (show && set) {
      loadData();
    }
  }, [show, set]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load devices in this set
      const devicesResult = await apiCall(`/api/hardware/sets/${set.id}/devices`);
      if (devicesResult.success && Array.isArray(devicesResult.data)) {
        setDevices(devicesResult.data);
      } else if (Array.isArray(devicesResult)) {
        setDevices(devicesResult);
      }

      // Load available warehouse devices
      const warehouseResult = await apiCall(`/api/hardware/devices?tenant_id=${set.tenant_id}&status=verfügbar_lager`);
      if (warehouseResult.success && Array.isArray(warehouseResult.data)) {
        setWarehouseDevices(warehouseResult.data);
      } else if (Array.isArray(warehouseResult)) {
        setWarehouseDevices(warehouseResult);
      }
    } catch (error) {
      console.error('Error loading set devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!selectedDeviceId) {
      toast.error('Bitte Gerät auswählen');
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/sets/${set.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          device_id: selectedDeviceId
        })
      });

      if (result.success) {
        toast.success('Gerät erfolgreich hinzugefügt');
        setShowAddDevice(false);
        setSelectedDeviceId('');
        await loadData();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen des Geräts');
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Möchten Sie dieses Gerät aus dem Set entfernen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/sets/${set.id}/remove`, {
        method: 'POST',
        body: JSON.stringify({
          device_id: deviceId,
          removal_reason: 'Manuell entfernt'
        })
      });

      if (result.success) {
        toast.success('Gerät erfolgreich entfernt');
        await loadData();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Fehler beim Entfernen des Geräts');
    }
  };

  const handleCloseSet = async () => {
    if (!window.confirm('Möchten Sie dieses Set wirklich schließen? Alle Geräte werden ins Lager verschoben.')) {
      return;
    }

    try {
      const result = await apiCall(`/api/hardware/sets/${set.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'geschlossen'
        })
      });

      if (result.success || result.id) {
        toast.success('Set wurde geschlossen');
        if (onRefresh) onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Error closing set:', error);
      toast.error('Fehler beim Schließen des Sets');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'aktiv': { bg: 'bg-green-500', text: 'Aktiv', icon: CheckCircle },
      'verfügbar_lager': { bg: 'bg-blue-500', text: 'Verfügbar', icon: Package },
      'defekt': { bg: 'bg-red-500', text: 'Defekt', icon: AlertTriangle },
      'in_reparatur': { bg: 'bg-yellow-500', text: 'In Reparatur', icon: Settings }
    };
    return badges[status] || badges['verfügbar_lager'];
  };

  if (!show || !set) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} z-10`}>
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {set.set_name}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                set.status === 'aktiv' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {set.status === 'aktiv' ? 'Aktiv' : set.status}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                Erstellt: {new Date(set.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAddDevice(!showAddDevice)}
              className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <Plus className="h-4 w-4" />
              Gerät hinzufügen
            </Button>
            {set.status === 'aktiv' && devices.length === 0 && (
              <Button
                onClick={handleCloseSet}
                variant="outline"
                className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Set schließen
              </Button>
            )}
          </div>

          {/* Add Device Section */}
          {showAddDevice && (
            <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Gerät aus Lager hinzufügen
              </h3>
              {warehouseDevices.length === 0 ? (
                <p className="text-sm text-gray-500">Keine verfügbaren Geräte im Lager</p>
              ) : (
                <div className="flex gap-3">
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">-- Gerät auswählen --</option>
                    {warehouseDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.hardware_type} - {device.serial_number}
                        {device.manufacturer && ` (${device.manufacturer})`}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddDevice}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Hinzufügen
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddDevice(false);
                      setSelectedDeviceId('');
                    }}
                    variant="outline"
                  >
                    Abbrechen
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Devices List */}
          <div>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Geräte in diesem Set ({devices.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
              </div>
            ) : devices.length === 0 ? (
              <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50'}`}>
                <Package className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Noch keine Geräte in diesem Set
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Fügen Sie Geräte aus dem Lager hinzu
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => {
                  const statusBadge = getStatusBadge(device.current_status);
                  
                  return (
                    <Card
                      key={device.id}
                      className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {device.hardware_type}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${statusBadge.bg}`}>
                              {React.createElement(statusBadge.icon, { className: 'h-3 w-3' })}
                              {statusBadge.text}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">SN:</span>
                              <span className="ml-2 font-mono font-semibold">{device.serial_number}</span>
                            </div>
                            {device.manufacturer && (
                              <div>
                                <span className="text-gray-500">Hersteller:</span>
                                <span className="ml-2">{device.manufacturer}</span>
                              </div>
                            )}
                            {device.model && (
                              <div>
                                <span className="text-gray-500">Modell:</span>
                                <span className="ml-2">{device.model}</span>
                              </div>
                            )}
                            {device.warranty_until && (
                              <div>
                                <span className="text-gray-500">Garantie bis:</span>
                                <span className="ml-2">{new Date(device.warranty_until).toLocaleDateString('de-DE')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {device.current_status === 'defekt' && (
                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Austauschen
                            </Button>
                          )}
                          <button
                            onClick={() => handleRemoveDevice(device.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Aus Set entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Section */}
          {set.notes && (
            <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Notizen
              </h3>
              <p className="text-sm whitespace-pre-wrap">{set.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HardwareSetDetailModal;
