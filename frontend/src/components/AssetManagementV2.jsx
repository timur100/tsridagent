import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Layers, Package, Cpu, Search, RefreshCw, Plus, Edit2, Trash2,
  ChevronRight, ChevronDown, Clock, CheckCircle, AlertCircle, XCircle,
  Building2, Monitor, Printer, Cable, Box, Filter, ExternalLink, History,
  ArrowRight, Unplug, Plug
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import TablePagination from './ui/TablePagination';
import TableSkeleton from './ui/TableSkeleton';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Status configurations
const LOCATION_STATUS_CONFIG = {
  active: { label: 'Aktiv', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  inactive: { label: 'Inaktiv', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
  planned: { label: 'Geplant', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  decommissioned: { label: 'Stillgelegt', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

const SLOT_STATUS_CONFIG = {
  empty: { label: 'Leer', color: 'bg-gray-500/20 text-gray-400', icon: Box },
  installed: { label: 'Installiert', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  maintenance: { label: 'Wartung', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle },
  reserved: { label: 'Reserviert', color: 'bg-blue-500/20 text-blue-400', icon: Clock }
};

const BUNDLE_STATUS_CONFIG = {
  in_storage: { label: 'Im Lager', color: 'bg-blue-500/20 text-blue-400', icon: Package },
  deployed: { label: 'Deployed', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  maintenance: { label: 'Wartung', color: 'bg-orange-500/20 text-orange-400', icon: AlertCircle },
  retired: { label: 'Ausgemustert', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

const ASSET_STATUS_CONFIG = {
  in_storage: { label: 'Im Lager', color: 'bg-blue-500/20 text-blue-400' },
  deployed: { label: 'Deployed', color: 'bg-green-500/20 text-green-500' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500/20 text-yellow-400' },
  maintenance: { label: 'Wartung', color: 'bg-orange-500/20 text-orange-400' },
  defective: { label: 'Defekt', color: 'bg-red-500/20 text-red-400' },
  retired: { label: 'Ausgemustert', color: 'bg-gray-500/20 text-gray-400' }
};

const ASSET_TYPE_CONFIG = {
  tablet: { label: 'Tablet', icon: Monitor },
  scanner: { label: 'Scanner', icon: Monitor },
  dock: { label: 'Docking Station', icon: Layers },
  psu: { label: 'Netzteil', icon: Plug },
  cable: { label: 'Kabel', icon: Cable },
  switch: { label: 'Switch', icon: Box },
  router: { label: 'Router', icon: Box },
  other: { label: 'Sonstiges', icon: Box }
};

const EVENT_TYPE_COLORS = {
  created: 'bg-blue-500',
  assigned_to_bundle: 'bg-purple-500',
  removed_from_bundle: 'bg-orange-500',
  installed: 'bg-green-500',
  uninstalled: 'bg-yellow-500',
  replaced: 'bg-red-500',
  maintenance: 'bg-orange-500',
  status_change: 'bg-gray-500',
  note: 'bg-gray-400'
};

/**
 * AssetManagementV2 - Multi-level asset management for TSRID rollout
 */
const AssetManagementV2 = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('locations');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Data states
  const [locations, setLocations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [assets, setAssets] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    country: 'all',
    status: 'all',
    type: 'all',
    search: '',
    location_id: '',
    bundle_id: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    locations: { page: 1, total: 0 },
    slots: { page: 1, total: 0 },
    bundles: { page: 1, total: 0 },
    assets: { page: 1, total: 0 }
  });
  const pageSize = 50;
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [createType, setCreateType] = useState('');
  const [formData, setFormData] = useState({});
  
  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    customers: [],
    types: []
  });

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.locations.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (filters.country && filters.country !== 'all') params.append('country', filters.country);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/locations?${params}`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        setPagination(prev => ({ ...prev, locations: { ...prev.locations, total: data.total } }));
        if (data.filters) {
          setFilterOptions(prev => ({
            ...prev,
            countries: data.filters.countries || [],
            customers: data.filters.customers || []
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching locations:', e);
      toast.error('Fehler beim Laden der Locations');
    } finally {
      setLoading(false);
    }
  }, [filters.country, filters.status, filters.search, pagination.locations.page]);

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.slots.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (filters.country && filters.country !== 'all') params.append('country', filters.country);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.location_id) params.append('location_id', filters.location_id);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/slots?${params}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots);
        setPagination(prev => ({ ...prev, slots: { ...prev.slots, total: data.total } }));
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
      toast.error('Fehler beim Laden der Slots');
    } finally {
      setLoading(false);
    }
  }, [filters.country, filters.status, filters.search, filters.location_id, pagination.slots.page]);

  // Fetch bundles
  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.bundles.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (filters.country && filters.country !== 'all') params.append('country', filters.country);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/bundles?${params}`);
      const data = await res.json();
      if (data.success) {
        setBundles(data.bundles);
        setPagination(prev => ({ ...prev, bundles: { ...prev.bundles, total: data.total } }));
      }
    } catch (e) {
      console.error('Error fetching bundles:', e);
      toast.error('Fehler beim Laden der Bundles');
    } finally {
      setLoading(false);
    }
  }, [filters.country, filters.status, filters.search, pagination.bundles.page]);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.assets.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (filters.country && filters.country !== 'all') params.append('country', filters.country);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      if (filters.bundle_id) params.append('bundle_id', filters.bundle_id);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/assets?${params}`);
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
        setPagination(prev => ({ ...prev, assets: { ...prev.assets, total: data.total } }));
        if (data.filters) {
          setFilterOptions(prev => ({ ...prev, types: data.filters.types || [] }));
        }
      }
    } catch (e) {
      console.error('Error fetching assets:', e);
      toast.error('Fehler beim Laden der Assets');
    } finally {
      setLoading(false);
    }
  }, [filters.country, filters.status, filters.type, filters.search, filters.bundle_id, pagination.assets.page]);

  // Load data based on active tab
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    switch (activeTab) {
      case 'locations': fetchLocations(); break;
      case 'slots': fetchSlots(); break;
      case 'bundles': fetchBundles(); break;
      case 'assets': fetchAssets(); break;
    }
  }, [activeTab, fetchLocations, fetchSlots, fetchBundles, fetchAssets]);

  // Reset filters when tab changes
  useEffect(() => {
    setFilters({ country: 'all', status: 'all', type: 'all', search: '', location_id: '', bundle_id: '' });
    setPagination(prev => ({
      ...prev,
      [activeTab]: { page: 1, total: prev[activeTab]?.total || 0 }
    }));
  }, [activeTab]);

  // Open create modal
  const openCreateModal = (type) => {
    setCreateType(type);
    setFormData({});
    setShowCreateModal(true);
  };

  // Open detail modal
  const openDetailModal = async (type, id) => {
    try {
      let endpoint = '';
      switch (type) {
        case 'location': endpoint = `/api/asset-mgmt/locations/${id}`; break;
        case 'slot': endpoint = `/api/asset-mgmt/slots/${id}`; break;
        case 'bundle': endpoint = `/api/asset-mgmt/bundles/${id}`; break;
        case 'asset': endpoint = `/api/asset-mgmt/assets/${id}`; break;
      }
      
      const res = await fetch(`${BACKEND_URL}${endpoint}`);
      const data = await res.json();
      if (data.success) {
        setSelectedItem({ type, data: data[type] || data.location || data.slot || data.bundle || data.asset });
        setShowDetailModal(true);
      }
    } catch (e) {
      toast.error('Fehler beim Laden der Details');
    }
  };

  // Handle create
  const handleCreate = async () => {
    try {
      let endpoint = '';
      switch (createType) {
        case 'location': endpoint = '/api/asset-mgmt/locations'; break;
        case 'slot': endpoint = '/api/asset-mgmt/slots'; break;
        case 'bundle': endpoint = '/api/asset-mgmt/bundles'; break;
        case 'asset': endpoint = '/api/asset-mgmt/assets'; break;
      }
      
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${createType} erstellt`);
        setShowCreateModal(false);
        fetchStats();
        switch (createType) {
          case 'location': fetchLocations(); break;
          case 'slot': fetchSlots(); break;
          case 'bundle': fetchBundles(); break;
          case 'asset': fetchAssets(); break;
        }
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen');
      }
    } catch (e) {
      toast.error('Fehler beim Erstellen');
    }
  };

  // Handle delete
  const handleDelete = async (type, id) => {
    if (!window.confirm(`${type} ${id} wirklich löschen?`)) return;
    
    try {
      let endpoint = '';
      switch (type) {
        case 'location': endpoint = `/api/asset-mgmt/locations/${id}`; break;
        case 'slot': endpoint = `/api/asset-mgmt/slots/${id}`; break;
        case 'bundle': endpoint = `/api/asset-mgmt/bundles/${id}`; break;
        case 'asset': endpoint = `/api/asset-mgmt/assets/${id}`; break;
      }
      
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`${type} gelöscht`);
        setShowDetailModal(false);
        fetchStats();
        switch (type) {
          case 'location': fetchLocations(); break;
          case 'slot': fetchSlots(); break;
          case 'bundle': fetchBundles(); break;
          case 'asset': fetchAssets(); break;
        }
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Render status badge
  const StatusBadge = ({ status, config }) => {
    const cfg = config[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };
    return (
      <Badge variant="outline" className={cfg.color}>
        {cfg.label}
      </Badge>
    );
  };

  // Render statistics cards
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Locations</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{stats?.locations?.total || 0}</p>
            <p className="text-xs text-green-500">{stats?.locations?.active || 0} aktiv</p>
          </div>
        </div>
      </Card>
      
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
            <Layers className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Slots</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{stats?.slots?.total || 0}</p>
            <p className="text-xs text-green-500">{stats?.slots?.installed || 0} installiert</p>
          </div>
        </div>
      </Card>
      
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
            <Package className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Bundles</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{stats?.bundles?.total || 0}</p>
            <p className="text-xs text-green-500">{stats?.bundles?.deployed || 0} deployed</p>
          </div>
        </div>
      </Card>
      
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
            <Cpu className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Assets</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{stats?.assets?.total || 0}</p>
            <p className="text-xs text-green-500">{stats?.assets?.deployed || 0} deployed</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // Render filters
  const Filters = () => (
    <div className="flex gap-3 flex-wrap mb-4">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <Input
            placeholder="Suchen..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={`pl-10 ${inputBg}`}
          />
        </div>
      </div>
      
      {filterOptions.countries.length > 0 && (
        <Select value={filters.country} onValueChange={(v) => setFilters(prev => ({ ...prev, country: v }))}>
          <SelectTrigger className={`w-[150px] ${inputBg}`}>
            <SelectValue placeholder="Land" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Länder</SelectItem>
            {filterOptions.countries.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
        <SelectTrigger className={`w-[150px] ${inputBg}`}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          {activeTab === 'locations' && Object.entries(LOCATION_STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
          {activeTab === 'slots' && Object.entries(SLOT_STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
          {activeTab === 'bundles' && Object.entries(BUNDLE_STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
          {activeTab === 'assets' && Object.entries(ASSET_STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {activeTab === 'assets' && (
        <Select value={filters.type} onValueChange={(v) => setFilters(prev => ({ ...prev, type: v }))}>
          <SelectTrigger className={`w-[150px] ${inputBg}`}>
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(ASSET_TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  // Render Locations Table
  const LocationsTable = () => (
    <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">Location ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Land</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Kunde</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Stadt</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Slots</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr 
                key={loc.location_id} 
                className={`border-t cursor-pointer hover:bg-opacity-50 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => openDetailModal('location', loc.location_id)}
              >
                <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : ''}`}>{loc.location_id}</td>
                <td className="px-4 py-3">{loc.country}</td>
                <td className="px-4 py-3">{loc.customer}</td>
                <td className="px-4 py-3">{loc.city || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-500 font-medium">{loc.installed_count}</span>
                  <span className={isDark ? 'text-gray-500' : 'text-gray-400'}> / {loc.slot_count}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={loc.status} config={LOCATION_STATUS_CONFIG} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); openDetailModal('location', loc.location_id); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {locations.length === 0 && !loading && (
        <div className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine Locations gefunden</p>
        </div>
      )}
    </div>
  );

  // Render Slots Table
  const SlotsTable = () => (
    <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">Slot ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Bundle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">TeamViewer</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Installiert</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr 
                key={slot.slot_id} 
                className={`border-t cursor-pointer hover:bg-opacity-50 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => openDetailModal('slot', slot.slot_id)}
              >
                <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : ''}`}>{slot.slot_id}</td>
                <td className="px-4 py-3">
                  <span className="text-blue-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); openDetailModal('location', slot.location_id); }}>
                    {slot.location_id}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {slot.bundle_id ? (
                    <span className="text-purple-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); openDetailModal('bundle', slot.bundle_id); }}>
                      {slot.bundle_id}
                    </span>
                  ) : (
                    <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
                  )}
                </td>
                <td className="px-4 py-3">{slot.teamviewer_alias || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={slot.status} config={SLOT_STATUS_CONFIG} />
                </td>
                <td className="px-4 py-3">
                  {slot.installed_at ? new Date(slot.installed_at).toLocaleDateString('de-DE') : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {slots.length === 0 && !loading && (
        <div className="p-8 text-center">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine Slots gefunden</p>
        </div>
      )}
    </div>
  );

  // Render Bundles Table
  const BundlesTable = () => (
    <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">Bundle ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Land</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Assets</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Installiert in</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Erstellt</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {bundles.map(bundle => (
              <tr 
                key={bundle.bundle_id} 
                className={`border-t cursor-pointer hover:bg-opacity-50 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => openDetailModal('bundle', bundle.bundle_id)}
              >
                <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : ''}`}>{bundle.bundle_id}</td>
                <td className="px-4 py-3">{bundle.country}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline">{bundle.asset_count || 0}</Badge>
                </td>
                <td className="px-4 py-3">
                  {bundle.installed_slot ? (
                    <span className="text-green-500">{bundle.installed_slot}</span>
                  ) : (
                    <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Nicht installiert</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={bundle.status} config={BUNDLE_STATUS_CONFIG} />
                </td>
                <td className="px-4 py-3">
                  {bundle.created_at ? new Date(bundle.created_at).toLocaleDateString('de-DE') : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bundles.length === 0 && !loading && (
        <div className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine Bundles gefunden</p>
        </div>
      )}
    </div>
  );

  // Render Assets Table
  const AssetsTable = () => (
    <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">Asset ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Typ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Hersteller SN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Bundle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Location</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => {
              const typeConfig = ASSET_TYPE_CONFIG[asset.type] || ASSET_TYPE_CONFIG.other;
              const TypeIcon = typeConfig.icon;
              return (
                <tr 
                  key={asset.asset_id} 
                  className={`border-t cursor-pointer hover:bg-opacity-50 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => openDetailModal('asset', asset.asset_id)}
                >
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : ''}`}>{asset.asset_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      {typeConfig.label}
                    </div>
                  </td>
                  <td className="px-4 py-3">{asset.manufacturer_sn || '-'}</td>
                  <td className="px-4 py-3">
                    {asset.bundle_id ? (
                      <span className="text-purple-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); openDetailModal('bundle', asset.bundle_id); }}>
                        {asset.bundle_id}
                      </span>
                    ) : (
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {asset.location_id ? (
                      <span className="text-blue-500">{asset.location_id}</span>
                    ) : (
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={asset.status} config={ASSET_STATUS_CONFIG} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="ghost">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {assets.length === 0 && !loading && (
        <div className="p-8 text-center">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine Assets gefunden</p>
        </div>
      )}
    </div>
  );

  // Render Asset History Timeline
  const AssetHistoryTimeline = ({ history }) => {
    if (!history || history.length === 0) {
      return (
        <div className="p-4 text-center">
          <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Keine Historie</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {history.map((event, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-400'}`} />
              {idx < history.length - 1 && <div className={`w-0.5 flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
            </div>
            <div className="flex-1 pb-3">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : ''}`}>{event.event}</p>
              <div className="flex flex-wrap gap-2 text-xs mt-1">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  {new Date(event.date).toLocaleString('de-DE')}
                </span>
                {event.technician && (
                  <span className="text-blue-500">• {event.technician}</span>
                )}
                {event.slot_id && (
                  <span className="text-purple-500">• Slot: {event.slot_id}</span>
                )}
              </div>
              {event.notes && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{event.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Detail Modal Content
  const DetailModalContent = () => {
    if (!selectedItem) return null;
    const { type, data } = selectedItem;
    
    switch (type) {
      case 'location':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Location ID</p>
                <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{data.location_id}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                <StatusBadge status={data.status} config={LOCATION_STATUS_CONFIG} />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Land</p>
                <p>{data.country}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kunde</p>
                <p>{data.customer}</p>
              </div>
              <div className="col-span-2">
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Adresse</p>
                <p>{data.address || '-'}, {data.zip_code} {data.city}</p>
              </div>
            </div>
            
            {data.slots && data.slots.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>
                  Slots ({data.slots.length})
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {data.slots.map(slot => (
                    <div 
                      key={slot.slot_id}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${isDark ? 'bg-[#1a1a1a] hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => openDetailModal('slot', slot.slot_id)}
                    >
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{slot.slot_id}</p>
                        {slot.bundle_id && <p className="text-xs text-purple-500">Bundle: {slot.bundle_id}</p>}
                      </div>
                      <StatusBadge status={slot.status} config={SLOT_STATUS_CONFIG} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'slot':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Slot ID</p>
                <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{data.slot_id}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                <StatusBadge status={data.status} config={SLOT_STATUS_CONFIG} />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Location</p>
                <span 
                  className="text-blue-500 cursor-pointer"
                  onClick={() => openDetailModal('location', data.location_id)}
                >
                  {data.location_id}
                </span>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>TeamViewer</p>
                <p>{data.teamviewer_alias || '-'}</p>
              </div>
              {data.installed_at && (
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Installiert am</p>
                  <p>{new Date(data.installed_at).toLocaleString('de-DE')}</p>
                </div>
              )}
            </div>
            
            {data.bundle && (
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Installiertes Bundle</h4>
                <Card 
                  className={`p-4 cursor-pointer ${cardBg}`}
                  onClick={() => openDetailModal('bundle', data.bundle.bundle_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{data.bundle.bundle_id}</p>
                      <p className="text-xs text-gray-500">{data.bundle.assets?.length || 0} Assets</p>
                    </div>
                    <StatusBadge status={data.bundle.status} config={BUNDLE_STATUS_CONFIG} />
                  </div>
                </Card>
              </div>
            )}
          </div>
        );
        
      case 'bundle':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bundle ID</p>
                <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{data.bundle_id}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                <StatusBadge status={data.status} config={BUNDLE_STATUS_CONFIG} />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Land</p>
                <p>{data.country}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Erstellt</p>
                <p>{data.created_at ? new Date(data.created_at).toLocaleDateString('de-DE') : '-'}</p>
              </div>
            </div>
            
            {data.slot && (
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Installation</h4>
                <Card 
                  className={`p-4 cursor-pointer ${cardBg}`}
                  onClick={() => openDetailModal('slot', data.slot.slot_id)}
                >
                  <p className={`font-medium ${isDark ? 'text-white' : ''}`}>Slot: {data.slot.slot_id}</p>
                  <p className="text-xs text-blue-500">Location: {data.slot.location_id}</p>
                </Card>
              </div>
            )}
            
            {data.assets && data.assets.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>
                  Assets ({data.assets.length})
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {data.assets.map(asset => {
                    const typeConfig = ASSET_TYPE_CONFIG[asset.type] || ASSET_TYPE_CONFIG.other;
                    const TypeIcon = typeConfig.icon;
                    return (
                      <div 
                        key={asset.asset_id}
                        className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${isDark ? 'bg-[#1a1a1a] hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}
                        onClick={() => openDetailModal('asset', asset.asset_id)}
                      >
                        <div className="flex items-center gap-3">
                          <TypeIcon className="h-4 w-4" />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{asset.asset_id}</p>
                            <p className="text-xs text-gray-500">{typeConfig.label} • {asset.manufacturer_sn || 'Keine SN'}</p>
                          </div>
                        </div>
                        <StatusBadge status={asset.status} config={ASSET_STATUS_CONFIG} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'asset':
        const typeConfig = ASSET_TYPE_CONFIG[data.type] || ASSET_TYPE_CONFIG.other;
        const TypeIcon = typeConfig.icon;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Asset ID</p>
                <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{data.asset_id}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                <StatusBadge status={data.status} config={ASSET_STATUS_CONFIG} />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Typ</p>
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4" />
                  <span>{typeConfig.label}</span>
                </div>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hersteller SN</p>
                <p>{data.manufacturer_sn || '-'}</p>
              </div>
              {data.imei && (
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IMEI</p>
                  <p>{data.imei}</p>
                </div>
              )}
              {data.mac && (
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>MAC</p>
                  <p>{data.mac}</p>
                </div>
              )}
            </div>
            
            {/* Relations */}
            <div className="grid grid-cols-3 gap-3">
              {data.bundle && (
                <Card 
                  className={`p-3 cursor-pointer text-center ${cardBg}`}
                  onClick={() => openDetailModal('bundle', data.bundle.bundle_id)}
                >
                  <Package className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bundle</p>
                  <p className="font-medium text-sm">{data.bundle.bundle_id}</p>
                </Card>
              )}
              {data.slot && (
                <Card 
                  className={`p-3 cursor-pointer text-center ${cardBg}`}
                  onClick={() => openDetailModal('slot', data.slot.slot_id)}
                >
                  <Layers className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Slot</p>
                  <p className="font-medium text-sm">{data.slot.slot_id}</p>
                </Card>
              )}
              {data.location && (
                <Card 
                  className={`p-3 cursor-pointer text-center ${cardBg}`}
                  onClick={() => openDetailModal('location', data.location.location_id)}
                >
                  <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Location</p>
                  <p className="font-medium text-sm">{data.location.location_id}</p>
                </Card>
              )}
            </div>
            
            {/* History Timeline */}
            <div>
              <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                <History className="h-4 w-4" />
                Historie
              </h4>
              <AssetHistoryTimeline history={data.history} />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Render Create Modal Content
  const CreateModalContent = () => {
    switch (createType) {
      case 'location':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Location ID *</label>
                <Input
                  value={formData.location_id || ''}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  placeholder="z.B. BERE01"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Land *</label>
                <Input
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="z.B. DE"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kunde</label>
                <Input
                  value={formData.customer || ''}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  placeholder="z.B. Europcar"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'planned'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className={inputBg}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Adresse</label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straße und Hausnummer"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">PLZ</label>
                <Input
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stadt</label>
                <Input
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={inputBg}
                />
              </div>
            </div>
          </div>
        );
        
      case 'slot':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Slot ID *</label>
                <Input
                  value={formData.slot_id || ''}
                  onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
                  placeholder="z.B. BERE01-01"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location ID *</label>
                <Input
                  value={formData.location_id || ''}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  placeholder="z.B. BERE01"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">TeamViewer Alias</label>
                <Input
                  value={formData.teamviewer_alias || ''}
                  onChange={(e) => setFormData({ ...formData, teamviewer_alias: e.target.value })}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'empty'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className={inputBg}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SLOT_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Position/Beschreibung</label>
                <Input
                  value={formData.position_description || ''}
                  onChange={(e) => setFormData({ ...formData, position_description: e.target.value })}
                  placeholder="z.B. Counter 1, links"
                  className={inputBg}
                />
              </div>
            </div>
          </div>
        );
        
      case 'bundle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Bundle ID *</label>
                <Input
                  value={formData.bundle_id || ''}
                  onChange={(e) => setFormData({ ...formData, bundle_id: e.target.value })}
                  placeholder="z.B. BDL-DE-001"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Land *</label>
                <Input
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="z.B. DE"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'in_storage'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className={inputBg}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUNDLE_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputBg}
                />
              </div>
            </div>
          </div>
        );
        
      case 'asset':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Asset ID *</label>
                <Input
                  value={formData.asset_id || ''}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  placeholder="z.B. TAB-DE-001"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Typ *</label>
                <Select value={formData.type || 'tablet'} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className={inputBg}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Hersteller SN</label>
                <Input
                  value={formData.manufacturer_sn || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer_sn: e.target.value })}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">IMEI</label>
                <Input
                  value={formData.imei || ''}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">MAC Adresse</label>
                <Input
                  value={formData.mac || ''}
                  onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Land</label>
                <Input
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="z.B. DE"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bundle ID (optional)</label>
                <Input
                  value={formData.bundle_id || ''}
                  onChange={(e) => setFormData({ ...formData, bundle_id: e.target.value })}
                  placeholder="z.B. BDL-DE-001"
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'in_storage'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className={inputBg}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>Asset Management</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Multi-Level Struktur für TSRID Rollout
          </p>
        </div>
        <Button 
          onClick={() => openCreateModal(activeTab.slice(0, -1))} 
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neu {activeTab === 'locations' ? 'Location' : activeTab === 'slots' ? 'Slot' : activeTab === 'bundles' ? 'Bundle' : 'Asset'}
        </Button>
      </div>

      {/* Statistics */}
      <StatsCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Slots
          </TabsTrigger>
          <TabsTrigger value="bundles" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Bundles
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Filters />

        {/* Content */}
        {loading ? (
          <TableSkeleton rows={10} columns={7} theme={theme} />
        ) : (
          <>
            <TabsContent value="locations"><LocationsTable /></TabsContent>
            <TabsContent value="slots"><SlotsTable /></TabsContent>
            <TabsContent value="bundles"><BundlesTable /></TabsContent>
            <TabsContent value="assets"><AssetsTable /></TabsContent>
          </>
        )}

        {/* Pagination */}
        {!loading && (
          <div className="mt-4">
            <TablePagination
              currentPage={pagination[activeTab]?.page || 1}
              totalPages={Math.ceil((pagination[activeTab]?.total || 0) / pageSize)}
              totalItems={pagination[activeTab]?.total || 0}
              pageSize={pageSize}
              onPageChange={(page) => setPagination(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], page } }))}
              theme={theme}
            />
          </div>
        )}
      </Tabs>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Neue {createType === 'location' ? 'Location' : createType === 'slot' ? 'Slot' : createType === 'bundle' ? 'Bundle' : 'Asset'}
            </DialogTitle>
          </DialogHeader>
          <CreateModalContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} className="bg-[#c00000] hover:bg-[#a00000] text-white">Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-2xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.type === 'location' && <MapPin className="h-5 w-5 text-blue-500" />}
              {selectedItem?.type === 'slot' && <Layers className="h-5 w-5 text-purple-500" />}
              {selectedItem?.type === 'bundle' && <Package className="h-5 w-5 text-orange-500" />}
              {selectedItem?.type === 'asset' && <Cpu className="h-5 w-5 text-green-500" />}
              {selectedItem?.data?.location_id || selectedItem?.data?.slot_id || selectedItem?.data?.bundle_id || selectedItem?.data?.asset_id}
            </DialogTitle>
          </DialogHeader>
          <DetailModalContent />
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => handleDelete(
                selectedItem?.type, 
                selectedItem?.data?.location_id || selectedItem?.data?.slot_id || selectedItem?.data?.bundle_id || selectedItem?.data?.asset_id
              )}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetManagementV2;
