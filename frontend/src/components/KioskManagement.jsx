import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Edit, Trash2, Power, RefreshCw, Settings, AlertCircle, List, BarChart3, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const KioskManagement = ({ theme }) => {
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [kiosks, setKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState(null);

  useEffect(() => {
    loadKiosks();
  }, []);

  const loadKiosks = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/kiosks/list', { method: 'GET' });
      if (response.success) {
        setKiosks(response.data?.kiosks || []);
      }
    } catch (error) {
      console.error('Error loading kiosks:', error);
      toast.error('Fehler beim Laden der Kiosks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKiosk = () => {
    setEditingKiosk({
      name: '',
      location: '',
      status: 'offline',
      type: 'self-service',
      ip_address: '',
      last_seen: null
    });
    setShowModal(true);
  };

  const handleEditKiosk = (kiosk) => {
    setEditingKiosk(kiosk);
    setShowModal(true);
  };

  const handleSaveKiosk = async (kioskData) => {
    try {
      let response;
      if (kioskData.kiosk_id) {
        response = await apiCall(
          `/api/kiosks/update/${kioskData.kiosk_id}`,
          { method: 'PUT', body: kioskData }
        );
      } else {
        response = await apiCall('/api/kiosks/create', {
          method: 'POST',
          body: kioskData
        });
      }

      if (response.success) {
        toast.success(kioskData.kiosk_id ? 'Kiosk aktualisiert' : 'Kiosk erstellt');
        setShowModal(false);
        setEditingKiosk(null);
        await loadKiosks();
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error saving kiosk:', error);
      toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
    }
  };

  const handleDeleteKiosk = async (kioskId) => {
    if (!window.confirm('Kiosk wirklich löschen?')) return;

    try {
      const response = await apiCall(`/api/kiosks/delete/${kioskId}`, { method: 'DELETE' });
      if (response.success) {
        toast.success('Kiosk gelöscht');
        loadKiosks();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleRebootKiosk = async (kioskId) => {
    try {
      const response = await apiCall(`/api/kiosks/reboot/${kioskId}`, { method: 'POST' });
      if (response.success) {
        toast.success('Neustart-Befehl gesendet');
      }
    } catch (error) {
      toast.error('Fehler beim Neustart');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      case 'maintenance': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Wartung';
      case 'error': return 'Fehler';
      default: return 'Unbekannt';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'list', label: 'Kiosks', icon: List },
            { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
            { id: 'settings', label: 'Einstellungen', icon: Wrench }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#c00000] text-[#c00000]'
                    : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kiosk-Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie alle Kiosksysteme an verschiedenen Standorten
          </p>
        </div>
        <button
          onClick={handleCreateKiosk}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Kiosk
        </button>
      </div>

      {/* Kiosks Grid */}
      {kiosks.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Monitor className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Keine Kiosks vorhanden
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Erstellen Sie den ersten Kiosk für Ihr System
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kiosks.map((kiosk) => (
            <div
              key={kiosk.kiosk_id}
              className={`p-6 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Monitor className={`h-8 w-8 ${getStatusColor(kiosk.status)}`} />
                  <div>
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {kiosk.name}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {kiosk.location}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditKiosk(kiosk)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#1a1a1a] text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Bearbeiten"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteKiosk(kiosk.kiosk_id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#1a1a1a] text-red-400'
                        : 'hover:bg-gray-100 text-red-600'
                    }`}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status:
                  </span>
                  <span className={`text-sm font-semibold ${getStatusColor(kiosk.status)}`}>
                    {getStatusLabel(kiosk.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Typ:
                  </span>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {kiosk.type}
                  </span>
                </div>
                {kiosk.ip_address && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      IP:
                    </span>
                    <span className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {kiosk.ip_address}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                <button
                  onClick={() => handleRebootKiosk(kiosk.kiosk_id)}
                  disabled={kiosk.status === 'offline'}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    kiosk.status === 'offline'
                      ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-500'
                      : theme === 'dark'
                      ? 'bg-[#1a1a1a] text-gray-300 hover:bg-gray-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Neustart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <KioskEditorModal
          theme={theme}
          kiosk={editingKiosk}
          onSave={handleSaveKiosk}
          onClose={() => {
            setShowModal(false);
            setEditingKiosk(null);
          }}
        />
      )}
    </div>
  );
};

// Kiosk Editor Modal Component
const KioskEditorModal = ({ theme, kiosk, onSave, onClose }) => {
  const [formData, setFormData] = useState(kiosk);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {formData.kiosk_id ? 'Kiosk bearbeiten' : 'Neuer Kiosk'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="z.B. Kiosk Haupteingang"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Standort *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="z.B. Gebäude A, Erdgeschoss"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Typ
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="self-service">Self-Service</option>
                <option value="check-in">Check-In</option>
                <option value="information">Information</option>
                <option value="payment">Bezahlung</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Wartung</option>
                <option value="error">Fehler</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              IP-Adresse
            </label>
            <input
              type="text"
              value={formData.ip_address || ''}
              onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="z.B. 192.168.1.100"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors font-semibold"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#333333]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KioskManagement;
