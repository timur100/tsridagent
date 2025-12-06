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
    } else {
      setFormData({
        set_name: '',
        location_id: '',
        location_code: '',
        device_number: '',
        notes: ''
      });
    }
  }, [editing, show]);

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
        tenant_id: tenantId
      });
      onClose();
    } catch (error) {
      console.error('Error saving set:', error);
    } finally {
      setSaving(false);
    }
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
