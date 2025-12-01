import React from 'react';
import { Plus, Edit, Trash2, Search, MapPin, Key } from 'lucide-react';

const KeysTab = ({
  theme,
  keys,
  locations,
  automats,
  keyTypes,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  locationFilter,
  setLocationFilter,
  onEdit,
  onDelete,
  onCreate,
  getKeyTypeIcon,
  getKeyTypeLabel,
  getStatusColor,
  getStatusLabel
}) => {
  const getLocationName = (locationId) => {
    const location = locations.find(l => l.location_id === locationId);
    return location ? location.name : locationId;
  };

  return (
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">Alle Typen</option>
            {keyTypes.map(kt => (
              <option key={kt.type_id} value={kt.name}>{kt.display_name}</option>
            ))}
          </select>
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
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">Alle Standorte</option>
            {locations.map(loc => (
              <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onCreate}
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
                Typ
              </th>
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
                Details
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
            {keys.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center">
                  <Key className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Keine Schlüssel gefunden
                  </p>
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr
                  key={key.key_id}
                  className={`${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center gap-2 text-[#c00000]">
                      {getKeyTypeIcon(key.key_type)}
                      <span className="text-xs">{getKeyTypeLabel(key.key_type)}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {key.key_number}
                  </td>
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {key.description}
                  </td>
                  <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationName(key.location_id)}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {key.key_type === 'car' && key.vehicle_plate && (
                      <div>🚗 {key.vehicle_plate}</div>
                    )}
                    {key.key_type === 'hotel' && key.room_number && (
                      <div>🏨 Zimmer {key.room_number}</div>
                    )}
                    {key.key_type === 'office' && '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 ${getStatusColor(key.status)}`}>
                      {getStatusLabel(key.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(key)}
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
                        onClick={() => onDelete(key.key_id)}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeysTab;