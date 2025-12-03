import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Save, Package } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const HardwareDeviceModal = ({ show, onClose, onSubmit, editing, tenantId }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    serial_number: '',
    hardware_type: '',
    manufacturer: '',
    model: '',
    purchase_date: '',
    warranty_until: '',
    warranty_reminder_days: 30,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const hardwareTypes = [
    'Tablet',
    'Scanner',
    'Dockingstation',
    'Drucker',
    'Monitor',
    'Tastatur',
    'Maus',
    'Router',
    'Switch',
    'Kamera',
    'Sonstiges'
  ];

  useEffect(() => {
    if (editing) {
      setFormData({
        serial_number: editing.serial_number || '',
        hardware_type: editing.hardware_type || '',
        manufacturer: editing.manufacturer || '',
        model: editing.model || '',
        purchase_date: editing.purchase_date || '',
        warranty_until: editing.warranty_until || '',
        warranty_reminder_days: editing.warranty_reminder_days || 30,
        notes: editing.notes || ''
      });
    } else {
      setFormData({
        serial_number: '',
        hardware_type: '',
        manufacturer: '',
        model: '',
        purchase_date: '',
        warranty_until: '',
        warranty_reminder_days: 30,
        notes: ''
      });
    }
  }, [editing, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.serial_number.trim()) {
      toast.error('Bitte Seriennummer eingeben');
      return;
    }
    
    if (!formData.hardware_type.trim()) {
      toast.error('Bitte Hardware-Typ auswählen');
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
      console.error('Error saving device:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} z-10`}>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editing ? 'Gerät bearbeiten' : 'Neues Gerät hinzufügen'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Seriennummer *
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="z.B. TAB-2024-001"
                disabled={!!editing}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                } ${editing ? 'opacity-50 cursor-not-allowed' : ''}`}
                maxLength={100}
              />
              {editing && (
                <p className="text-xs text-gray-500 mt-1">Seriennummer kann nicht geändert werden</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Hardware-Typ *
              </label>
              <select
                value={formData.hardware_type}
                onChange={(e) => setFormData({ ...formData, hardware_type: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="">-- Typ auswählen --</option>
                {hardwareTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Hersteller
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="z.B. Samsung"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
                maxLength={100}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Modell
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="z.B. Galaxy Tab S9"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
                maxLength={100}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Kaufdatum
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Garantie bis
              </label>
              <input
                type="date"
                value={formData.warranty_until}
                onChange={(e) => setFormData({ ...formData, warranty_until: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Erinnerung (Tage vor Garantieablauf)
              </label>
              <input
                type="number"
                value={formData.warranty_reminder_days}
                onChange={(e) => setFormData({ ...formData, warranty_reminder_days: parseInt(e.target.value) || 30 })}
                min="1"
                max="365"
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optionale Notizen zum Gerät..."
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
                  {editing ? 'Aktualisieren' : 'Gerät hinzufügen'}
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

export default HardwareDeviceModal;
