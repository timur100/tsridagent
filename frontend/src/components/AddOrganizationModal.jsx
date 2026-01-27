import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';

const AddOrganizationModal = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    industry: 'retail',
    generate_hierarchy: true,
    countries: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const industries = [
    { value: 'retail', label: 'Einzelhandel (z.B. Rewe, Lidl)' },
    { value: 'automotive', label: 'Autovermietung (z.B. Europcar, Sixt)' },
    { value: 'sports', label: 'Sportartikel (z.B. Puma, Nike, Adidas)' },
    { value: 'logistics', label: 'Logistik (z.B. DHL, UPS)' },
    { value: 'hospitality', label: 'Gastronomie (z.B. McDonald\'s, Starbucks)' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  const suggestedCountries = {
    retail: ['Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Austria', 'Switzerland'],
    automotive: ['Germany', 'France', 'Spain', 'Italy', 'UK', 'USA', 'Australia'],
    sports: ['Germany', 'UK', 'France', 'Spain', 'Italy', 'USA', 'China', 'Japan'],
    logistics: ['Germany', 'USA', 'UK', 'France', 'China', 'India', 'Brazil'],
    hospitality: ['USA', 'Germany', 'UK', 'France', 'China', 'Japan', 'Australia'],
    custom: []
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Bitte geben Sie einen Organisationsnamen ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/organizations/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          display_name: formData.display_name || formData.name,
          industry: formData.industry,
          generate_hierarchy: formData.generate_hierarchy,
          countries: formData.countries.length > 0 ? formData.countries : suggestedCountries[formData.industry]
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess(result);
          handleClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Fehler beim Erstellen der Organisation');
      }
    } catch (err) {
      setError('Netzwerkfehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: '',
      display_name: '',
      industry: 'retail',
      generate_hierarchy: true,
      countries: []
    });
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const toggleCountry = (country) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className={`w-full max-w-2xl mx-4 ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Building2 className={`w-5 h-5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-600'}`} />
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Neue Organisation hinzufügen
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-1 rounded hover:bg-gray-700 transition-colors ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className={`text-xl font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Organisation erfolgreich erstellt!
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Die Hierarchie wird aufgebaut...
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Organisationsname *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Adidas, Nike, Rewe"
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Anzeigename (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                      placeholder="Wird in der Hierarchie angezeigt"
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Branche
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value, countries: []})}
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                    >
                      {industries.map(ind => (
                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="generate_hierarchy"
                      checked={formData.generate_hierarchy}
                      onChange={(e) => setFormData({...formData, generate_hierarchy: e.target.checked})}
                      className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                    />
                    <label htmlFor="generate_hierarchy" className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Automatisch Hierarchie generieren (Kontinente, Länder, Städte)
                    </label>
                  </div>
                </div>
              )}

              {/* Step 2: Countries */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-sm font-medium mb-3 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Länder auswählen (optional)
                    </h3>
                    <p className={`text-xs mb-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Standard-Länder basierend auf Branche "{industries.find(i => i.value === formData.industry)?.label}". 
                      Sie können diese anpassen.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {suggestedCountries[formData.industry].map(country => (
                        <label
                          key={country}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            formData.countries.includes(country) || formData.countries.length === 0
                              ? theme === 'dark' 
                                ? 'bg-[#c00000] bg-opacity-20' 
                                : 'bg-red-50'
                              : theme === 'dark'
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.countries.length === 0 || formData.countries.includes(country)}
                            onChange={() => toggleCountry(country)}
                            className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                          />
                          <span className={`text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {country}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Zurück
                  </button>
                )}
                <div className={`flex gap-2 ${step === 1 ? 'ml-auto' : ''}`}>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Abbrechen
                  </button>
                  {step === 1 ? (
                    <button
                      onClick={() => formData.generate_hierarchy ? setStep(2) : handleSubmit()}
                      disabled={!formData.name.trim() || loading}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        !formData.name.trim() || loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#c00000] hover:bg-[#a00000]'
                      } text-white`}
                    >
                      {formData.generate_hierarchy ? 'Weiter' : 'Erstellen'}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#c00000] hover:bg-[#a00000]'
                      } text-white`}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Erstelle...' : 'Organisation erstellen'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AddOrganizationModal;
