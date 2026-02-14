import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Layers, Package, Cpu, Search, RefreshCw, Plus, Edit2, Trash2,
  ChevronRight, ChevronDown, Clock, CheckCircle, AlertCircle, XCircle,
  Building2, Monitor, Printer, Cable, Box, Filter, ExternalLink, History,
  ArrowRight, Unplug, Plug, Link2, LinkIcon, Smartphone, Wifi, WifiOff,
  PackageOpen
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import TablePagination from './ui/TablePagination';
import TableSkeleton from './ui/TableSkeleton';
import GoodsReceiptWorkflow from './GoodsReceiptWorkflow';
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

// Erweiterte Asset-Typ-Konfiguration mit ID-Suffix
// Format: [device_id]-[TYP]-[MODELL] z.B. AAHC01-01-TAB-SP4
const ASSET_TYPE_CONFIG = {
  // Tablets
  tab_sp4: { label: 'Surface Pro 4', icon: Monitor, category: 'Tablets', suffix: 'TAB-SP4' },
  tab_sp6: { label: 'Surface Pro 6', icon: Monitor, category: 'Tablets', suffix: 'TAB-SP6' },
  tab_tsr: { label: 'TSRID Tablet', icon: Monitor, category: 'Tablets', suffix: 'TAB-TSR' },
  // Scanner
  sca_tsr: { label: 'TSRID Scanner', icon: Monitor, category: 'Scanner', suffix: 'SCA-TSR' },
  sca_dsk: { label: 'Desko Scanner', icon: Monitor, category: 'Scanner', suffix: 'SCA-DSK' },
  // Tablet Docking Stations
  tdo_qer: { label: 'Quer Dock (Surface)', icon: Layers, category: 'Tablet Docks', suffix: 'TDO-QER' },
  tdo_tsr: { label: 'TSRID Tablet Dock', icon: Layers, category: 'Tablet Docks', suffix: 'TDO-TSR' },
  // Scanner Docking Stations
  sdo_dsk: { label: 'Desko Scanner Dock', icon: Layers, category: 'Scanner Docks', suffix: 'SDO-DSK' },
  sdo_tsr: { label: 'TSRID Scanner Dock', icon: Layers, category: 'Scanner Docks', suffix: 'SDO-TSR' },
  // Tablet Netzteile
  tps_spx: { label: 'Surface Netzteil', icon: Plug, category: 'Tablet PSU', suffix: 'TPS-SPX' },
  tps_tsr: { label: 'TSRID Tablet Netzteil', icon: Plug, category: 'Tablet PSU', suffix: 'TPS-TSR' },
  // Scanner Netzteile
  sps_dsk: { label: 'Desko Scanner Netzteil', icon: Plug, category: 'Scanner PSU', suffix: 'SPS-DSK' },
  sps_tsr: { label: 'TSRID Scanner Netzteil', icon: Plug, category: 'Scanner PSU', suffix: 'SPS-TSR' },
  // Extensions
  usb: { label: 'USB Extension', icon: Cable, category: 'Extensions', suffix: 'USB' },
  lan: { label: 'LAN Extension', icon: Cable, category: 'Extensions', suffix: 'LAN' },
  '12v': { label: '12V Extension', icon: Cable, category: 'Extensions', suffix: '12V' },
  // Kabel Typ A (mit Seriennummer-Tracking)
  cab_usb_a: { label: 'USB-A Kabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-USBA' },
  cab_usb_c: { label: 'USB-C Kabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-USBC' },
  cab_lan: { label: 'LAN-Kabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-LAN' },
  cab_hdmi: { label: 'HDMI-Kabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-HDMI' },
  cab_dp: { label: 'DP-Kabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-DP' },
  cab_pwr: { label: 'Stromkabel (mit SN)', icon: Cable, category: 'Kabel (Typ A)', suffix: 'CAB-PWR' },
  // Kabel Typ B (Verbrauchsmaterial ohne SN)
  cns_usb_a: { label: 'USB-A Kabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-USBA' },
  cns_usb_c: { label: 'USB-C Kabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-USBC' },
  cns_lan: { label: 'LAN-Kabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-LAN' },
  cns_hdmi: { label: 'HDMI-Kabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-HDMI' },
  cns_dp: { label: 'DP-Kabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-DP' },
  cns_pwr: { label: 'Stromkabel (Verbrauch)', icon: Cable, category: 'Kabel (Typ B)', suffix: 'CNS-PWR' },
  // Adapter
  adp_usb_c: { label: 'USB-C Adapter/Hub', icon: Cable, category: 'Adapter', suffix: 'ADP-USBC' },
  adp_hdmi: { label: 'HDMI Adapter', icon: Cable, category: 'Adapter', suffix: 'ADP-HDMI' },
  adp_dp: { label: 'DisplayPort Adapter', icon: Cable, category: 'Adapter', suffix: 'ADP-DP' },
  adp_90: { label: '90° Adapter', icon: Cable, category: 'Adapter', suffix: 'ADP-90' },
  // Stromverteiler
  pwr_strip: { label: 'Netzleiste', icon: Plug, category: 'Stromverteiler', suffix: 'PWR-STRIP' },
  pwr_12v: { label: '12V Verteiler', icon: Plug, category: 'Stromverteiler', suffix: 'PWR-12V' },
  // Kits
  kit_sfd: { label: 'Surface + Desko Kit', icon: Package, category: 'Kits', suffix: 'KIT-SFD' },
  kit_tsr: { label: 'TSRID Kit', icon: Package, category: 'Kits', suffix: 'KIT-TSR' },
  // Sonstiges
  other: { label: 'Sonstiges', icon: Box, category: 'Sonstiges', suffix: 'OTH' }
};

const MANUFACTURER_OPTIONS = [
  { value: 'Microsoft', label: 'Microsoft' },
  { value: 'Desko', label: 'Desko' },
  { value: 'Regula', label: 'Regula' },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'Lenovo', label: 'Lenovo' },
  { value: 'HP', label: 'HP' },
  { value: 'Dell', label: 'Dell' },
  { value: 'Anker', label: 'Anker' },
  { value: 'Belkin', label: 'Belkin' },
  { value: 'Ugreen', label: 'Ugreen' },
  { value: 'TSRID', label: 'TSRID' },
  { value: 'Other', label: 'Sonstiger' }
];

const WARRANTY_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard-Garantie' },
  { value: 'extended', label: 'Erweiterte Garantie' },
  { value: 'on_site', label: 'Vor-Ort-Service' },
  { value: 'next_business_day', label: 'Next Business Day' },
  { value: 'none', label: 'Keine Garantie' }
];

const LICENSE_TYPE_OPTIONS = [
  { value: 'perpetual', label: 'Dauerlizenz' },
  { value: 'subscription', label: 'Abo-Lizenz' },
  { value: 'oem', label: 'OEM-Lizenz' },
  { value: 'volume', label: 'Volumenlizenz' },
  { value: 'none', label: 'Keine Lizenz' }
];

const EVENT_TYPE_COLORS = {
  created: 'bg-blue-500',
  assigned_to_bundle: 'bg-purple-500',
  removed_from_bundle: 'bg-orange-500',
  installed: 'bg-green-500',
  uninstalled: 'bg-yellow-500',
  replaced: 'bg-red-500',
  maintenance: 'bg-orange-500',
  status_change: 'bg-gray-500',
  license_activated: 'bg-cyan-500',
  license_expired: 'bg-red-600',
  note: 'bg-gray-400'
};

/**
 * AssetManagementV2 - Multi-level asset management for TSRID rollout
 */
const AssetManagementV2 = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('goods-receipt');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Data states
  const [locations, setLocations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [assets, setAssets] = useState([]);
  
  // Device-Import states
  const [devices, setDevices] = useState([]);
  const [deviceStats, setDeviceStats] = useState({ total_devices: 0, with_asset: 0, without_asset: 0 });
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [deviceFilter, setDeviceFilter] = useState('all'); // 'all', 'yes' (has asset), 'no' (no asset)
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [deviceToLink, setDeviceToLink] = useState(null);
  const [createAssetForm, setCreateAssetForm] = useState({
    asset_type: 'tab_tsr',  // TSRID Tablet als Standard
    manufacturer: '',
    model: '',
    purchase_date: '',
    warranty_months: '',
    warranty_type: '',
    notes: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    country: 'all',
    status: 'all',
    type: 'all',
    search: '',
    location_id: '',
    bundle_id: '',
    tenant_id: 'all'
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    locations: { page: 1, total: 0 },
    slots: { page: 1, total: 0 },
    bundles: { page: 1, total: 0 },
    assets: { page: 1, total: 0 },
    devices: { page: 1, total: 0 }
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
    types: [],
    tenant_ids: []
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

  // Fetch devices with asset status
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.devices.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (deviceFilter && deviceFilter !== 'all') params.append('has_asset', deviceFilter);
      if (filters.tenant_id && filters.tenant_id !== 'all') params.append('tenant_id', filters.tenant_id);
      if (filters.search) params.append('search', filters.search);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/devices/all?${params}`);
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
        setDeviceStats(data.stats || { total_devices: 0, with_asset: 0, without_asset: 0 });
        setPagination(prev => ({ ...prev, devices: { ...prev.devices, total: data.total } }));
        if (data.filters?.tenant_ids) {
          setFilterOptions(prev => ({ ...prev, tenant_ids: data.filters.tenant_ids }));
        }
      }
    } catch (e) {
      console.error('Error fetching devices:', e);
      toast.error('Fehler beim Laden der Geräte');
    } finally {
      setLoading(false);
    }
  }, [deviceFilter, filters.tenant_id, filters.search, pagination.devices.page]);

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
      case 'devices': fetchDevices(); break;
    }
  }, [activeTab, fetchLocations, fetchSlots, fetchBundles, fetchAssets, fetchDevices]);

  // Reset filters when tab changes
  useEffect(() => {
    setFilters({ country: 'all', status: 'all', type: 'all', search: '', location_id: '', bundle_id: '', tenant_id: 'all' });
    setSelectedDevices(new Set());
    setDeviceFilter('all');
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

  // Create asset from device
  const handleCreateAssetFromDevice = async () => {
    if (!deviceToLink) return;
    
    try {
      // Calculate warranty end date if months provided
      let additional_data = {
        manufacturer: createAssetForm.manufacturer,
        model: createAssetForm.model,
        notes: createAssetForm.notes,
        warranty_type: createAssetForm.warranty_type
      };
      
      if (createAssetForm.purchase_date && createAssetForm.warranty_months) {
        const purchaseDate = new Date(createAssetForm.purchase_date);
        purchaseDate.setMonth(purchaseDate.getMonth() + parseInt(createAssetForm.warranty_months));
        additional_data.warranty_until = purchaseDate.toISOString().split('T')[0];
        additional_data.purchase_date = createAssetForm.purchase_date;
      }
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/devices/${deviceToLink.device_id}/create-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceToLink.device_id,
          asset_type: createAssetForm.asset_type,
          additional_data
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Asset ${data.asset_id} erstellt`);
        setShowCreateAssetModal(false);
        setDeviceToLink(null);
        setCreateAssetForm({
          asset_type: 'tsrid_tablet',
          manufacturer: '',
          model: '',
          purchase_date: '',
          warranty_months: '',
          warranty_type: '',
          notes: ''
        });
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen');
      }
    } catch (e) {
      console.error('Error creating asset:', e);
      toast.error('Fehler beim Erstellen des Assets');
    }
  };

  // Bulk create assets from selected devices
  const handleBulkCreateAssets = async () => {
    if (selectedDevices.size === 0) {
      toast.error('Keine Geräte ausgewählt');
      return;
    }
    
    if (!window.confirm(`${selectedDevices.size} Assets erstellen?`)) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/devices/bulk-create-assets?asset_type=tsrid_tablet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.from(selectedDevices))
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.summary.success} Assets erstellt, ${data.summary.errors} Fehler`);
        setSelectedDevices(new Set());
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.detail || 'Fehler beim Bulk-Erstellen');
      }
    } catch (e) {
      console.error('Error bulk creating assets:', e);
      toast.error('Fehler beim Bulk-Erstellen');
    }
  };

  // Toggle device selection
  const toggleDeviceSelection = (deviceId) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  // Select all unlinked devices on current page
  const selectAllUnlinkedDevices = () => {
    const unlinked = devices.filter(d => !d.asset_id);
    if (selectedDevices.size === unlinked.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(unlinked.map(d => d.device_id)));
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
              <th className="px-4 py-3 text-left text-xs font-semibold">Hersteller</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Seriennummer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Bundle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Location</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Garantie</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => {
              const typeConfig = ASSET_TYPE_CONFIG[asset.type] || ASSET_TYPE_CONFIG.other;
              const TypeIcon = typeConfig.icon;
              const warrantyExpired = asset.warranty_until && new Date(asset.warranty_until) < new Date();
              const warrantyExpiringSoon = asset.warranty_until && !warrantyExpired && 
                new Date(asset.warranty_until) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
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
                      <span className="text-sm">{typeConfig.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{asset.manufacturer || '-'}</td>
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
                    {asset.warranty_until ? (
                      <span className={`text-xs px-2 py-1 rounded ${
                        warrantyExpired ? 'bg-red-500/20 text-red-500' : 
                        warrantyExpiringSoon ? 'bg-yellow-500/20 text-yellow-500' : 
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {warrantyExpired ? 'Abgelaufen' : 
                         warrantyExpiringSoon ? 'Läuft ab' : 
                         new Date(asset.warranty_until).toLocaleDateString('de-DE')}
                      </span>
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

  // Render Devices Table (Device-Import Tab)
  const DevicesTable = () => {
    const unlinkedOnPage = devices.filter(d => !d.asset_id);
    const allUnlinkedSelected = unlinkedOnPage.length > 0 && unlinkedOnPage.every(d => selectedDevices.has(d.device_id));
    
    return (
      <div className="space-y-4">
        {/* Device Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className={`p-4 ${cardBg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Smartphone className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt Geräte</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{deviceStats.total_devices}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-4 ${cardBg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                <Link2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mit Asset</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{deviceStats.with_asset}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-4 ${cardBg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ohne Asset</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>{deviceStats.without_asset}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <Input
                placeholder="Device-ID, Location, SN suchen..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className={`pl-10 ${inputBg}`}
              />
            </div>
          </div>
          
          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className={`w-[180px] ${inputBg}`}>
              <SelectValue placeholder="Asset-Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Geräte</SelectItem>
              <SelectItem value="no">Ohne Asset</SelectItem>
              <SelectItem value="yes">Mit Asset</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedDevices.size > 0 && (
            <Button 
              onClick={handleBulkCreateAssets}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {selectedDevices.size} Assets erstellen
            </Button>
          )}
        </div>

        {/* Table */}
        <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold w-10">
                    <Checkbox 
                      checked={allUnlinkedSelected}
                      onCheckedChange={selectAllUnlinkedDevices}
                      disabled={unlinkedOnPage.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Device-ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Asset-ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Stadt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">SN-PC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">SN-SC</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr 
                    key={device.device_id} 
                    className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-3">
                      {!device.asset_id && (
                        <Checkbox 
                          checked={selectedDevices.has(device.device_id)}
                          onCheckedChange={() => toggleDeviceSelection(device.device_id)}
                        />
                      )}
                    </td>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : ''}`}>
                      {device.device_id}
                    </td>
                    <td className="px-4 py-3">
                      {device.asset_id ? (
                        <span 
                          className="text-green-500 cursor-pointer hover:underline flex items-center gap-1"
                          onClick={() => {
                            setActiveTab('assets');
                            setFilters(prev => ({ ...prev, search: device.asset_id }));
                          }}
                        >
                          <Link2 className="h-3 w-3" />
                          {device.asset_id}
                        </span>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
                          Kein Asset
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{device.locationcode || '-'}</td>
                    <td className="px-4 py-3">{device.city || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{device.sn_pc || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{device.sn_sc || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={
                        device.status === 'online' ? 'bg-green-500/20 text-green-500' :
                        device.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-500'
                      }>
                        {device.teamviewer_online ? <Wifi className="h-3 w-3 inline mr-1" /> : <WifiOff className="h-3 w-3 inline mr-1" />}
                        {device.status || 'unbekannt'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!device.asset_id ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-500 border-green-500 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeviceToLink(device);
                            setShowCreateAssetModal(true);
                          }}
                          data-testid={`create-asset-btn-${device.device_id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Asset
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal('asset', device.asset_id);
                          }}
                          data-testid={`view-asset-btn-${device.device_id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {devices.length === 0 && !loading && (
            <div className="p-8 text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine Geräte gefunden</p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
        
        // Hilfsfunktion für Datumsformatierung
        const formatDate = (dateStr) => {
          if (!dateStr) return '-';
          try {
            return new Date(dateStr).toLocaleDateString('de-DE');
          } catch {
            return dateStr;
          }
        };
        
        // Garantie-Status prüfen
        const warrantyExpired = data.warranty_until && new Date(data.warranty_until) < new Date();
        const warrantyExpiringSoon = data.warranty_until && !warrantyExpired && 
          new Date(data.warranty_until) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        
        // Lizenz-Status prüfen
        const licenseExpired = data.license_expiry_date && new Date(data.license_expiry_date) < new Date();
        const licenseExpiringSoon = data.license_expiry_date && !licenseExpired && 
          new Date(data.license_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Basis-Informationen */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-xs font-semibold mb-2 text-gray-500`}>Basis</h4>
              <div className="grid grid-cols-3 gap-3">
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
                    <span className="text-sm">{typeConfig.label}</span>
                  </div>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hersteller</p>
                  <p className="text-sm">{data.manufacturer || '-'}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Modell</p>
                  <p className="text-sm">{data.model || '-'}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Seriennummer</p>
                  <p className="text-sm font-mono">{data.manufacturer_sn || '-'}</p>
                </div>
                {data.imei && (
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IMEI</p>
                    <p className="text-sm font-mono">{data.imei}</p>
                  </div>
                )}
                {data.mac && (
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>MAC</p>
                    <p className="text-sm font-mono">{data.mac}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Kaufdaten & Garantie */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <h4 className={`text-xs font-semibold mb-2 text-gray-500`}>Kaufdaten</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kaufdatum</span>
                    <span className="text-sm">{formatDate(data.purchase_date)}</span>
                  </div>
                  {data.purchase_price && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Preis</span>
                      <span className="text-sm">{data.purchase_price.toFixed(2)} €</span>
                    </div>
                  )}
                  {data.supplier && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lieferant</span>
                      <span className="text-sm">{data.supplier}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${warrantyExpired ? 'bg-red-500/10' : warrantyExpiringSoon ? 'bg-yellow-500/10' : isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <h4 className={`text-xs font-semibold mb-2 ${warrantyExpired ? 'text-red-500' : warrantyExpiringSoon ? 'text-yellow-500' : 'text-gray-500'}`}>
                  Garantie {warrantyExpired ? '(Abgelaufen!)' : warrantyExpiringSoon ? '(Läuft bald ab!)' : ''}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bis</span>
                    <span className={`text-sm ${warrantyExpired ? 'text-red-500' : warrantyExpiringSoon ? 'text-yellow-500' : ''}`}>
                      {formatDate(data.warranty_until)}
                    </span>
                  </div>
                  {data.warranty_type && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Typ</span>
                      <span className="text-sm">{WARRANTY_TYPE_OPTIONS.find(w => w.value === data.warranty_type)?.label || data.warranty_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Installation & Lizenz */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <h4 className={`text-xs font-semibold mb-2 text-gray-500`}>Installation</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Datum</span>
                    <span className="text-sm">{formatDate(data.installation_date)}</span>
                  </div>
                  {data.installed_by && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Von</span>
                      <span className="text-sm">{data.installed_by}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${licenseExpired ? 'bg-red-500/10' : licenseExpiringSoon ? 'bg-yellow-500/10' : isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <h4 className={`text-xs font-semibold mb-2 ${licenseExpired ? 'text-red-500' : licenseExpiringSoon ? 'text-yellow-500' : 'text-gray-500'}`}>
                  Lizenz {licenseExpired ? '(Abgelaufen!)' : licenseExpiringSoon ? '(Läuft bald ab!)' : ''}
                </h4>
                <div className="space-y-2">
                  {data.license_type && (
                    <div className="flex justify-between">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Typ</span>
                      <span className="text-sm">{LICENSE_TYPE_OPTIONS.find(l => l.value === data.license_type)?.label || data.license_type}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aktiviert</span>
                    <span className="text-sm">{formatDate(data.license_activation_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Läuft ab</span>
                    <span className={`text-sm ${licenseExpired ? 'text-red-500' : licenseExpiringSoon ? 'text-yellow-500' : ''}`}>
                      {formatDate(data.license_expiry_date)}
                    </span>
                  </div>
                </div>
              </div>
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
        // Gruppiere Asset-Typen nach Kategorie
        const typesByCategory = {};
        Object.entries(ASSET_TYPE_CONFIG).forEach(([key, config]) => {
          const cat = config.category || 'Sonstiges';
          if (!typesByCategory[cat]) typesByCategory[cat] = [];
          typesByCategory[cat].push({ value: key, label: config.label });
        });
        
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Basis-Informationen */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Basis-Informationen</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Asset ID *</label>
                  <Input
                    value={formData.asset_id || ''}
                    onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                    placeholder="z.B. TAB-DE-001"
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Gerätetyp *</label>
                  <Select value={formData.type || 'tablet'} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(typesByCategory).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">{category}</div>
                          {types.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Hersteller</label>
                  <Select value={formData.manufacturer || ''} onValueChange={(v) => setFormData({ ...formData, manufacturer: v })}>
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      {MANUFACTURER_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Modell</label>
                  <Input
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="z.B. Surface Pro 6"
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Hersteller-Seriennummer</label>
                  <Input
                    value={formData.manufacturer_sn || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer_sn: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Status</label>
                  <Select value={formData.status || 'in_storage'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Land</label>
                  <Input
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="z.B. DE"
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Bundle (optional)</label>
                  <Input
                    value={formData.bundle_id || ''}
                    onChange={(e) => setFormData({ ...formData, bundle_id: e.target.value })}
                    placeholder="z.B. BDL-DE-001"
                    className={`h-9 ${inputBg}`}
                  />
                </div>
              </div>
            </div>
            
            {/* Netzwerk-Informationen */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Netzwerk & IDs</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">IMEI</label>
                  <Input
                    value={formData.imei || ''}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">MAC Adresse</label>
                  <Input
                    value={formData.mac || ''}
                    onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
              </div>
            </div>
            
            {/* Kaufdaten */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Kaufdaten</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Kaufdatum</label>
                  <Input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => {
                      // Automatisch Garantie-Ende neu berechnen wenn Monate gesetzt
                      let warrantyDate = formData.warranty_until || '';
                      if (e.target.value && formData.warranty_months) {
                        const startDate = new Date(e.target.value);
                        startDate.setMonth(startDate.getMonth() + parseInt(formData.warranty_months));
                        warrantyDate = startDate.toISOString().split('T')[0];
                      }
                      setFormData({ ...formData, purchase_date: e.target.value, warranty_until: warrantyDate });
                    }}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Kaufpreis (€)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || null })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Lieferant</label>
                  <Input
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Rechnungsnummer</label>
                  <Input
                    value={formData.invoice_number || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
              </div>
            </div>
            
            {/* Garantie */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Garantie</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">Garantie (Monate)</label>
                  <Select 
                    value={formData.warranty_months || ''} 
                    onValueChange={(v) => {
                      const months = parseInt(v);
                      let warrantyDate = '';
                      // Berechne Enddatum basierend auf Kaufdatum
                      if (months && formData.purchase_date) {
                        const startDate = new Date(formData.purchase_date);
                        startDate.setMonth(startDate.getMonth() + months);
                        warrantyDate = startDate.toISOString().split('T')[0];
                      }
                      setFormData({ ...formData, warranty_months: v, warranty_until: warrantyDate });
                    }}
                  >
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Monate</SelectItem>
                      <SelectItem value="24">24 Monate</SelectItem>
                      <SelectItem value="36">36 Monate</SelectItem>
                      <SelectItem value="48">48 Monate</SelectItem>
                      <SelectItem value="60">60 Monate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Garantie bis (berechnet)</label>
                  <Input
                    type="date"
                    value={formData.warranty_until || ''}
                    onChange={(e) => setFormData({ ...formData, warranty_until: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Garantie-Typ</label>
                  <Select value={formData.warranty_type || ''} onValueChange={(v) => setFormData({ ...formData, warranty_type: v })}>
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      {WARRANTY_TYPE_OPTIONS.map(w => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.purchase_date && formData.warranty_months && (
                <p className={`text-xs mt-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  ✓ Garantie-Ende berechnet: {formData.warranty_until ? new Date(formData.warranty_until).toLocaleDateString('de-DE') : '-'}
                </p>
              )}
            </div>
            
            {/* Installation */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Installation</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Installationsdatum</label>
                  <Input
                    type="date"
                    value={formData.installation_date || ''}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Installiert von</label>
                  <Input
                    value={formData.installed_by || ''}
                    onChange={(e) => setFormData({ ...formData, installed_by: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
              </div>
            </div>
            
            {/* Lizenz */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Lizenz-Informationen</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Lizenzschlüssel</label>
                  <Input
                    value={formData.license_key || ''}
                    onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Lizenz-Typ</label>
                  <Select value={formData.license_type || ''} onValueChange={(v) => setFormData({ ...formData, license_type: v })}>
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPE_OPTIONS.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Aktivierungsdatum</label>
                  <Input
                    type="date"
                    value={formData.license_activation_date || ''}
                    onChange={(e) => {
                      // Automatisch Lizenz-Ende berechnen wenn Monate gesetzt
                      let expiryDate = formData.license_expiry_date || '';
                      if (e.target.value && formData.license_months) {
                        const startDate = new Date(e.target.value);
                        startDate.setMonth(startDate.getMonth() + parseInt(formData.license_months));
                        expiryDate = startDate.toISOString().split('T')[0];
                      }
                      setFormData({ ...formData, license_activation_date: e.target.value, license_expiry_date: expiryDate });
                    }}
                    className={`h-9 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Lizenz-Laufzeit (Monate)</label>
                  <Select 
                    value={formData.license_months || ''} 
                    onValueChange={(v) => {
                      const months = parseInt(v);
                      let expiryDate = '';
                      // Berechne Enddatum basierend auf Aktivierungsdatum
                      if (months && formData.license_activation_date) {
                        const startDate = new Date(formData.license_activation_date);
                        startDate.setMonth(startDate.getMonth() + months);
                        expiryDate = startDate.toISOString().split('T')[0];
                      }
                      setFormData({ ...formData, license_months: v, license_expiry_date: expiryDate });
                    }}
                  >
                    <SelectTrigger className={`h-9 ${inputBg}`}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Monate</SelectItem>
                      <SelectItem value="24">24 Monate</SelectItem>
                      <SelectItem value="36">36 Monate</SelectItem>
                      <SelectItem value="48">48 Monate</SelectItem>
                      <SelectItem value="60">60 Monate</SelectItem>
                      <SelectItem value="perpetual">Unbegrenzt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium">Lizenz läuft ab (berechnet)</label>
                  <Input
                    type="date"
                    value={formData.license_expiry_date || ''}
                    onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    className={`h-9 ${inputBg}`}
                    disabled={formData.license_months === 'perpetual'}
                  />
                </div>
              </div>
              {formData.license_activation_date && formData.license_months && formData.license_months !== 'perpetual' && (
                <p className={`text-xs mt-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  ✓ Lizenz-Ende berechnet: {formData.license_expiry_date ? new Date(formData.license_expiry_date).toLocaleDateString('de-DE') : '-'}
                </p>
              )}
              {formData.license_months === 'perpetual' && (
                <p className={`text-xs mt-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  ✓ Unbegrenzte Lizenz
                </p>
              )}
            </div>
            
            {/* Notizen */}
            <div>
              <label className="text-xs font-medium">Notizen</label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={inputBg}
              />
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
            Multi-Level Struktur für TSRID Rollout (inkl. Kit-/Bundle-Verwaltung)
          </p>
        </div>
        <Button 
          onClick={() => openCreateModal(activeTab.slice(0, -1))} 
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neu {activeTab === 'locations' ? 'Location' : activeTab === 'slots' ? 'Slot' : activeTab === 'bundles' ? 'Bundle (Kit)' : 'Asset'}
        </Button>
      </div>

      {/* Statistics */}
      <StatsCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="goods-receipt" className="flex items-center gap-2" data-testid="goods-receipt-tab">
            <PackageOpen className="h-4 w-4" />
            Wareneingang
          </TabsTrigger>
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
            Bundles (Kits)
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Geräte-Import
            {deviceStats.without_asset > 0 && (
              <Badge variant="outline" className="ml-1 bg-orange-500/20 text-orange-500 text-xs px-1.5">
                {deviceStats.without_asset}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Filters - only show for data tables */}
        {activeTab !== 'devices' && activeTab !== 'goods-receipt' && <Filters />}

        {/* Content */}
        {activeTab === 'goods-receipt' ? (
          <TabsContent value="goods-receipt">
            <GoodsReceiptWorkflow theme={theme} onRefreshStats={fetchStats} />
          </TabsContent>
        ) : loading ? (
          <TableSkeleton rows={10} columns={7} theme={theme} />
        ) : (
          <>
            <TabsContent value="locations"><LocationsTable /></TabsContent>
            <TabsContent value="slots"><SlotsTable /></TabsContent>
            <TabsContent value="bundles"><BundlesTable /></TabsContent>
            <TabsContent value="assets"><AssetsTable /></TabsContent>
            <TabsContent value="devices"><DevicesTable /></TabsContent>
          </>
        )}

        {/* Pagination - only for data tables */}
        {!loading && activeTab !== 'goods-receipt' && (
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
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Füllen Sie die erforderlichen Felder aus.
            </DialogDescription>
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
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Details und Verknüpfungen anzeigen
            </DialogDescription>
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

      {/* Create Asset from Device Modal */}
      <Dialog open={showCreateAssetModal} onOpenChange={setShowCreateAssetModal}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-green-500" />
              Asset aus Gerät erstellen
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {deviceToLink && (
                <>Device: <strong>{deviceToLink.device_id}</strong> • Location: {deviceToLink.locationcode} • Stadt: {deviceToLink.city}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Asset-ID Preview */}
            {deviceToLink && (
              <div className={`p-3 rounded-lg border-2 border-dashed ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'}`}>
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  Asset-ID Vorschau:
                </p>
                <p className={`font-mono text-lg font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  {deviceToLink.device_id}-{ASSET_TYPE_CONFIG[createAssetForm.asset_type]?.suffix || 'OTH'}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Format: [Device-ID]-[TYP]-[MODELL]
                </p>
              </div>
            )}
            
            {/* Device Info Summary */}
            {deviceToLink && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>SN-PC:</span>
                    <span className="ml-2 font-mono">{deviceToLink.sn_pc || '-'}</span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>SN-SC:</span>
                    <span className="ml-2 font-mono">{deviceToLink.sn_sc || '-'}</span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
                    <span className="ml-2">{deviceToLink.status}</span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Land:</span>
                    <span className="ml-2">{deviceToLink.country}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Asset Type Selection with Suffix Display */}
            <div>
              <label className="text-sm font-medium">Asset-Typ * (bestimmt ID-Suffix)</label>
              <Select 
                value={createAssetForm.asset_type} 
                onValueChange={(v) => setCreateAssetForm(prev => ({ ...prev, asset_type: v }))}
              >
                <SelectTrigger className={inputBg}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Tablets */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500">Tablets</div>
                  <SelectItem value="tab_sp4">Surface Pro 4 → TAB-SP4</SelectItem>
                  <SelectItem value="tab_sp6">Surface Pro 6 → TAB-SP6</SelectItem>
                  <SelectItem value="tab_tsr">TSRID Tablet → TAB-TSR</SelectItem>
                  {/* Scanner */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Scanner</div>
                  <SelectItem value="sca_tsr">TSRID Scanner → SCA-TSR</SelectItem>
                  <SelectItem value="sca_dsk">Desko Scanner → SCA-DSK</SelectItem>
                  {/* Tablet Docks */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Tablet Docks</div>
                  <SelectItem value="tdo_qer">Quer Dock (Surface) → TDO-QER</SelectItem>
                  <SelectItem value="tdo_tsr">TSRID Tablet Dock → TDO-TSR</SelectItem>
                  {/* Scanner Docks */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Scanner Docks</div>
                  <SelectItem value="sdo_dsk">Desko Scanner Dock → SDO-DSK</SelectItem>
                  <SelectItem value="sdo_tsr">TSRID Scanner Dock → SDO-TSR</SelectItem>
                  {/* Tablet PSU */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Tablet Netzteile</div>
                  <SelectItem value="tps_spx">Surface Netzteil → TPS-SPX</SelectItem>
                  <SelectItem value="tps_tsr">TSRID Tablet Netzteil → TPS-TSR</SelectItem>
                  {/* Scanner PSU */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Scanner Netzteile</div>
                  <SelectItem value="sps_dsk">Desko Scanner Netzteil → SPS-DSK</SelectItem>
                  <SelectItem value="sps_tsr">TSRID Scanner Netzteil → SPS-TSR</SelectItem>
                  {/* Extensions */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Extensions</div>
                  <SelectItem value="usb">USB Extension → USB</SelectItem>
                  <SelectItem value="lan">LAN Extension → LAN</SelectItem>
                  <SelectItem value="12v">12V Extension → 12V</SelectItem>
                  {/* Kits */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Kits</div>
                  <SelectItem value="kit_sfd">Surface + Desko Kit → KIT-SFD</SelectItem>
                  <SelectItem value="kit_tsr">TSRID Kit → KIT-TSR</SelectItem>
                  {/* Sonstiges */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Sonstiges</div>
                  <SelectItem value="other">Sonstiges → OTH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Manufacturer - auto-set based on type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Hersteller</label>
                <Select 
                  value={createAssetForm.manufacturer} 
                  onValueChange={(v) => setCreateAssetForm(prev => ({ ...prev, manufacturer: v }))}
                >
                  <SelectTrigger className={inputBg}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                    <SelectItem value="Desko">Desko</SelectItem>
                    <SelectItem value="TSRID">TSRID</SelectItem>
                    <SelectItem value="Other">Sonstiger Hersteller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Modell</label>
                <Input
                  value={createAssetForm.model}
                  onChange={(e) => setCreateAssetForm(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="z.B. Surface Pro 6"
                  className={inputBg}
                />
              </div>
            </div>
            
            {/* Purchase & Warranty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Kaufdatum</label>
                <Input
                  type="date"
                  value={createAssetForm.purchase_date}
                  onChange={(e) => setCreateAssetForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className={inputBg}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Garantie (Monate)</label>
                <Select 
                  value={createAssetForm.warranty_months} 
                  onValueChange={(v) => setCreateAssetForm(prev => ({ ...prev, warranty_months: v }))}
                >
                  <SelectTrigger className={inputBg}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Monate</SelectItem>
                    <SelectItem value="24">24 Monate</SelectItem>
                    <SelectItem value="36">36 Monate</SelectItem>
                    <SelectItem value="48">48 Monate</SelectItem>
                    <SelectItem value="60">60 Monate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Warranty Type */}
            <div>
              <label className="text-sm font-medium">Garantie-Typ</label>
              <Select 
                value={createAssetForm.warranty_type} 
                onValueChange={(v) => setCreateAssetForm(prev => ({ ...prev, warranty_type: v }))}
              >
                <SelectTrigger className={inputBg}><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  {WARRANTY_TYPE_OPTIONS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notizen</label>
              <Input
                value={createAssetForm.notes}
                onChange={(e) => setCreateAssetForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optionale Notizen..."
                className={inputBg}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateAssetModal(false);
              setDeviceToLink(null);
            }}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateAssetFromDevice} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Asset erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetManagementV2;
