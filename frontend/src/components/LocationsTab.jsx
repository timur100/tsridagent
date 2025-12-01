import React from 'react';
import { Plus, Edit, Trash2, Globe, MapPin } from 'lucide-react';

const LocationsTab = ({ theme, locations, onEdit, onDelete, onCreate }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Standort
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.length === 0 ? (
          <div className={`col-span-full text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
            <Globe className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Standorte vorhanden
            </p>
          </div>
        ) : (
          locations.map((location) => (
            <div
              key={location.location_id}
              className={`p-6 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-[#c00000]" />
                  <div>
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.name}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {location.city}, {location.country}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(location)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#1a1a1a] text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(location.location_id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#1a1a1a] text-red-400'
                        : 'hover:bg-gray-100 text-red-600'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Adresse:</strong> {location.address}
                </div>
                {location.latitude && location.longitude && (
                  <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <strong>GPS:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationsTab;