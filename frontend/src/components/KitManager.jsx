import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Plus, Search, RefreshCw, MapPin, Trash2, ChevronRight, Check, Box, Tablet, Printer, Monitor, ArrowRight, Building2, Users, Settings } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import TableExportImport from './ui/TableExportImport';
import TableColumnSettings from './ui/TableColumnSettings';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

// Default column configuration for Kits
const DEFAULT_KIT_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false },
  { id: 'kit_name', label: 'Kit-Name', visible: true, sortable: true },
  { id: 'tenant', label: 'Tenant', visible: true, sortable: true },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'location', label: 'Standort', visible: true, sortable: true },
  { id: 'devices_count', label: 'Geräte', visible: true, sortable: true },
  { id: 'created_at', label: 'Erstellt', visible: false, sortable: true },
  { id: 'deployed_at', label: 'Installiert', visible: false, sortable: true },
  { id: 'actions', label: 'Aktionen', visible: true, sortable: false },
];

const KIT_STATUSES = {
  assembled: { label: 'Zusammengestellt', color: 'blue' },
  deployed: { label: 'Installiert', color: 'green' },
  returned: { label: 'Zurückgegeben', color: 'yellow' },
  disassembled: { label: 'Aufgelöst', color: 'red' }
};

const DEVICE_ICONS = {
  scanner: Monitor,
  computer: Tablet,
  printer: Printer,
  docking: Box,
  network: Monitor,
  other: Box
};

const KitManager = ({ theme }) => {
  const [kits, setKits] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('kitColumns');
    return saved ? JSON.parse(saved) : DEFAULT_KIT_COLUMNS;
  });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  
  // Create form data
  const [createForm, setCreateForm] = useState({
    tenant_id: '',
    location_code: '',
    device_number: 1,
    description: '',
    selectedDevices: []
  });
  
  // Deploy form data
  const [deployForm, setDeployForm] = useState({
    tenant_id: '',
    location_code: '',
    location_name: '',
    notes: ''
  });
  
  // Location selection
  const [locations, setLocations] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-200';

  // Fetch functions
  const fetchKits = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/device-lifecycle/kits/list?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setKits(data.kits || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tenants`);
      const data = await res.json();
      if (data.success) setTenants(data.tenants || []);
    } catch (e) { console.error(e); }
  };

  const fetchAvailableDevices = async () => {
    try {
      // Fetch devices that are in storage and not in a kit
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/list?status=in_storage&limit=500`);
      const data = await res.json();
      if (data.success) {
        // Filter out devices already in a kit
        const available = (data.devices || []).filter(d => !d.kit_id);
        setAvailableDevices(available);
      }
    } catch (e) { console.error(e); }
  };

  const fetchCities = async (tenantId) => {
    if (!tenantId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/unified-locations/cities?country=Deutschland&tenant_id=${tenantId}`);
      const data = await res.json();
      if (data.success) setCities(data.cities || []);
    } catch (e) { console.error(e); }
  };

  const fetchLocations = async (city, tenantId) => {
    if (!city || !tenantId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/unified-locations/by-city?city=${encodeURIComponent(city)}&country=Deutschland&tenant_id=${tenantId}`);
      const data = await res.json();
      if (data.success) setLocations(data.locations || []);
    } catch (e) { console.error(e); }
  };

  const fetchNextDeviceNumber = async (locationCode) => {
    if (!locationCode) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/locations/${locationCode}/next-device-number`);
      const data = await res.json();
      if (data.success) {
        setCreateForm(prev => ({
          ...prev,
          device_number: data.next_device_number,
          location_code: locationCode
        }));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchKits(); fetchTenants(); fetchAvailableDevices(); }, [fetchKits]);

  // Handlers
  const handleCreateKit = async () => {
    if (!createForm.tenant_id || !createForm.location_code) {
      toast.error('Bitte Kunde und Standort auswählen');
      return;
    }
    
    try {
      const kit_name = `${createForm.location_code}-${String(createForm.device_number).padStart(2, '0')}-KIT`;
      
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/kits/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_name,
          tenant_id: createForm.tenant_id,
          location_code: createForm.location_code,
          device_number: createForm.device_number,
          description: createForm.description,
          device_ids: createForm.selectedDevices
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Kit "${data.kit_name}" erstellt`);
        setShowCreateModal(false);
        setCreateForm({ tenant_id: '', location_code: '', device_number: 1, description: '', selectedDevices: [] });
        setSelectedCity('');
        setLocations([]);
        fetchKits();
        fetchAvailableDevices();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen');
      }
    } catch (e) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleDeployKit = async () => {
    if (!deployForm.location_code) {
      toast.error('Bitte Standort auswählen');
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/kits/${selectedKit.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployForm)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowDeployModal(false);
        setDeployForm({ tenant_id: '', location_code: '', location_name: '', notes: '' });
        fetchKits();
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (e) {
      toast.error('Fehler beim Installieren');
    }
  };

  const handleReturnKit = async (kit) => {
    if (!window.confirm(`Kit "${kit.kit_name}" zurückgeben?`)) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/kits/${kit.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Manuell zurückgegeben' })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchKits();
      }
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const handleDeleteKit = async (kit) => {
    if (!window.confirm(`Kit "${kit.kit_name}" löschen? Geräte werden NICHT gelöscht.`)) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/kits/${kit.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowDetailModal(false);
        fetchKits();
        fetchAvailableDevices();
      }
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const toggleDeviceSelection = (deviceId) => {
    setCreateForm(prev => ({
      ...prev,
      selectedDevices: prev.selectedDevices.includes(deviceId)
        ? prev.selectedDevices.filter(id => id !== deviceId)
        : [...prev.selectedDevices, deviceId]
    }));
  };

  const getStatusBadge = (status) => {
    const cfg = KIT_STATUSES[status] || KIT_STATUSES.assembled;
    const colors = {
      green: 'bg-green-500/20 text-green-500 border-green-500/30',
      blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      red: 'bg-red-500/20 text-red-500 border-red-500/30'
    };
    return <Badge variant="outline" className={`${colors[cfg.color]} px-2 py-1`}>{cfg.label}</Badge>;
  };

  const filteredKits = kits.filter(kit => 
    !searchTerm || 
    kit.kit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kit.location_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated kits
  const paginatedKits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredKits.slice(startIndex, startIndex + pageSize);
  }, [filteredKits, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredKits.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedKits.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedKits.map(k => k.id)));
    }
  };

  const toggleSelectKit = (kitId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(kitId)) {
      newSelected.delete(kitId);
    } else {
      newSelected.add(kitId);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async (importedData) => {
    console.log('Imported kits:', importedData);
    toast.success(`${importedData.length} Kits bereit zum Import`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>Kit-Verwaltung</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen und verwalten Sie Hardware-Sets für Standorte
          </p>
        </div>
        <div className="flex gap-2">
          <TableExportImport
            data={filteredKits}
            columns={columns}
            filename="kits"
            onImport={handleImport}
            selectedIds={selectedIds}
            idField="id"
          />
          <TableColumnSettings
            columns={columns}
            onColumnsChange={setColumns}
            storageKey="kitColumns"
            defaultColumns={DEFAULT_KIT_COLUMNS}
          />
          <Button onClick={() => { fetchKits(); fetchAvailableDevices(); }} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={() => { setShowCreateModal(true); fetchAvailableDevices(); }} className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Neues Kit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{kits.length}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gesamt</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{kits.filter(k => k.status === 'deployed').length}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Installiert</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Box className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{kits.filter(k => k.status === 'assembled').length}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bereit</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <RefreshCw className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{kits.filter(k => k.status === 'returned').length}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Zurückgegeben</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kit suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${inputBg}`}
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={`w-[180px] ${inputBg}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(KIT_STATUSES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kits Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredKits.length === 0 ? (
        <Card className={`p-12 text-center ${cardBg}`}>
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {searchTerm ? 'Keine Kits gefunden' : 'Noch keine Kits erstellt'}
          </p>
          <Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Erstes Kit erstellen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKits.map((kit) => (
            <Card 
              key={kit.id} 
              className={`p-4 cursor-pointer hover:shadow-lg transition-all ${cardBg} hover:border-primary/50`}
              onClick={() => { setSelectedKit(kit); setShowDetailModal(true); }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`text-lg font-bold font-mono ${isDark ? 'text-white' : ''}`}>
                    {kit.kit_name}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Standort: {kit.location_code}
                  </p>
                </div>
                {getStatusBadge(kit.status)}
              </div>
              
              {kit.assigned_location_name && (
                <div className={`flex items-center gap-2 text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="truncate">{kit.assigned_location_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {kit.device_count || 0} Geräte
                </span>
              </div>
              
              {kit.devices && kit.devices.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {kit.devices.slice(0, 4).map((dev, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-muted rounded">
                      {dev.device_type?.replace('_', ' ')}
                    </span>
                  ))}
                  {kit.devices.length > 4 && (
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      +{kit.devices.length - 4}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 mt-auto pt-2">
                {kit.status === 'assembled' && (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); setSelectedKit(kit); setShowDeployModal(true); fetchCities(kit.tenant_id); }}
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Installieren
                  </Button>
                )}
                {kit.status === 'deployed' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleReturnKit(kit); }}
                  >
                    Zurückgeben
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Kit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={`max-w-3xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Neues Kit erstellen
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Kunde (Tenant)
              </label>
              <Select 
                value={createForm.tenant_id} 
                onValueChange={(v) => {
                  setCreateForm(prev => ({ ...prev, tenant_id: v, location_code: '' }));
                  setSelectedCity('');
                  setLocations([]);
                  fetchCities(v);
                }}
              >
                <SelectTrigger className={inputBg}>
                  <SelectValue placeholder="Kunden wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.tenant_id} value={t.tenant_id}>{t.display_name || t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Selection */}
            {createForm.tenant_id && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Stadt
                </label>
                <Select 
                  value={selectedCity} 
                  onValueChange={(v) => {
                    setSelectedCity(v);
                    fetchLocations(v, createForm.tenant_id);
                  }}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Stadt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Location Selection */}
            {selectedCity && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Standort
                </label>
                <Select 
                  value={createForm.location_code} 
                  onValueChange={(v) => {
                    const loc = locations.find(l => l.station_code === v);
                    setCreateForm(prev => ({ ...prev, location_code: v }));
                    fetchNextDeviceNumber(v);
                  }}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Standort wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.station_code} value={l.station_code}>
                        {l.station_code} - {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Kit Name Preview */}
            {createForm.location_code && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Kit-Name:</p>
                <p className="text-xl font-mono font-bold text-primary">
                  {createForm.location_code}-{String(createForm.device_number).padStart(2, '0')}-KIT
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung (optional)</label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="z.B. Standard-Scanner-Setup"
                className={inputBg}
              />
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Geräte hinzufügen ({createForm.selectedDevices.length} ausgewählt)</label>
              {availableDevices.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Keine verfügbaren Geräte im Lager. Erstellen Sie zuerst Geräte.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableDevices.map(device => (
                    <div
                      key={device.id}
                      onClick={() => toggleDeviceSelection(device.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        createForm.selectedDevices.includes(device.id)
                          ? 'border-primary bg-primary/10'
                          : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {createForm.selectedDevices.includes(device.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : ''}`}>
                            {device.serial_number}
                          </p>
                          <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {device.device_type?.replace('_', ' ')} - {device.model || 'Unbekannt'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateKit} disabled={!createForm.location_code}>
              Kit erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Kit Modal */}
      <Dialog open={showDeployModal} onOpenChange={setShowDeployModal}>
        <DialogContent className={isDark ? 'bg-[#1a1a1a] text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Kit installieren: {selectedKit?.kit_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* City Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stadt</label>
              <Select 
                value={selectedCity} 
                onValueChange={(v) => {
                  setSelectedCity(v);
                  fetchLocations(v, selectedKit?.tenant_id);
                }}
              >
                <SelectTrigger className={inputBg}>
                  <SelectValue placeholder="Stadt wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Selection */}
            {selectedCity && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Standort</label>
                <Select 
                  value={deployForm.location_code} 
                  onValueChange={(v) => {
                    const loc = locations.find(l => l.station_code === v);
                    setDeployForm(prev => ({ 
                      ...prev, 
                      location_code: v,
                      location_name: loc?.name || '',
                      tenant_id: selectedKit?.tenant_id 
                    }));
                  }}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Standort wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.station_code} value={l.station_code}>
                        {l.station_code} - {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notizen (optional)</label>
              <Input
                value={deployForm.notes}
                onChange={(e) => setDeployForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="z.B. Installiert von Techniker XY"
                className={inputBg}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleDeployKit} disabled={!deployForm.location_code}>
              Installieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-2xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {selectedKit?.kit_name}
              </span>
              {selectedKit && getStatusBadge(selectedKit.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedKit && (
            <div className="space-y-4 py-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Standort-Code</p>
                  <p className="font-medium">{selectedKit.location_code}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Geräte-Nr.</p>
                  <p className="font-medium">{selectedKit.device_number}</p>
                </div>
                {selectedKit.assigned_location_name && (
                  <div className="col-span-2">
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Installiert an</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {selectedKit.assigned_location_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Devices */}
              <div>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>
                  Enthaltene Geräte ({selectedKit.devices?.length || 0})
                </p>
                {selectedKit.devices && selectedKit.devices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedKit.devices.map(dev => (
                      <div key={dev.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{dev.serial_number}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {dev.device_type?.replace('_', ' ')} - {dev.model}
                            </p>
                          </div>
                          <Badge variant="outline">{dev.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Keine Geräte zugewiesen
                  </p>
                )}
              </div>

              {/* Deployment History */}
              {selectedKit.deployment_history && selectedKit.deployment_history.length > 0 && (
                <div>
                  <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>
                    Einsatz-Historie
                  </p>
                  <div className="space-y-2">
                    {selectedKit.deployment_history.map((entry, i) => (
                      <div key={i} className={`p-2 rounded text-sm ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="flex justify-between">
                          <span className="font-medium">{entry.action === 'deployed' ? 'Installiert' : 'Zurückgegeben'}</span>
                          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                            {new Date(entry.timestamp).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        {entry.location_name && <p className="text-xs text-muted-foreground">{entry.location_name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteKit(selectedKit)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Kit löschen
            </Button>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KitManager;
