import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Monitor, Plus, Edit, Trash2, Save, X, MapPin, Wifi, Printer,
  CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const FastfoodTerminalManagement = ({ tenantId = 'default-tenant' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [terminals, setTerminals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  
  const [form, setForm] = useState({
    location_id: '',
    terminal_type: 'order_kiosk',
    name: '',
    ip_address: '',
    printer_enabled: false,
    printer_ip: ''
  });

  useEffect(() => {
    loadTerminals();
    loadLocations();
  }, []);

  const loadTerminals = async () => {
    try {
      const result = await apiCall(`/api/fastfood/terminals?tenant_id=${tenantId}`);
      if (result.success) {
        const data = result.data?.data || result.data || [];
        setTerminals(data);
      }
    } catch (error) {
      console.error('Error loading terminals:', error);
    }
  };

  const loadLocations = async () => {
    try {
      // Load from tenant hierarchy
      const result = await apiCall('/api/tenants-hierarchy/list');
      if (result.success) {
        const data = result.data?.data || result.data || {};
        const locs = data.tenants || [];
        setLocations(locs.filter(l => l.tenant_level === 'location'));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      // Fallback: create default location
      setLocations([{ id: 'default-location', name: 'Hauptstandort' }]);
    }
  };

  const handleSave = async () => {
    try {
      if (!form.name || !form.location_id) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      if (editingTerminal) {
        await apiCall(`/api/fastfood/terminals/${editingTerminal.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        toast.success('Terminal aktualisiert');
      } else {
        await apiCall(`/api/fastfood/terminals?tenant_id=${tenantId}`, {
          method: 'POST',
          body: JSON.stringify(form)
        });
        toast.success('Terminal registriert');
      }

      setShowModal(false);
      resetForm();
      loadTerminals();
    } catch (error) {
      console.error('Error saving terminal:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (terminalId) => {
    if (!window.confirm('Terminal wirklich löschen?')) return;
    
    try {
      await apiCall(`/api/fastfood/terminals/${terminalId}`, { method: 'DELETE' });
      toast.success('Terminal gelöscht');
      loadTerminals();
    } catch (error) {
      console.error('Error deleting terminal:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const resetForm = () => {
    setForm({
      location_id: '',
      terminal_type: 'order_kiosk',
      name: '',
      ip_address: '',
      printer_enabled: false,
      printer_ip: ''
    });
    setEditingTerminal(null);
  };

  const getTerminalTypeLabel = (type) => {
    const labels = {
      'order_kiosk': 'Bestellterminal',
      'kitchen_display': 'Küchendisplay',
      'customer_display': 'Kundendisplay',
      'admin': 'Admin-Terminal'
    };
    return labels[type] || type;
  };

  const getTerminalTypeIcon = (type) => {
    const icons = {
      'order_kiosk': '🖥️',
      'kitchen_display': '👨‍🍳',
      'customer_display': '📺',
      'admin': '⚙️'
    };
    return icons[type] || '💻';
  };

  const copyKioskUrl = (terminalId) => {
    const url = `${window.location.origin}/kiosk/${terminalId}`;
    navigator.clipboard.writeText(url);
    toast.success('URL kopiert!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Terminal-Verwaltung
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Bestellterminals, Küchen- und Kundendisplays verwalten
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4" />
          Terminal hinzufügen
        </Button>
      </div>

      {/* Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {terminals.map(terminal => {
          const location = locations.find(l => l.id === terminal.location_id);
          
          return (
            <Card
              key={terminal.id}
              className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}
            >
              {/* Terminal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">
                    {getTerminalTypeIcon(terminal.terminal_type)}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {terminal.name}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getTerminalTypeLabel(terminal.terminal_type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {terminal.active ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Terminal Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {location?.display_name || location?.name || 'Unbekannt'}
                  </span>
                </div>
                
                {terminal.ip_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi className="h-4 w-4 text-gray-500" />
                    <span className={`font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {terminal.ip_address}
                    </span>
                  </div>
                )}
                
                {terminal.printer_enabled && (
                  <div className="flex items-center gap-2 text-sm">
                    <Printer className="h-4 w-4 text-green-500" />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Drucker aktiviert
                      {terminal.printer_ip && <span className="font-mono ml-1">({terminal.printer_ip})</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Terminal URL (for kiosks) */}
              {terminal.terminal_type === 'order_kiosk' && (
                <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kiosk-URL:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className={`text-xs flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      /kiosk/{terminal.id}
                    </code>
                    <Button
                      onClick={() => copyKioskUrl(terminal.id)}
                      size="sm"
                      variant="outline"
                    >
                      Kopieren
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditingTerminal(terminal);
                    setForm({
                      location_id: terminal.location_id,
                      terminal_type: terminal.terminal_type,
                      name: terminal.name,
                      ip_address: terminal.ip_address || '',
                      printer_enabled: terminal.printer_enabled,
                      printer_ip: terminal.printer_ip || ''
                    });
                    setShowModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  onClick={() => handleDelete(terminal.id)}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {terminals.length === 0 && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Monitor className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Terminals
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Fügen Sie Ihr erstes Terminal hinzu
          </p>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className={`w-full max-w-2xl p-6 m-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingTerminal ? 'Terminal bearbeiten' : 'Neues Terminal'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Terminal-Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z.B. Kiosk 1"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Standort *
                </label>
                <select
                  value={form.location_id}
                  onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">-- Standort wählen --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.display_name || loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Terminal-Typ *
                </label>
                <select
                  value={form.terminal_type}
                  onChange={(e) => setForm({ ...form, terminal_type: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="order_kiosk">🖥️ Bestellterminal</option>
                  <option value="kitchen_display">👨‍🍳 Küchendisplay</option>
                  <option value="customer_display">📺 Kundendisplay</option>
                  <option value="admin">⚙️ Admin-Terminal</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  IP-Adresse
                </label>
                <input
                  type="text"
                  value={form.ip_address}
                  onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.printer_enabled}
                    onChange={(e) => setForm({ ...form, printer_enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Drucker aktiviert
                  </span>
                </label>
              </div>

              {form.printer_enabled && (
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Drucker IP-Adresse
                  </label>
                  <input
                    type="text"
                    value={form.printer_ip}
                    onChange={(e) => setForm({ ...form, printer_ip: e.target.value })}
                    placeholder="192.168.1.200"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                onClick={handleSave}
                className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FastfoodTerminalManagement;
