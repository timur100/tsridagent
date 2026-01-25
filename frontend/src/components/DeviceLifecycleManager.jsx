import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, Search, RefreshCw, Plus, Edit2, Trash2, Clock, MapPin, 
  Key, Download, ShoppingCart, Tool, XCircle, ChevronRight, Printer, 
  Tablet, Box, AlertTriangle, CheckCircle, Archive, MessageSquare, Shield
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

const DEVICE_STATUSES = {
  active: { label: 'Aktiv', color: 'green', icon: CheckCircle },
  in_storage: { label: 'Im Lager', color: 'blue', icon: Archive },
  defective: { label: 'Defekt / Reparatur', color: 'yellow', icon: Tool },
  out_of_service: { label: 'Außer Betrieb', color: 'red', icon: XCircle }
};

const TYPE_ICONS = {
  scanner_regula: Monitor, scanner_desko: Monitor, tablet: Tablet,
  printer: Printer, docking_type1: Box, docking_type2: Box,
  docking_type3: Box, docking_type4: Box
};

const EVENT_ICONS = {
  purchased: ShoppingCart, activated: CheckCircle, assigned: MapPin,
  reassigned: RefreshCw, license_activated: Key, license_renewed: RefreshCw,
  software_updated: Download, repaired: Tool, decommissioned: XCircle,
  note_added: MessageSquare, warranty_claimed: Shield, status_changed: RefreshCw
};

const DeviceLifecycleManager = ({ theme }) => {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, by_status: {}, warranty_expiring_soon: 0, license_expiring_soon: 0 });

  // Modals
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [eventData, setEventData] = useState({ event_type: '', description: '' });
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchDeviceTypes = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/types`);
      const data = await response.json();
      if (data.success) setDeviceTypes(data.types || {});
    } catch (error) {
      console.error('Error fetching device types:', error);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/device-lifecycle/list?limit=500`;
      if (typeFilter !== 'all') url += `&device_type=${typeFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) setDevices(data.devices || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/stats`);
      const data = await response.json();
      if (data.success) setStats(data.stats || { total: 0, by_status: {} });
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchTimeline = async (deviceId) => {
    setLoadingTimeline(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/${deviceId}/timeline`);
      const data = await response.json();
      if (data.success) setTimeline(data.events || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
    fetchStats();
  }, [fetchDeviceTypes, fetchDevices, fetchStats]);

  const openDetailModal = async (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
    await fetchTimeline(device.id);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setFormData({
      device_type: 'tablet', serial_number: '', manufacturer: '', model: '',
      qr_code: '', inventory_number: '', os_name: '', os_version: '',
      software_version: '', purchase_date: '', purchase_price: '',
      warranty_end: '', license_valid_until: '', assigned_location_code: '',
      responsible_technician: '', notes: '', status: 'in_storage'
    });
    setShowEditModal(true);
  };

  const openEditModal = (device) => {
    setEditMode(true);
    setFormData({ ...device });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleSaveDevice = async () => {
    if (!formData.serial_number) {
      toast.error('Seriennummer ist erforderlich');
      return;
    }
    try {
      const url = editMode 
        ? `${BACKEND_URL}/api/device-lifecycle/${formData.id}`
        : `${BACKEND_URL}/api/device-lifecycle/create`;
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(editMode ? 'Gerät aktualisiert' : 'Gerät erstellt');
        setShowEditModal(false);
        fetchDevices();
        fetchStats();
        if (editMode && selectedDevice) {
          const updatedResponse = await fetch(`${BACKEND_URL}/api/device-lifecycle/${formData.id}`);
          const updatedData = await updatedResponse.json();
          if (updatedData.success) {
            setSelectedDevice(updatedData.device);
            fetchTimeline(formData.id);
          }
        }
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    if (!window.confirm(`Gerät "${selectedDevice.serial_number}" wirklich löschen?\n\nDie gesamte Historie wird unwiderruflich gelöscht!`)) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-lifecycle/${selectedDevice.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('Gerät gelöscht');
        setShowDetailModal(false);
        setSelectedDevice(null);
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.detail || 'Fehler');
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
      toast.error('Fehler');
    }
  };

  const getStatusBadge = (status) => {
    const config = DEVICE_STATUSES[status] || DEVICE_STATUSES.active;
    const Icon = config.icon;
    const colors = {
      green: 'bg-green-500/20 text-green-500 border-green-500/30',
      blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      red: 'bg-red-500/20 text-red-500 border-red-500/30'
    };
    return (
      <Badge variant="outline" className={`${colors[config.color]} flex items-center gap-1 px-2 py-1`}>
        <Icon className="w-3 h-3" />{config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('de-DE'); } catch { return dateStr; }
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    try { return new Date(dateStr) < new Date(); } catch { return false; }
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr), now = new Date();
      return d > now && (d - now) < 30 * 24 * 60 * 60 * 1000;
    } catch { return false; }
  };

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-200';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Geräte-Lifecycle-Management
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie alle Geräte mit vollständiger Historie
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchDevices(); fetchStats(); }} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Aktualisieren
          </Button>
          <Button onClick={openCreateModal} className="bg-[#c00000] hover:bg-[#a00000] text-white">
            <Plus className="w-4 h-4 mr-2" />Neues Gerät
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`p-4 cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''} ${cardBg}`} onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{stats.total}</p>
              <p className="text-sm text-gray-500">Gesamt</p>
            </div>
          </div>
        </Card>
        {Object.entries(DEVICE_STATUSES).map(([key, config]) => {
          const Icon = config.icon;
          const colors = { green: 'bg-green-500/20 text-green-500', blue: 'bg-blue-500/20 text-blue-500', yellow: 'bg-yellow-500/20 text-yellow-500', red: 'bg-red-500/20 text-red-500' };
          return (
            <Card key={key} className={`p-4 cursor-pointer transition-all ${statusFilter === key ? 'ring-2 ring-offset-2' : ''} ${cardBg}`} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors[config.color]}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{stats.by_status?.[key] || 0}</p>
                  <p className="text-xs text-gray-500">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {(stats.warranty_expiring_soon > 0 || stats.license_expiring_soon > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.warranty_expiring_soon > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">{stats.warranty_expiring_soon} Geräte: Garantie läuft bald ab</span>
            </div>
          )}
          {stats.license_expiring_soon > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <Key className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-500">{stats.license_expiring_soon} Geräte: Lizenz läuft bald ab</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Suche nach Seriennummer, Modell, Hersteller..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${inputBg}`} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Alle Typen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(deviceTypes).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className={`overflow-hidden ${cardBg}`}>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Monitor className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-gray-500 mb-4">Keine Geräte gefunden</p>
            <Button onClick={openCreateModal} variant="outline"><Plus className="w-4 h-4 mr-2" />Erstes Gerät anlegen</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  {['Typ', 'Seriennummer', 'Hersteller / Modell', 'Standort', 'Status', 'Garantie', 'Lizenz', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} onClick={() => openDetailModal(d)} className={`border-t cursor-pointer transition-colors ${isDark ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{deviceTypes[d.device_type]?.label || d.device_type}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono font-semibold ${isDark ? 'text-white' : ''}`}>{d.serial_number}</td>
                    <td className="px-4 py-3 text-sm">{d.manufacturer} {d.model}</td>
                    <td className="px-4 py-3 text-sm">{d.assigned_location_code ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{d.assigned_location_code}</span> : '-'}</td>
                    <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                    <td className="px-4 py-3"><span className={`text-sm ${isExpired(d.warranty_end) ? 'text-red-500' : isExpiringSoon(d.warranty_end) ? 'text-yellow-500' : ''}`}>{formatDate(d.warranty_end)}</span></td>
                    <td className="px-4 py-3"><span className={`text-sm ${isExpired(d.license_valid_until) ? 'text-red-500' : isExpiringSoon(d.license_valid_until) ? 'text-yellow-500' : ''}`}>{formatDate(d.license_valid_until)}</span></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openDetailModal(d)}><ChevronRight className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          {selectedDevice && (
            <>
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-3 ${isDark ? 'text-white' : ''}`}>
                  <Monitor className="w-5 h-5" />
                  <span className="font-mono">{selectedDevice.serial_number}</span>
                  {getStatusBadge(selectedDevice.status)}
                </DialogTitle>
                <DialogDescription className={isDark ? 'text-gray-400' : ''}>
                  {selectedDevice.manufacturer} {selectedDevice.model} • {deviceTypes[selectedDevice.device_type]?.label}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Device Info */}
                <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <Monitor className="w-4 h-4" />Geräteinformationen
                  </h4>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Seriennummer', selectedDevice.serial_number],
                      ['Inventarnr.', selectedDevice.inventory_number],
                      ['QR-Code', selectedDevice.qr_code],
                      ['Hersteller', selectedDevice.manufacturer],
                      ['Modell', selectedDevice.model],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-500">{l}:</span>
                        <span className={isDark ? 'text-white' : ''}>{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Software Info */}
                <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <Download className="w-4 h-4" />Software & System
                  </h4>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Betriebssystem', selectedDevice.os_name],
                      ['OS Version', selectedDevice.os_version],
                      ['Scansoftware', selectedDevice.software_version],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-500">{l}:</span>
                        <span className={isDark ? 'text-white' : ''}>{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Purchase & Warranty */}
                <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <ShoppingCart className="w-4 h-4" />Kauf & Garantie
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kaufdatum:</span>
                      <span className={isDark ? 'text-white' : ''}>{formatDate(selectedDevice.purchase_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kaufpreis:</span>
                      <span className={isDark ? 'text-white' : ''}>{selectedDevice.purchase_price ? `${selectedDevice.purchase_price.toFixed(2)} €` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Garantie bis:</span>
                      <span className={isExpired(selectedDevice.warranty_end) ? 'text-red-500 font-semibold' : isExpiringSoon(selectedDevice.warranty_end) ? 'text-yellow-500' : isDark ? 'text-white' : ''}>
                        {formatDate(selectedDevice.warranty_end)} {isExpired(selectedDevice.warranty_end) && '⚠️ Abgelaufen'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* License & Location */}
                <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <MapPin className="w-4 h-4" />Lizenz & Standort
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lizenz bis:</span>
                      <span className={isExpired(selectedDevice.license_valid_until) ? 'text-red-500 font-semibold' : isExpiringSoon(selectedDevice.license_valid_until) ? 'text-yellow-500' : isDark ? 'text-white' : ''}>
                        {formatDate(selectedDevice.license_valid_until)} {isExpired(selectedDevice.license_valid_until) && '⚠️ Abgelaufen'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Standort:</span>
                      <span className={isDark ? 'text-white' : ''}>{selectedDevice.assigned_location_code || 'Nicht zugewiesen'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Techniker:</span>
                      <span className={isDark ? 'text-white' : ''}>{selectedDevice.responsible_technician || '-'}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Notes */}
              {selectedDevice.notes && (
                <Card className={`p-4 mt-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : ''}`}>Notizen</h4>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedDevice.notes}</p>
                </Card>
              )}

              {/* Timeline */}
              <Card className={`p-4 mt-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <Clock className="w-4 h-4" />Ereignis-Timeline
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setShowEventModal(true)}>
                    <Plus className="w-4 h-4 mr-1" />Event
                  </Button>
                </div>
                {loadingTimeline ? (
                  <div className="flex justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin" /></div>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Keine Ereignisse vorhanden</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {timeline.map((ev, i) => {
                      const Icon = EVENT_ICONS[ev.event_type] || Clock;
                      return (
                        <div key={i} className={`flex gap-3 p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                          <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isDark ? 'text-white' : ''}`}>{ev.description}</p>
                            {ev.old_value && ev.new_value && (
                              <p className="text-xs text-gray-500 mt-1">{ev.old_value} → {ev.new_value}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{formatDate(ev.timestamp)} • {ev.performed_by}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Actions */}
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => openEditModal(selectedDevice)}>
                  <Edit2 className="w-4 h-4 mr-2" />Bearbeiten
                </Button>
                <Button variant="destructive" onClick={handleDeleteDevice}>
                  <Trash2 className="w-4 h-4 mr-2" />Löschen
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>{editMode ? 'Gerät bearbeiten' : 'Neues Gerät anlegen'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Row 1 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Gerätetyp *</label>
              <Select value={formData.device_type || 'tablet'} onValueChange={v => setFormData({...formData, device_type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(deviceTypes).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Seriennummer *</label>
              <input value={formData.serial_number || ''} onChange={e => setFormData({...formData, serial_number: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. SN-12345" />
            </div>
            {/* Row 2 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Hersteller</label>
              <input value={formData.manufacturer || ''} onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. Microsoft" />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Modell</label>
              <input value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. Surface Pro 9" />
            </div>
            {/* Row 3 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Inventarnummer</label>
              <input value={formData.inventory_number || ''} onChange={e => setFormData({...formData, inventory_number: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>QR-Code</label>
              <input value={formData.qr_code || ''} onChange={e => setFormData({...formData, qr_code: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            {/* Row 4 - Software */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Betriebssystem</label>
              <input value={formData.os_name || ''} onChange={e => setFormData({...formData, os_name: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. Windows 11" />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>OS Version</label>
              <input value={formData.os_version || ''} onChange={e => setFormData({...formData, os_version: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. 23H2" />
            </div>
            {/* Row 5 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Scansoftware-Version</label>
              <input value={formData.software_version || ''} onChange={e => setFormData({...formData, software_version: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Status</label>
              <Select value={formData.status || 'in_storage'} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_STATUSES).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Row 6 - Dates */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Kaufdatum</label>
              <input type="date" value={formData.purchase_date || ''} onChange={e => setFormData({...formData, purchase_date: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Kaufpreis (€)</label>
              <input type="number" step="0.01" value={formData.purchase_price || ''} onChange={e => setFormData({...formData, purchase_price: parseFloat(e.target.value) || null})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            {/* Row 7 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Garantie bis</label>
              <input type="date" value={formData.warranty_end || ''} onChange={e => setFormData({...formData, warranty_end: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Lizenz gültig bis</label>
              <input type="date" value={formData.license_valid_until || ''} onChange={e => setFormData({...formData, license_valid_until: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            {/* Row 8 */}
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Standort-Code</label>
              <input value={formData.assigned_location_code || ''} onChange={e => setFormData({...formData, assigned_location_code: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="z.B. BERE01" />
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Verantw. Techniker</label>
              <input value={formData.responsible_technician || ''} onChange={e => setFormData({...formData, responsible_technician: e.target.value})}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            {/* Notes */}
            <div className="col-span-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Notizen</label>
              <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="Zusätzliche Informationen..." />
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
        <DialogContent className={isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>Ereignis hinzufügen</DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : ''}>
              Fügen Sie ein neues Ereignis zur Timeline hinzu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Event-Typ *</label>
              <Select value={eventData.event_type || ''} onValueChange={v => setEventData({...eventData, event_type: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note_added">📝 Notiz hinzufügen</SelectItem>
                  <SelectItem value="repaired">🔧 Reparatur durchgeführt</SelectItem>
                  <SelectItem value="software_updated">⬇️ Software aktualisiert</SelectItem>
                  <SelectItem value="warranty_claimed">🛡️ Garantiefall gemeldet</SelectItem>
                  <SelectItem value="license_renewed">🔑 Lizenz erneuert</SelectItem>
                  <SelectItem value="assigned">📍 Standort zugewiesen</SelectItem>
                  <SelectItem value="reassigned">🔄 Standort gewechselt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>Beschreibung</label>
              <textarea value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} rows={3}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="Details zum Ereignis..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventModal(false)}>Abbrechen</Button>
            <Button onClick={handleAddEvent} className="bg-[#c00000] hover:bg-[#a00000] text-white">Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceLifecycleManager;
