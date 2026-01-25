import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, RefreshCw, CheckCircle, Clock, XCircle, ChevronDown, Filter, Monitor, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Status-Definitionen
const STATUSES = {
  active: { label: 'Aktiv', color: 'green', icon: CheckCircle, description: 'Standort ist in Betrieb' },
  in_preparation: { label: 'In Vorbereitung', color: 'yellow', icon: Clock, description: 'Neuer Standort wird eröffnet' },
  deactivated: { label: 'Deaktiviert', color: 'red', icon: XCircle, description: 'Standort ist geschlossen' }
};

const LocationLifecycleManager = ({ theme, selectedTenantId }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState([]);
  
  // Status change modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    active: 0,
    in_preparation: 0,
    deactivated: 0,
    total: 0
  });

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/locations/list?limit=500`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (cityFilter) {
        url += `&city=${encodeURIComponent(cityFilter)}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (selectedTenantId && selectedTenantId !== 'all') {
        url += `&tenant_id=${selectedTenantId}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLocations(data.locations || []);
        
        // Berechne Stats
        const newStats = {
          active: 0,
          in_preparation: 0,
          deactivated: 0,
          total: data.locations?.length || 0
        };
        data.locations?.forEach(loc => {
          if (newStats[loc.status] !== undefined) {
            newStats[loc.status]++;
          } else {
            newStats.active++; // Default
          }
        });
        setStats(newStats);

        // Extrahiere Städte für Filter
        const uniqueCities = [...new Set(data.locations?.map(l => l.city).filter(Boolean))].sort();
        setCities(uniqueCities);
      } else {
        toast.error('Fehler beim Laden der Standorte');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cityFilter, searchTerm, selectedTenantId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleStatusChange = async () => {
    if (!selectedLocation || !newStatus) return;

    setUpdating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/${selectedLocation.location_code}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowStatusModal(false);
        setSelectedLocation(null);
        setNewStatus('');
        setStatusReason('');
        fetchLocations();
      } else {
        toast.error(data.detail || 'Statusänderung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Verbindungsfehler');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (location) => {
    setSelectedLocation(location);
    setNewStatus(location.status || 'active');
    setStatusReason('');
    setShowStatusModal(true);
  };

  const getStatusBadge = (status) => {
    const config = STATUSES[status] || STATUSES.active;
    const Icon = config.icon;
    
    const colorClasses = {
      green: 'bg-green-500/20 text-green-500 border-green-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      red: 'bg-red-500/20 text-red-500 border-red-500/30'
    };

    return (
      <Badge 
        variant="outline" 
        className={`${colorClasses[config.color]} flex items-center gap-1.5 px-2 py-1`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredLocations = locations.filter(loc => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches = 
        loc.location_code?.toLowerCase().includes(search) ||
        loc.name?.toLowerCase().includes(search) ||
        loc.city?.toLowerCase().includes(search) ||
        loc.manager?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Standort-Lifecycle-Management
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie den Status Ihrer Standorte
          </p>
        </div>
        <Button 
          onClick={fetchLocations} 
          variant="outline" 
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${
            statusFilter === 'all' ? 'ring-2 ring-primary' : ''
          } ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.total}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all ${
            statusFilter === 'active' ? 'ring-2 ring-green-500' : ''
          } ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.active}
              </p>
              <p className="text-sm text-green-500">Aktiv</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all ${
            statusFilter === 'in_preparation' ? 'ring-2 ring-yellow-500' : ''
          } ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
          onClick={() => setStatusFilter(statusFilter === 'in_preparation' ? 'all' : 'in_preparation')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.in_preparation}
              </p>
              <p className="text-sm text-yellow-500">In Vorbereitung</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all ${
            statusFilter === 'deactivated' ? 'ring-2 ring-red-500' : ''
          } ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
          onClick={() => setStatusFilter(statusFilter === 'deactivated' ? 'all' : 'deactivated')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.deactivated}
              </p>
              <p className="text-sm text-red-500">Deaktiviert</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Suche nach Code, Name, Stadt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-primary`}
          />
        </div>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px]" data-testid="city-filter">
            <SelectValue placeholder="Stadt filtern..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Städte</SelectItem>
            {cities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Locations Table */}
      <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MapPin className={`w-12 h-12 mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Standorte gefunden
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Status</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Code</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Name</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Stadt</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Manager</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Geräte</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => (
                  <tr 
                    key={location.location_code}
                    className={`border-t ${
                      theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-100 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-4 py-3">
                      {getStatusBadge(location.status)}
                    </td>
                    <td className={`px-4 py-3 font-mono font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {location.location_code}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {location.name || '-'}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {location.city || '-'}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {location.manager || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Monitor className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          {location.device_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStatusModal(location)}
                        className="gap-1.5"
                        data-testid={`status-btn-${location.location_code}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Status ändern
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : ''}>
              Status ändern: {selectedLocation?.location_code}
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-gray-400' : ''}>
              {selectedLocation?.name} - {selectedLocation?.city}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Status */}
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Aktueller Status:
              </p>
              {getStatusBadge(selectedLocation?.status || 'active')}
            </div>

            {/* New Status Selection */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Neuer Status:
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="new-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUSES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`w-4 h-4 text-${config.color}-500`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newStatus && STATUSES[newStatus] && (
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {STATUSES[newStatus].description}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Begründung (optional):
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="z.B. Renovierung, Neueröffnung, Schließung..."
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}
                data-testid="status-reason-input"
              />
            </div>

            {/* Warning for deactivation */}
            {newStatus === 'deactivated' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-500">Achtung!</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Deaktivierte Standorte können keine neuen Aktivierungscodes erhalten.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusModal(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={updating || !newStatus || newStatus === selectedLocation?.status}
              className="bg-[#c00000] hover:bg-[#a00000] text-white"
              data-testid="confirm-status-change"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Status ändern'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationLifecycleManager;
