import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Search, RefreshCw, Plus, Edit2, Trash2, Clock, MapPin, Key, Tool, XCircle, ChevronRight, Printer, Tablet, Box, AlertTriangle, CheckCircle, Archive } from 'lucide-react';
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

const DeviceLifecycleManager = ({ theme, selectedTenantId }) => {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, by_status: {} });
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);

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
      console.error('Error fetching devices:', error);
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
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
    fetchStats();
  }, [fetchDeviceTypes, fetchDevices, fetchStats]);

  const openCreateModal = () => {
    setEditMode(false);
    setFormData({ device_type: 'tablet', serial_number: '', manufacturer: '', model: '', status: 'in_storage' });
    setShowEditModal(true);
  };

  const handleSaveDevice = async () => {
    try {
      const url = editMode ? `${BACKEND_URL}/api/device-lifecycle/${formData.id}` : `${BACKEND_URL}/api/device-lifecycle/create`;
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
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const getStatusBadge = (status) => {
    const config = DEVICE_STATUSES[status] || DEVICE_STATUSES.active;
    const colors = {
      green: 'bg-green-500/20 text-green-500',
      blue: 'bg-blue-500/20 text-blue-500',
      yellow: 'bg-yellow-500/20 text-yellow-500',
      red: 'bg-red-500/20 text-red-500'
    };
    return <Badge variant="outline" className={`${colors[config.color]} px-2 py-1`}>{config.label}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('de-DE'); } catch { return dateStr; }
  };

  return (
    <div className="space-y-6">
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
          <Button onClick={() => { fetchDevices(); fetchStats(); }} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={openCreateModal} className="bg-[#c00000] hover:bg-[#a00000] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Neues Gerät
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className={`p-4 cursor-pointer ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}`} onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : ''}`}>{stats.total}</p>
              <p className="text-sm text-gray-500">Gesamt</p>
            </div>
          </div>
        </Card>
        {Object.entries(DEVICE_STATUSES).map(([key, config]) => (
          <Card key={key} className={`p-4 cursor-pointer ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}`} onClick={() => setStatusFilter(key)}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-${config.color}-500`} />
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : ''}`}>{stats.by_status?.[key] || 0}</p>
                <p className="text-xs text-gray-500">{config.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : ''}`}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(deviceTypes).map(([key, type]) => (
              <SelectItem key={key} value={key}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Monitor className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-gray-500">Keine Geräte gefunden</p>
            <Button onClick={openCreateModal} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Erstes Gerät anlegen
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Seriennummer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Modell</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Standort</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Garantie</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className={`border-t ${theme === 'dark' ? 'border-gray-700' : ''}`}>
                  <td className="px-4 py-3 text-sm">{deviceTypes[device.device_type]?.label || device.device_type}</td>
                  <td className={`px-4 py-3 font-mono ${theme === 'dark' ? 'text-white' : ''}`}>{device.serial_number}</td>
                  <td className="px-4 py-3 text-sm">{device.manufacturer} {device.model}</td>
                  <td className="px-4 py-3 text-sm">{device.assigned_location_code || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(device.status)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(device.warranty_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : ''}>
              {editMode ? 'Gerät bearbeiten' : 'Neues Gerät'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : ''}`}>Gerätetyp</label>
              <Select value={formData.device_type || 'tablet'} onValueChange={(v) => setFormData({...formData, device_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(deviceTypes).map(([key, type]) => (
                    <SelectItem key={key} value={key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : ''}`}>Seriennummer *</label>
              <input
                value={formData.serial_number || ''}
                onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
              />
            </div>
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : ''}`}>Hersteller</label>
              <input
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
              />
            </div>
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : ''}`}>Modell</label>
              <input
                value={formData.model || ''}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
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
    </div>
  );
};

export default DeviceLifecycleManager;
