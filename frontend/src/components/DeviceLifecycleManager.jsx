import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Search, RefreshCw, Plus, Edit2, Trash2, Clock, MapPin, Key, Download, ShoppingCart, Wrench, XCircle, ChevronRight, Printer, Tablet, Box, AlertTriangle, CheckCircle, Archive, MessageSquare, Shield, Building2, Warehouse } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

const DEVICE_STATUSES = {
  active: { label: 'Aktiv', color: 'green' },
  in_storage: { label: 'Im Lager', color: 'blue' },
  defective: { label: 'Defekt', color: 'yellow' },
  out_of_service: { label: 'Außer Betrieb', color: 'red' }
};

const EVENT_ICONS = {
  purchased: ShoppingCart, activated: CheckCircle, assigned: MapPin,
  reassigned: RefreshCw, license_activated: Key, license_renewed: RefreshCw,
  software_updated: Download, repaired: Wrench, decommissioned: XCircle,
  note_added: MessageSquare, warranty_claimed: Shield, status_changed: RefreshCw
};

const DeviceLifecycleManager = ({ theme, tenants = [], selectedTenantId }) => {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, by_status: {}, warranty_expiring_soon: 0, license_expiring_soon: 0 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [eventData, setEventData] = useState({ event_type: '', description: '' });
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-200';

  const fetchDeviceTypes = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/types`);
      const data = await res.json();
      if (data.success) setDeviceTypes(data.types || {});
    } catch (e) { console.error(e); }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/device-lifecycle/list?limit=500`;
      if (typeFilter !== 'all') url += `&device_type=${typeFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setDevices(data.devices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [typeFilter, statusFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/stats`);
      const data = await res.json();
      if (data.success) setStats(data.stats || { total: 0, by_status: {} });
    } catch (e) { console.error(e); }
  }, []);

  const fetchTimeline = async (id) => {
    setLoadingTimeline(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/${id}/timeline`);
      const data = await res.json();
      if (data.success) setTimeline(data.events || []);
    } catch (e) { console.error(e); }
    finally { setLoadingTimeline(false); }
  };

  useEffect(() => { fetchDeviceTypes(); fetchDevices(); fetchStats(); }, [fetchDeviceTypes, fetchDevices, fetchStats]);

  const openDetailModal = async (device) => { setSelectedDevice(device); setShowDetailModal(true); await fetchTimeline(device.id); };
  
  const openCreateModal = () => {
    setEditMode(false);
    setFormData({ device_type: 'tablet', serial_number: '', manufacturer: '', model: '', os_name: '', os_version: '', software_version: '', purchase_date: '', warranty_end: '', license_valid_until: '', assigned_location_code: '', responsible_technician: '', notes: '', status: 'in_storage' });
    setShowEditModal(true);
  };

  const openEditModal = (device) => { setEditMode(true); setFormData({ ...device }); setShowDetailModal(false); setShowEditModal(true); };

  const handleSaveDevice = async () => {
    if (!formData.serial_number) { toast.error('Seriennummer erforderlich'); return; }
    try {
      const url = editMode ? `${BACKEND_URL}/api/device-lifecycle/${formData.id}` : `${BACKEND_URL}/api/device-lifecycle/create`;
      const res = await fetch(url, { method: editMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) { toast.success(editMode ? 'Aktualisiert' : 'Erstellt'); setShowEditModal(false); fetchDevices(); fetchStats(); }
      else toast.error(data.detail || 'Fehler');
    } catch (e) { toast.error('Fehler'); }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice || !window.confirm(`"${selectedDevice.serial_number}" löschen?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/${selectedDevice.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Gelöscht'); setShowDetailModal(false); fetchDevices(); fetchStats(); }
      else toast.error(data.detail || 'Fehler');
    } catch (e) { toast.error('Fehler'); }
  };

  const handleAddEvent = async () => {
    if (!eventData.event_type) { toast.error('Event-Typ wählen'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/device-lifecycle/${selectedDevice.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventData) });
      const data = await res.json();
      if (data.success) { toast.success('Hinzugefügt'); setShowEventModal(false); setEventData({ event_type: '', description: '' }); fetchTimeline(selectedDevice.id); }
      else toast.error('Fehler');
    } catch (e) { toast.error('Fehler'); }
  };

  const getStatusBadge = (status) => {
    const cfg = DEVICE_STATUSES[status] || DEVICE_STATUSES.active;
    const colors = { green: 'bg-green-500/20 text-green-500', blue: 'bg-blue-500/20 text-blue-500', yellow: 'bg-yellow-500/20 text-yellow-500', red: 'bg-red-500/20 text-red-500' };
    return <Badge variant="outline" className={`${colors[cfg.color]} px-2 py-1`}>{cfg.label}</Badge>;
  };

  const formatDate = (d) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; } };
  const isExpired = (d) => { if (!d) return false; try { return new Date(d) < new Date(); } catch { return false; } };
  const isExpiringSoon = (d) => { if (!d) return false; try { const dt = new Date(d); return dt > new Date() && (dt - new Date()) < 30*24*60*60*1000; } catch { return false; } };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>Geräte-Lifecycle-Management</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Verwalten Sie alle Geräte mit vollständiger Historie</p>
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
      <div className="grid grid-cols-5 gap-4">
        <Card className={`p-4 cursor-pointer ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''} ${cardBg}`} onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-primary" />
            <div><p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{stats.total}</p><p className="text-sm text-gray-500">Gesamt</p></div>
          </div>
        </Card>
        {Object.entries(DEVICE_STATUSES).map(([k, v]) => (
          <Card key={k} className={`p-4 cursor-pointer ${statusFilter === k ? 'ring-2' : ''} ${cardBg}`} onClick={() => setStatusFilter(statusFilter === k ? 'all' : k)}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-${v.color}-500`} />
              <div><p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{stats.by_status?.[k] || 0}</p><p className="text-xs text-gray-500">{v.label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Suche..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`w-full pl-10 pr-4 py-2 rounded-lg border ${inputBg}`} />
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
        {loading ? <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
        : devices.length === 0 ? <div className="flex flex-col items-center py-12"><Monitor className="w-12 h-12 mb-3 text-gray-400" /><p className="text-gray-500 mb-4">Keine Geräte</p><Button onClick={openCreateModal} variant="outline"><Plus className="w-4 h-4 mr-2" />Anlegen</Button></div>
        : <table className="w-full">
            <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
              <tr>{['Typ','Seriennummer','Modell','Standort','Status','Garantie','Lizenz',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} onClick={() => openDetailModal(d)} className={`border-t cursor-pointer ${isDark ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-sm">{deviceTypes[d.device_type]?.label || d.device_type}</td>
                  <td className={`px-4 py-3 font-mono font-semibold ${isDark ? 'text-white' : ''}`}>{d.serial_number}</td>
                  <td className="px-4 py-3 text-sm">{d.manufacturer} {d.model}</td>
                  <td className="px-4 py-3 text-sm">{d.assigned_location_code || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-sm"><span className={isExpired(d.warranty_end)?'text-red-500':isExpiringSoon(d.warranty_end)?'text-yellow-500':''}>{formatDate(d.warranty_end)}</span></td>
                  <td className="px-4 py-3 text-sm"><span className={isExpired(d.license_valid_until)?'text-red-500':isExpiringSoon(d.license_valid_until)?'text-yellow-500':''}>{formatDate(d.license_valid_until)}</span></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><Button size="sm" variant="ghost" onClick={() => openDetailModal(d)}><ChevronRight className="w-4 h-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          {selectedDevice && <>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : ''}>{selectedDevice.serial_number} - {deviceTypes[selectedDevice.device_type]?.label}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Gerätedaten</h4>
                <div className="space-y-2 text-sm">
                  {[['Hersteller', selectedDevice.manufacturer], ['Modell', selectedDevice.model], ['OS', `${selectedDevice.os_name || '-'} ${selectedDevice.os_version || ''}`], ['Software', selectedDevice.software_version]].map(([l,v]) => <div key={l} className="flex justify-between"><span className="text-gray-500">{l}:</span><span className={isDark?'text-white':''}>{v||'-'}</span></div>)}
                </div>
              </Card>
              <Card className={`p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
                <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : ''}`}>Status & Standort</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Status:</span>{getStatusBadge(selectedDevice.status)}</div>
                  <div className="flex justify-between"><span className="text-gray-500">Standort:</span><span className={isDark?'text-white':''}>{selectedDevice.assigned_location_code || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Garantie:</span><span className={isExpired(selectedDevice.warranty_end)?'text-red-500':isDark?'text-white':''}>{formatDate(selectedDevice.warranty_end)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Lizenz:</span><span className={isExpired(selectedDevice.license_valid_until)?'text-red-500':isDark?'text-white':''}>{formatDate(selectedDevice.license_valid_until)}</span></div>
                </div>
              </Card>
            </div>
            {/* Timeline */}
            <Card className={`p-4 mt-4 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
              <div className="flex justify-between mb-3">
                <h4 className={`font-semibold ${isDark ? 'text-white' : ''}`}>Timeline</h4>
                <Button size="sm" variant="outline" onClick={() => setShowEventModal(true)}><Plus className="w-4 h-4 mr-1" />Event</Button>
              </div>
              {loadingTimeline ? <div className="flex justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin" /></div>
              : timeline.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">Keine Events</p>
              : <div className="space-y-2 max-h-48 overflow-y-auto">
                  {timeline.map((ev, i) => {
                    const Icon = EVENT_ICONS[ev.event_type] || Clock;
                    return <div key={i} className={`flex gap-3 p-2 rounded ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                      <Icon className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div className="flex-1"><p className={`text-sm ${isDark?'text-white':''}`}>{ev.description}</p><p className="text-xs text-gray-400">{formatDate(ev.timestamp)}</p></div>
                    </div>;
                  })}
                </div>
              }
            </Card>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => openEditModal(selectedDevice)}><Edit2 className="w-4 h-4 mr-2" />Bearbeiten</Button>
              <Button variant="destructive" onClick={handleDeleteDevice}><Trash2 className="w-4 h-4 mr-2" />Löschen</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className={`max-w-2xl ${isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
          <DialogHeader><DialogTitle className={isDark?'text-white':''}>{editMode ? 'Bearbeiten' : 'Neu'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Gerätetyp</label>
              <Select value={formData.device_type||'tablet'} onValueChange={v => setFormData({...formData, device_type: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(deviceTypes).map(([k,t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Seriennummer *</label><input value={formData.serial_number||''} onChange={e => setFormData({...formData, serial_number: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Hersteller</label><input value={formData.manufacturer||''} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Modell</label><input value={formData.model||''} onChange={e => setFormData({...formData, model: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Betriebssystem</label><input value={formData.os_name||''} onChange={e => setFormData({...formData, os_name: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>OS Version</label><input value={formData.os_version||''} onChange={e => setFormData({...formData, os_version: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Kaufdatum</label><input type="date" value={formData.purchase_date||''} onChange={e => setFormData({...formData, purchase_date: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Garantie bis</label><input type="date" value={formData.warranty_end||''} onChange={e => setFormData({...formData, warranty_end: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Lizenz bis</label><input type="date" value={formData.license_valid_until||''} onChange={e => setFormData({...formData, license_valid_until: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Standort</label><input value={formData.assigned_location_code||''} onChange={e => setFormData({...formData, assigned_location_code: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} placeholder="z.B. BERE01" /></div>
            <div className="col-span-2"><label className={`text-sm ${isDark?'text-gray-300':''}`}>Notizen</label><textarea value={formData.notes||''} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditModal(false)}>Abbrechen</Button><Button onClick={handleSaveDevice} className="bg-[#c00000] hover:bg-[#a00000] text-white">{editMode ? 'Speichern' : 'Erstellen'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className={isDark ? 'bg-[#2a2a2a] border-gray-700' : ''}>
          <DialogHeader><DialogTitle className={isDark?'text-white':''}>Event hinzufügen</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Event-Typ *</label>
              <Select value={eventData.event_type||''} onValueChange={v => setEventData({...eventData, event_type: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note_added">Notiz</SelectItem>
                  <SelectItem value="repaired">Reparatur</SelectItem>
                  <SelectItem value="software_updated">Software-Update</SelectItem>
                  <SelectItem value="warranty_claimed">Garantiefall</SelectItem>
                  <SelectItem value="license_renewed">Lizenz erneuert</SelectItem>
                </SelectContent>
              </Select></div>
            <div><label className={`text-sm ${isDark?'text-gray-300':''}`}>Beschreibung</label><textarea value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} rows={3} className={`w-full mt-1 px-3 py-2 rounded border ${inputBg}`} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEventModal(false)}>Abbrechen</Button><Button onClick={handleAddEvent} className="bg-[#c00000] hover:bg-[#a00000] text-white">Hinzufügen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceLifecycleManager;
