import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Save } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

// Input Field Component (defined outside to prevent re-creation)
const InputField = ({ label, name, value, onChange, type = 'text', required = false, disabled = false, placeholder = '', theme }) => (
  <div>
    <label className={`block text-sm font-medium mb-2 ${
      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
    }`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      className={`w-full px-3 py-2 rounded-lg border ${
        theme === 'dark'
          ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
      } focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
    />
  </div>
);

// Select Field Component (defined outside to prevent re-creation)
const SelectField = ({ label, name, value, onChange, options, required = false, disabled = false, theme }) => (
  <div>
    <label className={`block text-sm font-medium mb-2 ${
      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
    }`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full px-3 py-2 rounded-lg border ${
        theme === 'dark'
          ? 'bg-[#1a1a1a] border-gray-700 text-white'
          : 'bg-white border-gray-300 text-gray-900'
      } focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const AddDeviceModal = ({ onClose, onDeviceAdded, onAdd, customers, selectedCustomer, prefilledLocationCode }) => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Determine if a specific customer is pre-selected
  const isSpecificCustomer = selectedCustomer && selectedCustomer !== 'all';
  const preSelectedCustomer = isSpecificCustomer 
    ? customers?.find(c => c.tenant_id === selectedCustomer || c.email === selectedCustomer) 
    : null;

  const [formData, setFormData] = useState({
    device_id: '',
    customer: preSelectedCustomer?.name || preSelectedCustomer?.display_name || preSelectedCustomer?.company || user?.company || '',
    customer_email: preSelectedCustomer?.email || user?.email || '',
    tenant_id: preSelectedCustomer?.tenant_id || selectedCustomer || '',
    locationcode: prefilledLocationCode || '',
    city: '',
    street: '',
    zip: '',
    country: 'GERMANY',
    sn_pc: '',
    sn_sc: '',
    tvid: '',
    ip: '',
    sw_version: '',
    hardware_model: 'Scanner',
    status: 'offline'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If customer selection changes, update both customer name and email
    if (name === 'customer_email') {
      const selectedCust = customers.find(c => c.email === value);
      setFormData(prev => ({
        ...prev,
        customer_email: value,
        customer: selectedCust?.company || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.device_id.trim()) {
      toast.error('Bitte geben Sie eine Device-ID ein');
      return;
    }

    if (!formData.customer_email) {
      toast.error('Bitte wählen Sie einen Kunden aus');
      return;
    }

    setLoading(true);
    try {
      // All devices use the same endpoint now (europcar_devices collection)
      const endpoint = '/api/portal/europcar-devices';

      const result = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      // Check if the HTTP request was successful (result.success means response.ok)
      if (result.success && result.data?.success) {
        toast.success('Gerät erfolgreich hinzugefügt');
        const newDevice = result.data?.device || formData;
        if (onDeviceAdded) {
          onDeviceAdded(newDevice);
        }
        if (onAdd) {
          onAdd(newDevice);
        }
        onClose();
      } else {
        const errorMsg = result.data?.detail || result.data?.message || result.error || 'Fehler beim Hinzufügen des Geräts';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Fehler beim Hinzufügen des Geräts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neues Gerät hinzufügen
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Fügen Sie ein neues Gerät zum System hinzu
              </p>
            </div>
            <button
              type="button"
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

          {/* Form Fields */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Grundinformationen
              </h3>
              
              <InputField
                label="Device-ID"
                name="device_id"
                value={formData.device_id}
                onChange={handleChange}
                required
                placeholder="z.B. AAHC01-01"
                theme={theme}
              />

              <SelectField
                label="Kunde"
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleChange}
                required
                disabled={isSpecificCustomer}
                theme={theme}
                options={[
                  { value: '', label: 'Bitte wählen...' },
                  ...customers.map(c => ({
                    value: c.tenant_id || c.email,
                    label: c.name || c.display_name || c.company || c.email
                  }))
                ]}
              />

              <InputField
                label="Locationcode"
                name="locationcode"
                value={formData.locationcode}
                onChange={handleChange}
                placeholder="z.B. AAHC01"
                theme={theme}
              />

              <InputField
                label="Stadt"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="z.B. Berlin"
                theme={theme}
              />

              <InputField
                label="Straße"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="z.B. Hauptstraße 1"
                theme={theme}
              />

              <InputField
                label="PLZ"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="z.B. 10115"
                theme={theme}
              />

              <SelectField
                label="Land"
                name="country"
                value={formData.country}
                onChange={handleChange}
                theme={theme}
                options={[
                  { value: 'GERMANY', label: 'Deutschland' },
                  { value: 'AUSTRIA', label: 'Österreich' },
                  { value: 'SWITZERLAND', label: 'Schweiz' }
                ]}
              />
            </div>

            {/* Hardware & Technical Information */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Hardware & Technische Details
              </h3>

              <InputField
                label="SN-PC (Tablet/Computer)"
                name="sn_pc"
                value={formData.sn_pc}
                onChange={handleChange}
                placeholder="Seriennummer des Tablets"
                theme={theme}
              />

              <InputField
                label="SN-SC (Scanner)"
                name="sn_sc"
                value={formData.sn_sc}
                onChange={handleChange}
                placeholder="Seriennummer des Scanners"
                theme={theme}
              />

              <InputField
                label="TeamViewer-ID"
                name="tvid"
                value={formData.tvid}
                onChange={handleChange}
                placeholder="z.B. 949746162"
                theme={theme}
              />

              <InputField
                label="IP-Adresse"
                name="ip"
                value={formData.ip}
                onChange={handleChange}
                placeholder="z.B. 192.168.1.100"
                theme={theme}
              />

              <InputField
                label="Software-Version"
                name="sw_version"
                value={formData.sw_version}
                onChange={handleChange}
                placeholder="z.B. 2.1.5"
                theme={theme}
              />

              <SelectField
                label="Hardware-Modell"
                name="hardware_model"
                value={formData.hardware_model}
                onChange={handleChange}
                theme={theme}
                options={[
                  { value: 'Scanner', label: 'Scanner' },
                  { value: 'Tablet', label: 'Tablet' },
                  { value: 'Computer', label: 'Computer' }
                ]}
              />

              <SelectField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                theme={theme}
                options={[
                  { value: 'offline', label: 'Offline' },
                  { value: 'online', label: 'Online' },
                  { value: 'in_vorbereitung', label: 'In Vorbereitung' }
                ]}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }">
            <Button
              type="button"
              onClick={onClose}
              className={`${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Speichern...' : 'Gerät hinzufügen'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddDeviceModal;
