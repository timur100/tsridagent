import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Save, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const HardwareSetModal = ({ show, onClose, onSubmit, editing, locations, tenantId }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    set_name: '',
    location_id: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setFormData({
        set_name: editing.set_name || '',
        location_id: editing.location_id || '',
        notes: editing.notes || ''
      });
    } else {
      setFormData({
        set_name: '',
        location_id: '',
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
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
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
