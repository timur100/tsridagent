import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, MapPin, Package, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const HardwareSetModal = ({ show, onClose, onSubmit, editing, locations, tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  // Debug: Log locations when modal opens
  React.useEffect(() => {
    if (show) {
      console.log('[HardwareSetModal] Locations received:', locations?.length || 0);
      if (!locations || locations.length === 0) {
        console.warn('[HardwareSetModal] No locations available!');
      }
    }
  }, [show, locations]);
  
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [loadingAvailableDevices, setLoadingAvailableDevices] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState([]);
  
  const [formData, setFormData] = useState({
    set_name: '',
    location_id: '',
    location_code: '',
    device_number: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setFormData({
        set_name: editing.set_name || '',
        location_id: editing.location_id || '',
        location_code: editing.location_code || '',
        device_number: editing.device_number || '',
        notes: editing.notes || ''
      });
      // Load devices for this set
      loadSetDevices(editing.id);
    } else {
      setFormData({
        set_name: '',
        location_id: '',
        location_code: '',
        device_number: '',
        notes: ''
      });
      setDevices([]);
    }
  }, [editing, show]);
  
  const loadSetDevices = async (setId) => {
    if (!setId) return;
    setLoadingDevices(true);
    try {
      // Load set assignments
      const assignmentsResult = await apiCall(`/api/hardware/sets/${setId}/assignments`);
      if (assignmentsResult.success || Array.isArray(assignmentsResult.data)) {
        const assignments = assignmentsResult.data || assignmentsResult;
        setDevices(assignments.filter(a => a.active));
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };
  
  const loadAvailableDevices = async (locationCode, deviceNumber) => {
    if (!locationCode) {
      setAvailableDevices([]);
      return;
    }
    
    setLoadingAvailableDevices(true);
    try {
      // Build the set code (e.g., BERT01-02)
      const setCode = deviceNumber ? `${locationCode}-${deviceNumber}` : null;
      console.log('[HardwareSetModal] Loading components for set:', setCode || `location ${locationCode}`);
      
      // Load Europcar devices (not the portal devices!)
      const devicesResult = await apiCall(`/api/portal/europcar-devices`);
      
      if (devicesResult.success || Array.isArray(devicesResult.data)) {
        const allDevices = devicesResult.data || devicesResult;
        console.log('[HardwareSetModal] Total devices loaded:', allDevices.length);
        
        let components = [];
        
        // If we have a complete set code, find that specific set's components
        if (setCode) {
          const setDevice = allDevices.find(d => 
            d.device_id && d.device_id.toUpperCase() === setCode.toUpperCase()
          );
          
          if (setDevice) {
            console.log('[HardwareSetModal] Found set device:', setDevice.device_id);
            // Extract components from the set device fields
            components = extractComponentsFromSetDevice(setDevice);
            console.log('[HardwareSetModal] Extracted components:', components.length);
          }
        }
        
        // If no specific components found, show all devices at this location
        if (components.length === 0) {
          const locationDevices = allDevices.filter(d => 
            d.locationcode && d.locationcode.toUpperCase() === locationCode.toUpperCase()
          );
          console.log('[HardwareSetModal] Showing location devices:', locationDevices.length);
          components = locationDevices.map(d => extractComponentsFromSetDevice(d)).flat();
        }
        
        setAvailableDevices(components);
      }
    } catch (error) {
      console.error('Error loading available devices:', error);
      setAvailableDevices([]);
    } finally {
      setLoadingAvailableDevices(false);
    }
  };
  
  // Extract individual components from a set device record
  const extractComponentsFromSetDevice = (setDevice) => {
    const components = [];
    
    // PC Component
    if (setDevice.sn_pc) {
      components.push({
        id: `${setDevice.device_id}_PC`,
        device_type: 'PC',
        serial_number: setDevice.sn_pc,
        manufacturer: 'PC',
        status: setDevice.status || 'unbekannt',
        locationcode: setDevice.locationcode,
        parent_set: setDevice.device_id,
        device_id: setDevice.device_id
      });
    }
    
    // Scanner Component
    if (setDevice.sn_sc) {
      components.push({
        id: `${setDevice.device_id}_SC`,
        device_type: 'Scanner',
        serial_number: setDevice.sn_sc,
        manufacturer: 'Scanner',
        status: setDevice.status || 'unbekannt',
        locationcode: setDevice.locationcode,
        parent_set: setDevice.device_id,
        device_id: setDevice.device_id
      });
    }
    
    // Add more component types if they exist in your data
    if (setDevice.imei_1) {
      components.push({
        id: `${setDevice.device_id}_IMEI1`,
        device_type: 'Mobile Device',
        serial_number: setDevice.imei_1,
        manufacturer: 'Mobile',
        status: setDevice.status || 'unbekannt',
        locationcode: setDevice.locationcode,
        parent_set: setDevice.device_id,
        device_id: setDevice.device_id
      });
    }
    
    return components;
  };
  
  // Load available devices when location or device number changes
  useEffect(() => {
    if (formData.location_code && !editing) {
      console.log('[HardwareSetModal] Location/Device changed:', formData.location_code, formData.device_number);
      loadAvailableDevices(formData.location_code, formData.device_number);
    }
  }, [formData.location_code, formData.device_number]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.set_name.trim()) {
      toast.error('Bitte Set-Name eingeben');
      return;
    }
    
    if (!formData.location_id) {
      toast.error('Bitte Standort auswählen');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...formData,
        tenant_id: tenantId,
        selected_devices: selectedDevices  // Pass selected devices to parent
      });
      onClose();
      setSelectedDevices([]);  // Reset
    } catch (error) {
      console.error('Error saving set:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-2xl rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editing ? 'Set bearbeiten' : 'Neues Set erstellen'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Set-Name *
            </label>
            <input
              type="text"
              value={formData.set_name}
              onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
              placeholder="z.B. Berlin Mitte - Kiosk 1"
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300'
              }`}
              maxLength={200}
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Standort *
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => {
                const selectedLocation = locations.find(l => l.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  location_id: e.target.value,
                  location_code: selectedLocation?.code || selectedLocation?.location_code || ''
                });
              }}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="">-- Standort auswählen --</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Location Code
              </label>
              <input
                type="text"
                value={formData.location_code}
                onChange={(e) => setFormData({ ...formData, location_code: e.target.value.toUpperCase() })}
                placeholder="z.B. MUCT01"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">Wird automatisch vom Standort übernommen</p>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Gerätenummer / Label
              </label>
              <input
                type="text"
                value={formData.device_number}
                onChange={(e) => setFormData({ ...formData, device_number: e.target.value })}
                placeholder="z.B. 01, 02, 03"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">Label auf dem Tablet (z.B. 01)</p>
            </div>
          </div>

          {formData.location_code && formData.device_number && (
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
              <p className="text-sm font-semibold text-green-600">
                Vollständiger Code: <span className="font-mono text-lg">{formData.location_code}-{formData.device_number}</span>
              </p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optionale Notizen..."
              rows={4}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Available Devices Section - Only shown when creating new set */}
          {!editing && formData.location_id && (
            <div className={`mt-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Package className="h-5 w-5" />
                  Verfügbare Komponenten auswählen ({selectedDevices.length} ausgewählt)
                </h3>
              </div>
              
              {loadingAvailableDevices ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000] mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Lade verfügbare Geräte...</p>
                </div>
              ) : availableDevices.length === 0 ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine verfügbaren Geräte am Standort</p>
                  <p className="text-xs mt-1">Fügen Sie Geräte später über die Geräte-Verwaltung hinzu</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {availableDevices.map((device) => (
                      <div 
                        key={device.id}
                        onClick={() => toggleDeviceSelection(device.id)}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedDevices.includes(device.id)
                            ? theme === 'dark' 
                              ? 'bg-[#c00000]/20 border-[#c00000] ring-2 ring-[#c00000]/50 cursor-pointer' 
                              : 'bg-red-50 border-[#c00000] ring-2 ring-[#c00000]/50 cursor-pointer'
                            : theme === 'dark' 
                              ? 'bg-[#2a2a2a] border-gray-600 hover:border-gray-500 cursor-pointer' 
                              : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedDevices.includes(device.id)}
                                onChange={() => toggleDeviceSelection(device.id)}
                                className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                              />
                              <div>
                                <div className="flex items-center gap-3">
                                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {device.device_type || 'Unbekannt'}
                                  </span>
                                  <span className={`text-sm px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {device.serial_number}
                                  </span>
                                </div>
                                {device.parent_set && (
                                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Aus Set: {device.parent_set}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {device.locationcode && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      Standort: {device.locationcode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              device.status === 'aktiv' || device.status === 'verfügbar'
                                ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                : device.status === 'defekt'
                                ? theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {device.status || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                      <strong>Hinweis:</strong> Wählen Sie die Komponenten aus, die zu diesem Set gehören sollen. Sie können auch später weitere Geräte hinzufügen.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Devices/Components Section - Only shown in edit mode */}
          {editing && (
            <div className={`mt-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Package className="h-5 w-5" />
                  Komponenten ({devices.length})
                </h3>
              </div>
              
              {loadingDevices ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000] mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Lade Komponenten...</p>
                </div>
              ) : devices.length === 0 ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Komponenten zugewiesen</p>
                  <p className="text-xs mt-1">Fügen Sie Geräte über die Geräte-Verwaltung hinzu</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div 
                      key={device.device_id}
                      className={`p-3 rounded-lg border ${
                        theme === 'dark' 
                          ? 'bg-[#2a2a2a] border-gray-600 hover:border-gray-500' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      } transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {device.device_type || 'Unbekannt'}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {device.serial_number}
                            </span>
                          </div>
                          {device.manufacturer && (
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {device.manufacturer} {device.model && `- ${device.model}`}
                            </p>
                          )}
                          {device.notes && (
                            <p className={`text-xs mt-1 italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                              {device.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            device.status === 'aktiv'
                              ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                              : device.status === 'defekt'
                              ? theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {device.status || 'Unbekannt'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                  <strong>Hinweis:</strong> Um Komponenten zu bearbeiten, austauschen oder neue hinzuzufügen, verwenden Sie die Geräte-Verwaltung oder das Set-Detail-Modal.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Speichern
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className={theme === 'dark' ? 'border-gray-600 text-gray-300' : ''}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HardwareSetModal;
