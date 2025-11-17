import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { X, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const ComponentModal = ({ isOpen, onClose, component, onSuccess }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    component_type: 'tablet',
    identification_type: 'SN-PC',
    identification_value: '',
    manufacturer: '',
    model: '',
    quantity_in_stock: 0,
    min_stock_level: 5,
    unit: 'Stück',
    storage_location: '',
    description: '',
    notes: '',
    images: []
  });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);

  useEffect(() => {
    if (component) {
      setFormData({
        name: component.name || '',
        component_type: component.component_type || 'tablet',
        identification_type: component.identification_type || 'SN-PC',
        identification_value: component.identification_value || '',
        manufacturer: component.manufacturer || '',
        model: component.model || '',
        quantity_in_stock: component.quantity_in_stock || 0,
        min_stock_level: component.min_stock_level || 5,
        unit: component.unit || 'Stück',
        storage_location: component.storage_location || '',
        description: component.description || '',
        notes: component.notes || '',
        images: component.images || []
      });
      setImagePreview(component.images || []);
    } else {
      setFormData({
        name: '',
        component_type: 'tablet',
        identification_type: 'SN-PC',
        identification_value: '',
        manufacturer: '',
        model: '',
        quantity_in_stock: 0,
        min_stock_level: 5,
        unit: 'Stück',
        storage_location: '',
        description: '',
        notes: '',
        images: []
      });
      setImagePreview([]);
    }
  }, [component, isOpen]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + formData.images.length > 5) {
      toast.error('Maximal 5 Bilder erlaubt');
      return;
    }

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name} ist zu groß (max. 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64String]
        }));
        setImagePreview(prev => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.identification_value) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSaving(true);
    try {
      let result;
      // Check if component has an ID (edit mode) or not (create/duplicate mode)
      if (component?.id) {
        // Update existing component
        result = await apiCall(`/api/components/${component.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        // Create new component (includes duplicates)
        result = await apiCall('/api/components/create', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (result.success) {
        toast.success(component?.id ? 'Komponente aktualisiert' : 'Komponente erstellt');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving component:', error);
      toast.error(error.message || 'Fehler beim Speichern der Komponente');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity_in_stock' || name === 'min_stock_level' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    let identificationType = 'SN-PC';
    
    switch(type) {
      case 'pc':
        identificationType = 'SN-PC';
        break;
      case 'tablet':
        identificationType = 'SN-PC';
        break;
      case 'scanner':
        identificationType = 'SN-SC';
        break;
      case 'docking_station':
        identificationType = 'SN-DC';
        break;
      case 'accessory':
        identificationType = 'Article_Number';
        break;
      default:
        identificationType = 'SN-PC';
    }

    setFormData(prev => ({
      ...prev,
      component_type: type,
      identification_type: identificationType
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-lg shadow-xl ${
        theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {component?.id ? 'Komponente bearbeiten' : 'Neue Komponente erstellen'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-200 ${
              theme === 'dark' ? 'hover:bg-gray-700' : ''
            }`}
          >
            <X className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="z.B. Surface Pro 6"
              />
            </div>

            {/* Component Type */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Komponenten-Typ *
              </label>
              <select
                name="component_type"
                value={formData.component_type}
                onChange={handleTypeChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="pc">PC</option>
                <option value="tablet">Tablet</option>
                <option value="scanner">Scanner</option>
                <option value="docking_station">Docking Station</option>
                <option value="accessory">Zubehör</option>
              </select>
            </div>

            {/* Identification Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Identifikations-Typ *
                </label>
                <select
                  name="identification_type"
                  value={formData.identification_type}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="SN-PC">SN-PC (Tablet)</option>
                  <option value="SN-SC">SN-SC (Scanner)</option>
                  <option value="SN-DC">SN-DC (Docking Station)</option>
                  <option value="Article_Number">Artikelnummer</option>
                  <option value="Barcode">Barcode</option>
                  <option value="QR_Code">QR-Code</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Identifikations-Wert *
                </label>
                <input
                  type="text"
                  name="identification_value"
                  value={formData.identification_value}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. SN-PC-001"
                />
              </div>
            </div>

            {/* Manufacturer & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Hersteller
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Microsoft"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Modell
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Surface Pro 6"
                />
              </div>
            </div>

            {/* Stock & Min Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Bestand
                </label>
                <input
                  type="number"
                  name="quantity_in_stock"
                  value={formData.quantity_in_stock}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Mindestbestand
                </label>
                <input
                  type="number"
                  name="min_stock_level"
                  value={formData.min_stock_level}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Einheit
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Stück"
                />
              </div>
            </div>

            {/* Storage Location */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Lagerplatz
              </label>
              <input
                type="text"
                name="storage_location"
                value={formData.storage_location}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="z.B. Regal A-3-2"
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Beschreibung
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Optional"
              />
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Notizen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Optional"
              />
            </div>

            {/* Images Upload */}
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Bilder (max. 5)
              </label>
              
              {/* Upload Button */}
              <div className="mb-3">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:border-[#c00000] bg-[#1a1a1a] text-white'
                    : 'border-gray-300 hover:border-[#c00000] bg-white text-gray-900'
                }`}>
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Bilder hochladen</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={formData.images.length >= 5}
                  />
                </label>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  JPG, PNG oder WebP (max. 5MB pro Bild)
                </p>
              </div>

              {/* Image Preview Grid */}
              {imagePreview.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {imagePreview.map((img, idx) => (
                    <div 
                      key={idx}
                      className={`relative group aspect-square rounded-lg overflow-hidden border ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imagePreview.length === 0 && (
                <div className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed ${
                  theme === 'dark' ? 'border-gray-800 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'
                }`}>
                  <ImageIcon className={`h-12 w-12 mb-2 ${
                    theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                  }`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Keine Bilder hochgeladen
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className={`${
              theme === 'dark'
                ? 'border-gray-700 text-white hover:bg-gray-700'
                : 'border-gray-300 text-gray-900 hover:bg-gray-100'
            }`}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Speichert...' : component?.id ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComponentModal;
