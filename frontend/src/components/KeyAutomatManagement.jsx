import React, { useState, useEffect } from 'react';
import { Key, Plus, Edit, Trash2, Lock, Unlock, User, Building, Clock, AlertCircle, CheckCircle, Search, Filter, Calendar, MapPin, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const KeyAutomatManagement = ({ theme }) => {
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('keys'); // keys, automats, rentals, history
  const [keys, setKeys] = useState([
    {
      key_id: '1',
      key_number: 'K-001',
      description: 'Büro 301',
      location: 'Gebäude A',
      status: 'available',
      automat_id: 'automat-1',
      current_user: null,
      last_rental: '2025-01-15 14:30'
    },
    {
      key_id: '2',
      key_number: 'K-002',
      description: 'Lager Erdgeschoss',
      location: 'Gebäude B',
      status: 'rented',
      automat_id: 'automat-1',
      current_user: 'Max Mustermann',
      last_rental: '2025-01-20 09:15'
    },
    {
      key_id: '3',
      key_number: 'K-003',
      description: 'Serverraum',
      location: 'Gebäude A',
      status: 'maintenance',
      automat_id: 'automat-2',
      current_user: null,
      last_rental: '2025-01-10 16:45'
    }
  ]);

  const [automats, setAutomats] = useState([
    {
      automat_id: 'automat-1',
      name: 'Schlüsselautomat Haupteingang',
      location: 'Gebäude A, Erdgeschoss',
      status: 'online',
      total_slots: 50,
      occupied_slots: 32,
      ip_address: '192.168.1.50'
    },
    {
      automat_id: 'automat-2',
      name: 'Schlüsselautomat Parkhaus',
      location: 'Parkhaus, Ebene 1',
      status: 'online',
      total_slots: 30,
      occupied_slots: 18,
      ip_address: '192.168.1.51'
    }
  ]);

  const [rentals, setRentals] = useState([
    {
      rental_id: '1',
      key_number: 'K-002',
      user_name: 'Max Mustermann',
      user_id: 'user-123',
      rented_at: '2025-01-20 09:15',
      due_back: '2025-01-20 17:00',
      status: 'active'
    },
    {
      rental_id: '2',
      key_number: 'K-005',
      user_name: 'Anna Schmidt',
      user_id: 'user-456',
      rented_at: '2025-01-20 10:30',
      due_back: '2025-01-20 18:00',
      status: 'active'
    }
  ]);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [showAutomatModal, setShowAutomatModal] = useState(false);
  const [editingAutomat, setEditingAutomat] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'rented': return 'text-yellow-500';
      case 'maintenance': return 'text-red-500';
      case 'reserved': return 'text-blue-500';
      case 'online': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Verfügbar';
      case 'rented': return 'Ausgeliehen';
      case 'maintenance': return 'Wartung';
      case 'reserved': return 'Reserviert';
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'active': return 'Aktiv';
      case 'returned': return 'Zurückgegeben';
      case 'overdue': return 'Überfällig';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'rented': return <Lock className="h-4 w-4" />;
      case 'maintenance': return <AlertCircle className="h-4 w-4" />;
      default: return <Key className="h-4 w-4" />;
    }
  };

  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.key_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         key.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || key.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Schlüsselautomat
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Schlüssel, Automaten und Ausleihvorgänge
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'keys'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Key className="h-4 w-4" />
          Schlüssel
        </button>
        <button
          onClick={() => setActiveTab('automats')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'automats'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Lock className="h-4 w-4" />
          Automaten
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'rentals'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <User className="h-4 w-4" />
          Aktive Ausleihen
          {rentals.filter(r => r.status === 'active').length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[#c00000] text-white rounded-full">
              {rentals.filter(r => r.status === 'active').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-[#c00000] text-[#c00000]'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          Verlauf
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Schlüssel suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">Alle Status</option>
                <option value="available">Verfügbar</option>
                <option value="rented">Ausgeliehen</option>
                <option value="maintenance">Wartung</option>
              </select>
            </div>
            <button
              onClick={() => {
                setEditingKey({
                  key_number: '',
                  description: '',
                  location: '',
                  status: 'available',
                  automat_id: ''
                });
                setShowKeyModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neuer Schlüssel
            </button>
          </div>

          {/* Keys Table */}
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <tr className="font-mono text-xs">
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Schlüssel-Nr.
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Beschreibung
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Standort
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Aktueller Nutzer
                  </th>
                  <th className={`px-4 py-3 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm divide-y divide-gray-700">
                {filteredKeys.map((key) => (
                  <tr
                    key={key.key_id}
                    className={`${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-[#c00000]" />
                        {key.key_number}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {key.description}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {key.location}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${getStatusColor(key.status)}`}>
                        {getStatusIcon(key.status)}
                        {getStatusLabel(key.status)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {key.current_user || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingKey(key);
                            setShowKeyModal(true);
                          }}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Automats Tab */}
      {activeTab === 'automats' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingAutomat({
                  name: '',
                  location: '',
                  status: 'online',
                  total_slots: 50,
                  ip_address: ''
                });
                setShowAutomatModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neuer Automat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automats.map((automat) => (
              <div
                key={automat.automat_id}
                className={`p-6 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      automat.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {automat.name}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {automat.location}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAutomat(automat);
                      setShowAutomatModal(true);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#1a1a1a] text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Belegung
                      </span>
                      <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {automat.occupied_slots} / {automat.total_slots}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#c00000]"
                        style={{ width: `${(automat.occupied_slots / automat.total_slots) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      IP-Adresse:
                    </span>
                    <span className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {automat.ip_address}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status:
                    </span>
                    <span className={`text-sm font-semibold ${getStatusColor(automat.status)}`}>
                      {getStatusLabel(automat.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <div className="space-y-4">
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <tr className="font-mono text-xs">
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Schlüssel
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nutzer
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ausgeliehen
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rückgabe bis
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm divide-y divide-gray-700">
                {rentals.filter(r => r.status === 'active').map((rental) => (
                  <tr
                    key={rental.rental_id}
                    className={`${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-[#c00000]" />
                        {rental.key_number}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {rental.user_name}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {rental.rented_at}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {rental.due_back}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-yellow-500`}>
                        {getStatusLabel(rental.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                        >
                          <Unlock className="h-3 w-3" />
                          Zurückgeben
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={`p-12 text-center rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Clock className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verlauf-Ansicht
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Hier werden alle vergangenen Ausleihvorgänge angezeigt
          </p>
        </div>
      )}

      {/* Key Modal */}
      {showKeyModal && editingKey && (
        <KeyEditorModal
          theme={theme}
          keyData={editingKey}
          automats={automats}
          onSave={(data) => {
            console.log('Saving key:', data);
            setShowKeyModal(false);
            setEditingKey(null);
            toast.success('Schlüssel gespeichert');
          }}
          onClose={() => {
            setShowKeyModal(false);
            setEditingKey(null);
          }}
        />
      )}

      {/* Automat Modal */}
      {showAutomatModal && editingAutomat && (
        <AutomatEditorModal
          theme={theme}
          automatData={editingAutomat}
          onSave={(data) => {
            console.log('Saving automat:', data);
            setShowAutomatModal(false);
            setEditingAutomat(null);
            toast.success('Automat gespeichert');
          }}
          onClose={() => {
            setShowAutomatModal(false);
            setEditingAutomat(null);
          }}
        />
      )}
    </div>
  );
};

// Key Editor Modal
const KeyEditorModal = ({ theme, keyData, automats, onSave, onClose }) => {
  const [formData, setFormData] = useState(keyData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-xl p-6 max-w-2xl w-full ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {formData.key_id ? 'Schlüssel bearbeiten' : 'Neuer Schlüssel'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Schlüssel-Nummer *
            </label>
            <input
              type="text"
              value={formData.key_number}
              onChange={(e) => setFormData({ ...formData, key_number: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="z.B. K-001"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Beschreibung *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="z.B. Büro 301"
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
              placeholder="z.B. Gebäude A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <option value="available">Verfügbar</option>
                <option value="rented">Ausgeliehen</option>
                <option value="maintenance">Wartung</option>
                <option value="reserved">Reserviert</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Automat
              </label>
              <select
                value={formData.automat_id}
                onChange={(e) => setFormData({ ...formData, automat_id: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Automat wählen</option>
                {automats.map((automat) => (
                  <option key={automat.automat_id} value={automat.automat_id}>
                    {automat.name}
                  </option>
                ))}
              </select>
            </div>
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

// Automat Editor Modal
const AutomatEditorModal = ({ theme, automatData, onSave, onClose }) => {
  const [formData, setFormData] = useState(automatData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-xl p-6 max-w-2xl w-full ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {formData.automat_id ? 'Automat bearbeiten' : 'Neuer Automat'}
        </h3>

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
              placeholder="z.B. Schlüsselautomat Haupteingang"
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
                Anzahl Fächer
              </label>
              <input
                type="number"
                value={formData.total_slots}
                onChange={(e) => setFormData({ ...formData, total_slots: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                IP-Adresse
              </label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="192.168.1.50"
              />
            </div>
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

export default KeyAutomatManagement;
