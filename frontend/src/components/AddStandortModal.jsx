import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';
import { getBundeslandOptions } from '../utils/bundesland';

const AddStandortModal = ({ onClose, onAdd }) => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    main_code: '',
    stationsname: '',
    plz: '',
    ort: '',
    str: '',
    telefon: '',
    telefon_intern: '',
    email: '',
    main_typ: 'Mietstation',
    mgr: '',
    bundesl: '',
    status: 'In Vorbereitung',
    lc_alt: '',
    id_checker: 0,
    switch: '',
    port: '',
    richtiges_vlan: '',
    it_kommentar: '',
    tsr_remarks: '',
    kommentar: '',
    customer: user?.company || ''
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.main_code.trim()) {
      toast.error('Bitte geben Sie einen Standort-Code ein');
      return;
    }
    if (!formData.stationsname.trim()) {
      toast.error('Bitte geben Sie einen Stationsnamen ein');
      return;
    }
    
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/customer-data/europcar-stations', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        toast.success('Standort erfolgreich hinzugefügt');
        if (onAdd) {
          onAdd(result.data?.station || formData);
        }
        onClose();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Hinzufügen');
      }
    } catch (error) {
      console.error('Add standort error:', error);
      toast.error('Fehler beim Hinzufügen des Standorts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c00000] rounded-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Neuen Standort hinzufügen
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Grundinformationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Standort-Code *
                </label>
                <input
                  type="text"
                  name="main_code"
                  value={formData.main_code}
                  onChange={handleChange}
                  placeholder="z.B. AAHC01"
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stationsname *
                </label>
                <input
                  type="text"
                  name="stationsname"
                  value={formData.stationsname}
                  onChange={handleChange}
                  placeholder="z.B. Berlin Mitte"
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Typ
                </label>
                <select
                  name="main_typ"
                  value={formData.main_typ}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                >
                  <option value="Mietstation">Mietstation</option>
                  <option value="Flughafen">Flughafen</option>
                  <option value="Hauptbahnhof">Hauptbahnhof</option>
                  <option value="City">City</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status
                </label>
                <input
                  type="text"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  placeholder="z.B. In Vorbereitung, READY"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Adresse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Straße
                </label>
                <input
                  type="text"
                  name="str"
                  value={formData.str}
                  onChange={handleChange}
                  placeholder="z.B. Hauptstraße 123"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  PLZ
                </label>
                <input
                  type="text"
                  name="plz"
                  value={formData.plz}
                  onChange={handleChange}
                  placeholder="z.B. 10115"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ort
                </label>
                <input
                  type="text"
                  name="ort"
                  value={formData.ort}
                  onChange={handleChange}
                  placeholder="z.B. Berlin"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bundesland
                </label>
                <select
                  name="bundesl"
                  value={formData.bundesl}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                >
                  <option value="">-- Bundesland wählen --</option>
                  {getBundeslandOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kontaktinformationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Telefon
                </label>
                <input
                  type="tel"
                  name="telefon"
                  value={formData.telefon}
                  onChange={handleChange}
                  placeholder="z.B. +49 30 12345678"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Telefon Intern
                </label>
                <input
                  type="tel"
                  name="telefon_intern"
                  value={formData.telefon_intern}
                  onChange={handleChange}
                  placeholder="Interne Telefonnummer"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="station@beispiel.de"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Manager
                </label>
                <input
                  type="text"
                  name="mgr"
                  value={formData.mgr}
                  onChange={handleChange}
                  placeholder="Name des Managers"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>
            </div>
          </div>

          {/* Technical Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Technische Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Switch
                </label>
                <input
                  type="text"
                  name="switch"
                  value={formData.switch}
                  onChange={handleChange}
                  placeholder="Switch-Bezeichnung"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Port
                </label>
                <input
                  type="text"
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="Port-Nummer"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  VLAN
                </label>
                <input
                  type="text"
                  name="richtiges_vlan"
                  value={formData.richtiges_vlan}
                  onChange={handleChange}
                  placeholder="VLAN-ID"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kommentare
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  IT-Kommentar
                </label>
                <textarea
                  name="it_kommentar"
                  value={formData.it_kommentar}
                  onChange={handleChange}
                  rows={2}
                  placeholder="IT-spezifische Notizen..."
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Allgemeiner Kommentar
                </label>
                <textarea
                  name="kommentar"
                  value={formData.kommentar}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Zusätzliche Notizen..."
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#c00000] hover:bg-[#a00000] text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Speichert...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Standort hinzufügen
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddStandortModal;
