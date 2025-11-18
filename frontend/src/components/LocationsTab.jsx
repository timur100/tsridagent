import React from 'react';
import { MapPin, Plus, Edit, Trash2, Phone, Mail, User, Building2, Map } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const LocationsTab = ({
  theme,
  locations,
  loadingLocations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation
}) => {
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

      {/* Placeholder Map */}
      <Card className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Karte
          </h4>
          <Map className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
        </div>
        <div className={`w-full h-96 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-100'}`}>
          <div className="text-center">
            <Map className={`w-16 h-16 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Kartenansicht (Google Maps Integration kommt später)
            </p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {locations.length > 0 && `${locations.length} Standorte markiert`}
            </p>
          </div>
        </div>
      </Card>

      {/* Locations List */}
      {loadingLocations ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
        </div>
      ) : locations.length === 0 ? (
        <Card className={`p-12 text-center rounded-xl ${theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'}`}>
          <MapPin className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Keine Standorte vorhanden
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Card
              key={location.location_id}
              className={`p-4 rounded-xl transition-all hover:shadow-lg ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] border-none hover:bg-[#333]'
                  : 'bg-white border border-gray-100 hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#c00000]/10">
                    <MapPin className="w-5 h-5 text-[#c00000]" />
                  </div>
                  <div>
                    <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.location_code}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {location.station_name}
                    </p>
                  </div>
                </div>
                {location.main_type && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {location.main_type}
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <Building2 className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {location.street}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {location.postal_code} {location.city}
                    </p>
                    {location.state && (
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {location.state}
                      </p>
                    )}
                  </div>
                </div>

                {location.manager && (
                  <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {location.manager}
                    </p>
                  </div>
                )}

                {location.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {location.phone}
                    </p>
                  </div>
                )}

                {location.email && (
                  <div className="flex items-center gap-2">
                    <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {location.email}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
                <button
                  onClick={() => onEditLocation(location)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1f1f1f] hover:bg-[#333] text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Edit className="w-3 h-3" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => onDeleteLocation(location.location_id)}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm transition-all ${
                    theme === 'dark'
                      ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationsTab;
