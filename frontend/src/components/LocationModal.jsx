import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// Tenant-Kategorien mit ihren spezifischen Feldern
const TENANT_CATEGORIES = {
  general: {
    label: 'Allgemein',
    description: 'Basis-Standortdaten',
    fields: []
  },
  car_rental: {
    label: 'Autovermietung',
    description: 'Für Europcar, Sixt, etc.',
    fields: [
      { name: 'main_type', label: 'Stations-Typ', type: 'select', options: [
        { value: 'A', label: 'A - Standard' },
        { value: 'C', label: 'C - City' },
        { value: 'CAP', label: 'CAP - Airport' },
        { value: 'CSS', label: 'CSS - Van/Truck' },
        { value: 'CRR', label: 'CRR - Railway' }
      ]},
      { name: 'id_checker', label: 'ID Checker', type: 'number', placeholder: '1, 2, etc.' },
      { name: 'switch_info', label: 'Switch', type: 'text', placeholder: 'z.B. Switch voll' },
      { name: 'port', label: 'Port', type: 'text', placeholder: 'z.B. 7 +12' },
      { name: 'sn_pc', label: 'SN-PC', type: 'text', placeholder: 'z.B. 47714571453' },
      { name: 'sn_sc', label: 'SN-SC', type: 'text', placeholder: 'z.B. 201728 00606' },
      { name: 'tv_id', label: 'TeamViewer ID', type: 'text', placeholder: 'TeamViewer ID' },
      { name: 'phone_internal', label: 'Telefon Intern', type: 'text' }
    ]
  },
  logistics: {
    label: 'Logistik',
    description: 'Für Speditionen, Lager, etc.',
    fields: [
      { name: 'warehouse_code', label: 'Lager-Code', type: 'text', placeholder: 'z.B. WH-001' },
      { name: 'loading_docks', label: 'Anzahl Laderampen', type: 'number', placeholder: '0' },
      { name: 'storage_capacity', label: 'Lagerkapazität (m²)', type: 'number', placeholder: '0' },
      { name: 'forklift_count', label: 'Anzahl Gabelstapler', type: 'number', placeholder: '0' }
    ]
  },
  retail: {
    label: 'Einzelhandel',
    description: 'Für Shops, Filialen, etc.',
    fields: [
      { name: 'store_number', label: 'Filialnummer', type: 'text', placeholder: 'z.B. F-123' },
      { name: 'sales_area', label: 'Verkaufsfläche (m²)', type: 'number', placeholder: '0' },
      { name: 'cashier_count', label: 'Anzahl Kassen', type: 'number', placeholder: '0' },
      { name: 'opening_hours', label: 'Öffnungszeiten', type: 'text', placeholder: 'z.B. Mo-Sa 9-20 Uhr' }
    ]
  },
  healthcare: {
    label: 'Gesundheitswesen',
    description: 'Für Kliniken, Praxen, etc.',
    fields: [
      { name: 'facility_type', label: 'Einrichtungstyp', type: 'select', options: [
        { value: 'hospital', label: 'Krankenhaus' },
        { value: 'clinic', label: 'Klinik' },
        { value: 'practice', label: 'Arztpraxis' },
        { value: 'pharmacy', label: 'Apotheke' }
      ]},
      { name: 'bed_count', label: 'Anzahl Betten', type: 'number', placeholder: '0' },
      { name: 'department', label: 'Abteilung', type: 'text', placeholder: 'z.B. Kardiologie' }
    ]
  }
};

const LocationModal = ({
  theme,
  show,
  onClose,
  editing,
  formData,
  onChange,
  onSubmit,
  tenantCategory: initialCategory
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'general');
  const [customFields, setCustomFields] = useState([]);
  const [showCategoryFields, setShowCategoryFields] = useState(true);
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Load custom fields from formData if editing
  useEffect(() => {
    if (editing && formData.custom_fields) {
      setCustomFields(formData.custom_fields);
    }
  }, [editing, formData.custom_fields]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...formData, [name]: processedValue });
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    onChange({ ...formData, tenant_category: category });
  };

  const handleCustomFieldChange = (index, value) => {
    const updatedFields = [...customFields];
    updatedFields[index].value = value;
    setCustomFields(updatedFields);
    onChange({ ...formData, custom_fields: updatedFields });
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const newField = {
      id: Date.now(),
      name: newFieldName.trim(),
      type: newFieldType,
      value: ''
    };
    
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    onChange({ ...formData, custom_fields: updatedFields });
    setNewFieldName('');
    setNewFieldType('text');
  };

  const removeCustomField = (index) => {
    const updatedFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedFields);
    onChange({ ...formData, custom_fields: updatedFields });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    console.log('[LocationModal] handleSubmit called');
    console.log('[LocationModal] Form data:', formData);
    console.log('[LocationModal] Category:', selectedCategory);
    console.log('[LocationModal] Custom fields:', customFields);
    
    // Validate required fields
    if (!formData.location_code || !formData.station_name) {
      console.error('[LocationModal] Validation failed: missing required fields');
      alert('Bitte füllen Sie die Pflichtfelder aus (Standort-Code und Standortname)');
      return;
    }
    
    // Add category and custom fields to formData
    const submitData = {
      ...formData,
      tenant_category: selectedCategory,
      custom_fields: customFields
    };
    onChange(submitData);
    
    onSubmit();
    console.log('[LocationModal] onSubmit called successfully');
  };

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm ${
    theme === 'dark'
      ? 'bg-[#1f1f1f] text-white border border-gray-600 focus:border-[#d50c2d]'
      : 'bg-white text-gray-900 border border-gray-300 focus:border-[#d50c2d]'
  } focus:outline-none focus:ring-1 focus:ring-[#d50c2d]`;

  const labelClass = `block text-sm font-medium mb-1 ${
    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  }`;

  const sectionHeaderClass = `flex items-center justify-between cursor-pointer p-3 rounded-lg ${
    theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#333]' : 'bg-gray-50 hover:bg-gray-100'
  }`;

  const categoryFields = TENANT_CATEGORIES[selectedCategory]?.fields || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-200 bg-white'
        } z-10`}>
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editing ? 'Standort bearbeiten' : 'Neuer Standort'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-100'
            }`}
            data-testid="location-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Kategorie-Auswahl */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tenant-Kategorie
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(TENANT_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCategoryChange(key)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedCategory === key
                      ? 'border-[#d50c2d] bg-[#d50c2d]/10'
                      : theme === 'dark'
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`category-${key}`}
                >
                  <div className={`font-medium text-sm ${
                    selectedCategory === key
                      ? 'text-[#d50c2d]'
                      : theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {category.label}
                  </div>
                  <div className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {category.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Basis-Informationen (immer sichtbar) */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Basis-Informationen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Standort-Code *</label>
                <input
                  type="text"
                  name="location_code"
                  value={formData.location_code || ''}
                  onChange={handleChange}
                  required
                  placeholder="z.B. BER001"
                  className={inputClass}
                  data-testid="location-code-input"
                />
              </div>
              <div>
                <label className={labelClass}>Standortname *</label>
                <input
                  type="text"
                  name="station_name"
                  value={formData.station_name || ''}
                  onChange={handleChange}
                  required
                  placeholder="z.B. Berlin Hauptfiliale"
                  className={inputClass}
                  data-testid="station-name-input"
                />
              </div>
            </div>
          </div>

          {/* Adresse (immer sichtbar) */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Adresse
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Straße</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street || ''}
                  onChange={handleChange}
                  placeholder="z.B. Musterstraße 123"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>PLZ</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code || ''}
                  onChange={handleChange}
                  placeholder="z.B. 10115"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Stadt</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="z.B. Berlin"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bundesland</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  placeholder="z.B. Berlin"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Land</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  placeholder="z.B. Deutschland"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Kontakt (immer sichtbar) */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kontakt
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ansprechpartner</label>
                <input
                  type="text"
                  name="manager"
                  value={formData.manager || ''}
                  onChange={handleChange}
                  placeholder="z.B. Max Mustermann"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="z.B. kontakt@firma.de"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telefon</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="z.B. +49 30 123456"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Kategorie-spezifische Felder */}
          {categoryFields.length > 0 && (
            <div>
              <div 
                className={sectionHeaderClass}
                onClick={() => setShowCategoryFields(!showCategoryFields)}
              >
                <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {TENANT_CATEGORIES[selectedCategory].label}-spezifische Felder
                </h4>
                {showCategoryFields ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {showCategoryFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {categoryFields.map((field) => (
                    <div key={field.name}>
                      <label className={labelClass}>{field.label}</label>
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="">-- Auswählen --</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleChange}
                          placeholder={field.placeholder || ''}
                          className={inputClass}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Eigene Felder */}
          <div>
            <div 
              className={sectionHeaderClass}
              onClick={() => setShowCustomFields(!showCustomFields)}
            >
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Eigene Felder ({customFields.length})
              </h4>
              {showCustomFields ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>

            {showCustomFields && (
              <div className="mt-4 space-y-4">
                {/* Existierende eigene Felder */}
                {customFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field, index) => (
                      <div key={field.id} className="relative">
                        <label className={labelClass}>{field.name}</label>
                        <div className="flex gap-2">
                          <input
                            type={field.type}
                            value={field.value || ''}
                            onChange={(e) => handleCustomFieldChange(index, e.target.value)}
                            className={`${inputClass} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(index)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                            title="Feld entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Neues Feld hinzufügen */}
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-600 bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Feldname</label>
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="z.B. Kostenstelle"
                        className={inputClass}
                        data-testid="custom-field-name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Feldtyp</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value)}
                        className={inputClass}
                        data-testid="custom-field-type"
                      >
                        <option value="text">Text</option>
                        <option value="number">Zahl</option>
                        <option value="email">E-Mail</option>
                        <option value="tel">Telefon</option>
                        <option value="date">Datum</option>
                        <option value="url">URL</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addCustomField}
                        disabled={!newFieldName.trim()}
                        className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                          newFieldName.trim()
                            ? 'bg-[#d50c2d] text-white hover:bg-[#b80a28]'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        data-testid="add-custom-field-btn"
                      >
                        <Plus className="w-4 h-4" />
                        Feld hinzufügen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GPS Koordinaten (optional, einklappbar) */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              GPS-Koordinaten (optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude || ''}
                  onChange={handleChange}
                  placeholder="z.B. 52.520008"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude || ''}
                  onChange={handleChange}
                  placeholder="z.B. 13.404954"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Kommentare */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Notizen
            </h4>
            <div>
              <label className={labelClass}>Kommentar</label>
              <textarea
                name="it_comment"
                value={formData.it_comment || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Zusätzliche Informationen zum Standort..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-inherit pb-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-[#1f1f1f] hover:bg-[#333] text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              data-testid="location-modal-cancel"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log('[LocationModal] Submit button clicked');
                handleSubmit(e);
              }}
              className="flex-1 px-4 py-2 bg-[#d50c2d] text-white rounded-lg hover:bg-[#b80a28] transition-all text-sm font-medium"
              data-testid="location-modal-submit"
            >
              {editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationModal;
