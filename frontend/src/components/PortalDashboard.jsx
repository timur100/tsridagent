import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  MapPin, 
  Monitor, 
  Settings, 
  Users, 
  LogOut, 
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const PortalDashboard = () => {
  const { user, logout, apiCall, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'locations') {
        const result = await apiCall('/api/portal/locations/list');
        if (result.success) {
          setLocations(result.data.locations || []);
        }
      } else if (activeTab === 'devices') {
        const result = await apiCall('/api/portal/devices/list');
        if (result.success) {
          setDevices(result.data.devices || []);
        }
      } else if (activeTab === 'users' && isAdmin) {
        const result = await apiCall('/api/portal/users/list');
        if (result.success) {
          setUsers(result.data.users || []);
        }
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Standort wirklich löschen?')) return;
    
    const result = await apiCall(`/api/portal/locations/${locationId}`, {
      method: 'DELETE'
    });
    
    if (result.success) {
      toast.success('Standort gelöscht');
      loadData();
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const tabs = [
    { id: 'locations', label: 'Standorte', icon: MapPin },
    { id: 'devices', label: 'Geräte', icon: Monitor },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  if (isAdmin) {
    tabs.push({ id: 'users', label: 'Benutzer', icon: Users });
  }

  const filteredLocations = locations.filter(loc =>
    loc.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.location_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TSRID Portal</h1>
              <p className="text-sm text-gray-600">
                Willkommen, {user?.name} ({user?.role})
              </p>
            </div>
            <Button onClick={logout} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Standorte</h2>
                <p className="text-gray-600">Verwalten Sie Ihre Standorte</p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Neuer Standort
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Standorte durchsuchen..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Locations List */}
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations.map((location) => (
                  <Card key={location.location_id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {location.location_name}
                        </h3>
                        <p className="text-sm text-gray-600">{location.location_code}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        location.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📍 {location.street}</p>
                      <p>{location.zip} {location.city}</p>
                      <p>{location.country}</p>
                      {location.phone && <p>📞 {location.phone}</p>}
                      {location.email && <p>✉️ {location.email}</p>}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteLocation(location.location_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!loading && filteredLocations.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Keine Standorte gefunden</p>
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Geräte</h2>
                <p className="text-gray-600">Übersicht aller registrierten Geräte</p>
              </div>
              <Button onClick={loadData} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Aktualisieren
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Gerät
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Standort
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Letzte Aktivität
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {devices.map((device) => (
                      <tr key={device.device_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{device.device_id}</div>
                            <div className="text-sm text-gray-500">{device.station_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {device.location_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            device.status === 'online'
                              ? 'bg-green-100 text-green-800'
                              : device.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {device.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {device.last_seen ? new Date(device.last_seen).toLocaleString('de-DE') : 'Nie'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && devices.length === 0 && (
              <div className="text-center py-12">
                <Monitor className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Keine Geräte registriert</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Einstellungen</h2>
            <Card className="p-6">
              <p className="text-gray-600">Einstellungen werden hier angezeigt...</p>
            </Card>
          </div>
        )}

        {/* Users Tab (Admin only) */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Benutzer</h2>
                <p className="text-gray-600">Benutzerverwaltung</p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Neuer Benutzer
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        E-Mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Firma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Rolle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold font-mono text-gray-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.email} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalDashboard;
