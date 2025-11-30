import React from 'react';
import { Plus, Edit, Trash2, MapPin, Circle } from 'lucide-react';
import { Card } from './ui/card';

const LocationsTab = ({
  theme,
  locations,
  loadingLocations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation
}) => {
  const getStatusBadge = (location) => {
    // Mock status - in real app would come from data
    const isOnline = location.id_checker !== null;
    return (
      <div className="flex items-center gap-1">
        <Circle 
          className={`w-2 h-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} 
        />
        <span className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Standorte
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {locations.length} {locations.length === 1 ? 'Standort' : 'Standorte'}
          </p>
        </div>
        <button
          onClick={onAddLocation}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all"
        >
          <Plus className="w-4 h-4" />
          Standort hinzufügen
        </button>
      </div>

      {/* Locations Table */}
      <Card className={`rounded-xl overflow-hidden ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
      }`}>
        {loadingLocations ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Standorte vorhanden
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Code
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Stationsname
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Straße
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    PLZ
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Stadt
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Bundesland
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Telefon
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Telefon Intern
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    E-Mail
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Main Typ
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Manager
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Anzahl ID
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    SN-PC
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    SN-SC
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    TV-ID
                  </th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                {locations.map((location, index) => (
                  <tr
                    key={location.location_id}
                    className={`border-t cursor-pointer transition-colors ${
                      theme === 'dark' 
                        ? 'border-gray-700 hover:bg-[#1a1a1a]' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      {getStatusBadge(location)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {location.location_code}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.station_name}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.street || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.postal_code || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.city || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.state || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.phone || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.phone_internal || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.email || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.main_type || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.manager || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.id_checker || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.sn_pc || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.sn_sc || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.tv_id || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditLocation(location)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'hover:bg-[#1f1f1f] text-gray-400 hover:text-white'
                              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                          }`}
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLocation(location.location_id)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-400'
                              : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                          }`}
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LocationsTab;
