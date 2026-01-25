import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, Search, RefreshCw, Plus, Edit2, Trash2, Clock, MapPin, 
  Key, Download, ShoppingCart, Tool, XCircle, MessageSquare, Shield,
  ChevronRight, Calendar, Package, Printer, Tablet, Box, Scan,
  AlertTriangle, CheckCircle, Archive, Power
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

// Status-Definitionen
const DEVICE_STATUSES = {
  active: { label: 'Aktiv', color: 'green', icon: CheckCircle },
  in_storage: { label: 'Im Lager', color: 'blue', icon: Archive },
  defective: { label: 'Defekt / Reparatur', color: 'yellow', icon: Tool },
  out_of_service: { label: 'Außer Betrieb', color: 'red', icon: XCircle }
};

// Device Type Icons
const TYPE_ICONS = {
  scanner_regula: Scan,
  scanner_desko: Scan,
  tablet: Tablet,
  printer: Printer,
  docking_type1: Box,
  docking_type2: Box,
  docking_type3: Box,
  docking_type4: Box,
};

// Event Icons
const EVENT_ICONS = {
  purchased: ShoppingCart,
  activated: Power,
  assigned: MapPin,
  reassigned: RefreshCw,
  license_activated: Key,
  license_renewed: RefreshCw,
  software_updated: Download,
  repaired: Tool,
  decommissioned: XCircle,
  note_added: MessageSquare,
  warranty_claimed: Shield,
  status_changed: RefreshCw,
};

const DeviceLifecycleManager = ({ theme, selectedTenantId }) => {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, by_status: {}, by_type: {} });

  // Device detail modal
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Create/Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // Add event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventData, setEventData] = useState({ event_type: '', description: '' });

  const fetchDeviceTypes = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/types`);
      const data = await response.json();
      if (data.success) {
        setDeviceTypes(data.types || {});
      }
    } catch (error) {
      console.error('Error fetching device types:', error);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
      let url = `${BACKEND_URL}/api/device-lifecycle/list?limit=500`;
      
      if (typeFilter && typeFilter !== 'all') {
        url += `&device_type=${typeFilter}`;
      }
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (selectedTenantId && selectedTenantId !== 'all') {
        url += `&tenant_id=${selectedTenantId}`;
      }

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Fehler beim Laden der Geräte');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchTerm, selectedTenantId]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token');
      let url = `${BACKEND_URL}/api/device-lifecycle/stats`;
      if (selectedTenantId && selectedTenantId !== 'all') {
        url += `?tenant_id=${selectedTenantId}`;
      }
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats || { total: 0, by_status: {}, by_type: {} });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedTenantId]);

  const fetchTimeline = async (deviceId) => {
    setLoadingTimeline(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/${deviceId}/timeline`);
      const data = await response.json();
      if (data.success) {
        setTimeline(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
    fetchStats();
  }, [fetchDeviceTypes, fetchDevices, fetchStats]);

  const openDeviceDetail = async (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
    await fetchTimeline(device.id);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setFormData({
      device_type: 'tablet',
      serial_number: '',
      manufacturer: '',
      model: '',
      qr_code: '',
      inventory_number: '',
      os_name: '',
      os_version: '',
      software_version: '',
      purchase_date: '',
      purchase_price: '',
      warranty_end: '',
      license_valid_until: '',
      assigned_location_code: '',
      assigned_location_name: '',
      responsible_technician: '',
      notes: '',
      status: 'in_storage'
    });
    setShowEditModal(true);
  };

  const openEditModal = (device) => {
    setEditMode(true);
    setFormData({ ...device });
    setShowEditModal(true);
  };

  const handleSaveDevice = async () => {
    try {
      const url = editMode 
        ? `${BACKEND_URL}/api/device-lifecycle/${formData.id}`
        : `${BACKEND_URL}/api/device-lifecycle/create`;
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(editMode ? 'Gerät aktualisiert' : 'Gerät erstellt');
        setShowEditModal(false);
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Gerät wirklich löschen? Die gesamte Historie wird gelöscht.')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/${deviceId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Gerät gelöscht');
        setShowDetailModal(false);
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleAddEvent = async () => {
    if (!eventData.event_type) {
      toast.error('Bitte Event-Typ auswählen');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/${selectedDevice.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Event hinzugefügt');
        setShowEventModal(false);
        setEventData({ event_type: '', description: '' });
        fetchTimeline(selectedDevice.id);
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const getStatusBadge = (status) => {
    const config = DEVICE_STATUSES[status] || DEVICE_STATUSES.active;
    const Icon = config.icon;
    const colorClasses = {
      green: 'bg-green-500/20 text-green-500 border-green-500/30',
      blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      red: 'bg-red-500/20 text-red-500 border-red-500/30'
    };
    return (
      <Badge variant="outline" className={`${colorClasses[config.color]} flex items-center gap-1.5 px-2 py-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    const Icon = TYPE_ICONS[type] || Monitor;
    return <Icon className="w-4 h-4" />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = date - now;
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
    } catch {
      return false;
    }
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    try {
      return new Date(dateStr) < new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Geräte-Lifecycle-Management
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie alle Geräte mit vollständiger Historie
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchDevices(); fetchStats(); }} variant="outline" className="gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={openCreateModal} className="gap-2 bg-[#c00000] hover:bg-[#a00000] text-white">
            <Plus className="w-4 h-4" />
            Neues Gerät
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''} ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
            </div>
          </div>
        </Card>

        {Object.entries(DEVICE_STATUSES).map(([key, config]) => {
          const Icon = config.icon;
          const count = stats.by_status?.[key] || 0;
          const colorClasses = {
            green: 'bg-green-500/20 text-green-500',
            blue: 'bg-blue-500/20 text-blue-500',
            yellow: 'bg-yellow-500/20 text-yellow-500',
            red: 'bg-red-500/20 text-red-500'
          };
          return (
            <Card 
              key={key}
              className={`p-4 cursor-pointer transition-all ${statusFilter === key ? `ring-2 ring-${config.color}-500` : ''} ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses[config.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{count}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {(stats.warranty_expiring_soon > 0 || stats.license_expiring_soon > 0) && (
        <div className="flex gap-4">
          {stats.warranty_expiring_soon > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30`}>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {stats.warranty_expiring_soon} Geräte mit bald ablaufender Garantie
              </span>
            </div>
          )}
          {stats.license_expiring_soon > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30`}>
              <Key className="w-4 h-4 text-red-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                {stats.license_expiring_soon} Geräte mit bald ablaufender Lizenz
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Suche nach Seriennummer, Modell..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-primary`}
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]" data-testid="type-filter">
            <SelectValue placeholder="Gerätetyp..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(deviceTypes).map(([key, type]) => (
              <SelectItem key={key} value={key}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Devices Table */}
      <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Monitor className={`w-12 h-12 mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Keine Geräte gefunden</p>
            <Button onClick={openCreateModal} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Erstes Gerät anlegen
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Typ</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Seriennummer</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Modell</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standort</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Garantie</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Lizenz</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr 
                    key={device.id}
                    className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-100 hover:bg-gray-50'} cursor-pointer transition-colors`}
                    onClick={() => openDeviceDetail(device)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(device.device_type)}
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {deviceTypes[device.device_type]?.label || device.device_type}
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {device.serial_number}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {device.manufacturer} {device.model}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {device.assigned_location_code ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.assigned_location_code}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(device.status)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isExpired(device.warranty_end) ? 'text-red-500' : isExpiringSoon(device.warranty_end) ? 'text-yellow-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(device.warranty_end)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isExpired(device.license_valid_until) ? 'text-red-500' : isExpiringSoon(device.license_valid_until) ? 'text-yellow-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(device.license_valid_until)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(device)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openDeviceDetail(device)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Device Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-3 ${theme === 'dark' ? 'text-white' : ''}`}>
              {selectedDevice && getTypeIcon(selectedDevice.device_type)}
              <span>{selectedDevice?.serial_number}</span>
              {selectedDevice && getStatusBadge(selectedDevice.status)}
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-gray-400' : ''}>
              {selectedDevice?.manufacturer} {selectedDevice?.model}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Stammdaten</TabsTrigger>
                <TabsTrigger value="timeline">Timeline / Historie</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                    <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : ''}`}>Geräteinformationen</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Typ:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{deviceTypes[selectedDevice.device_type]?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Hersteller:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.manufacturer || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Modell:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.model || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Inventarnr.:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.inventory_number || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>QR-Code:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.qr_code || '-'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Software Info */}
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                    <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : ''}`}>Software & System</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Betriebssystem:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.os_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>OS Version:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.os_version || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Scansoftware:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.software_version || '-'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Purchase & Warranty */}
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                    <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : ''}`}>Kauf & Garantie</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Kaufdatum:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{formatDate(selectedDevice.purchase_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Kaufpreis:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>
                          {selectedDevice.purchase_price ? `${selectedDevice.purchase_price.toFixed(2)} €` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Garantie bis:</span>
                        <span className={`${isExpired(selectedDevice.warranty_end) ? 'text-red-500' : isExpiringSoon(selectedDevice.warranty_end) ? 'text-yellow-500' : theme === 'dark' ? 'text-white' : ''}`}>
                          {formatDate(selectedDevice.warranty_end)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* License & Location */}
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                    <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : ''}`}>Lizenz & Standort</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lizenz gültig bis:</span>
                        <span className={`${isExpired(selectedDevice.license_valid_until) ? 'text-red-500' : isExpiringSoon(selectedDevice.license_valid_until) ? 'text-yellow-500' : theme === 'dark' ? 'text-white' : ''}`}>
                          {formatDate(selectedDevice.license_valid_until)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Standort:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>
                          {selectedDevice.assigned_location_code || 'Nicht zugewiesen'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Techniker:</span>
                        <span className={theme === 'dark' ? 'text-white' : ''}>{selectedDevice.responsible_technician || '-'}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Notes */}
                {selectedDevice.notes && (
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : ''}`}>Notizen</h4>
                    <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedDevice.notes}
                    </p>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => openEditModal(selectedDevice)} className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteDevice(selectedDevice.id)} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>Ereignis-Historie</h4>
                  <Button size="sm" variant="outline" onClick={() => { setEventData({ event_type: '', description: '' }); setShowEventModal(true); }} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Event hinzufügen
                  </Button>
                </div>

                {loadingTimeline ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : timeline.length === 0 ? (
                  <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Keine Ereignisse vorhanden
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((event, idx) => {
                      const EventIcon = EVENT_ICONS[event.event_type] || Clock;
                      return (
                        <div key={idx} className={`flex gap-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                          <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <EventIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {event.description}
                                </p>
                                {event.old_value && event.new_value && (
                                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {event.old_value} → {event.new_value}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {formatDate(event.timestamp)}
                                </p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {event.performed_by}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : ''}>
              {editMode ? 'Gerät bearbeiten' : 'Neues Gerät anlegen'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Gerätetyp *</Label>
              <Select value={formData.device_type} onValueChange={(v) => setFormData({...formData, device_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(deviceTypes).map(([key, type]) => (
                    <SelectItem key={key} value={key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Seriennummer *</Label>
              <Input 
                value={formData.serial_number || ''} 
                onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Hersteller</Label>
              <Input 
                value={formData.manufacturer || ''} 
                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Modell</Label>
              <Input 
                value={formData.model || ''} 
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Inventarnummer</Label>
              <Input 
                value={formData.inventory_number || ''} 
                onChange={(e) => setFormData({...formData, inventory_number: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>QR-Code</Label>
              <Input 
                value={formData.qr_code || ''} 
                onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Betriebssystem</Label>
              <Input 
                value={formData.os_name || ''} 
                onChange={(e) => setFormData({...formData, os_name: e.target.value})}
                placeholder="z.B. Windows 11"
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>OS Version</Label>
              <Input 
                value={formData.os_version || ''} 
                onChange={(e) => setFormData({...formData, os_version: e.target.value})}
                placeholder="z.B. 23H2"
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Scansoftware Version</Label>
              <Input 
                value={formData.software_version || ''} 
                onChange={(e) => setFormData({...formData, software_version: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_STATUSES).map(([key, status]) => (
                    <SelectItem key={key} value={key}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Kaufdatum</Label>
              <Input 
                type="date"
                value={formData.purchase_date || ''} 
                onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Kaufpreis (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.purchase_price || ''} 
                onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || null})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Garantie bis</Label>
              <Input 
                type="date"
                value={formData.warranty_end || ''} 
                onChange={(e) => setFormData({...formData, warranty_end: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Lizenz gültig bis</Label>
              <Input 
                type="date"
                value={formData.license_valid_until || ''} 
                onChange={(e) => setFormData({...formData, license_valid_until: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Standort-Code</Label>
              <Input 
                value={formData.assigned_location_code || ''} 
                onChange={(e) => setFormData({...formData, assigned_location_code: e.target.value})}
                placeholder="z.B. BERE01"
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Verantwortlicher Techniker</Label>
              <Input 
                value={formData.responsible_technician || ''} 
                onChange={(e) => setFormData({...formData, responsible_technician: e.target.value})}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Notizen</Label>
              <Textarea 
                value={formData.notes || ''} 
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Abbrechen</Button>
            <Button onClick={handleSaveDevice} className="bg-[#c00000] hover:bg-[#a00000] text-white">
              {editMode ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : ''}>Event hinzufügen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Event-Typ *</Label>
              <Select value={eventData.event_type} onValueChange={(v) => setEventData({...eventData, event_type: v})}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note_added">Notiz hinzufügen</SelectItem>
                  <SelectItem value="repaired">Reparatur</SelectItem>
                  <SelectItem value="software_updated">Software-Update</SelectItem>
                  <SelectItem value="warranty_claimed">Garantiefall</SelectItem>
                  <SelectItem value="license_renewed">Lizenz erneuert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>Beschreibung</Label>
              <Textarea 
                value={eventData.description} 
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                placeholder="Details zum Ereignis..."
                rows={3}
                className={theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : ''}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventModal(false)}>Abbrechen</Button>
            <Button onClick={handleAddEvent} className="bg-[#c00000] hover:bg-[#a00000] text-white">
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceLifecycleManager;
