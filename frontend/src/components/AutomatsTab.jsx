import React from 'react';
import { Plus, Edit, Trash2, Lock } from 'lucide-react';

const AutomatsTab = ({ theme, automats, locations, onEdit, onDelete, onCreate, getStatusColor, getStatusLabel }) => {
  const getLocationName = (locationId) => {
    const location = locations.find(l => l.location_id === locationId);
    return location ? `${location.name}, ${location.city}` : locationId;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Automat
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automats.length === 0 ? (
          <div className={`col-span-full text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <Lock className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Automaten vorhanden
            </p>
          </div>
        ) : (
          automats.map((automat) => (
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
                      {getLocationName(automat.location_id)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onEdit(automat)}
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

                {automat.kiosk_ids && automat.kiosk_ids.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Zugeordnete Kiosks:
                    </span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {automat.kiosk_ids.length}
                    </span>
                  </div>
                )}

                {automat.ip_address && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      IP-Adresse:
                    </span>
                    <span className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {automat.ip_address}
                    </span>
                  </div>
                )}

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
          ))
        )}
      </div>
    </div>
  );
};

export default AutomatsTab;