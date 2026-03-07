/**
 * Device Agent Management Page
 * Echtzeit-Überwachung und Verwaltung von TSRID-Geräten
 * Mit Pagination für 1000+ Geräte
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Monitor, Wifi, WifiOff, MapPin, Clock, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Search, Filter,
  Cpu, HardDrive, MemoryStick, Globe, Settings, Link, Unlink,
  Activity, Server, Building, ChevronRight, Eye,
  ChevronLeft, ChevronsLeft, ChevronsRight, Power, MessageSquare, Terminal
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const DeviceAgentManagement = () => {
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [assignForm, setAssignForm] = useState({ location_code: '', device_number: '' });
  const [filter, setFilter] = useState({ status: 'all', assigned: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, assigned: 0, unassigned: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [commandHistory, setCommandHistory] = useState([]);
  const wsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchTerm]);

  // Fetch devices with pagination and filters
  const fetchDevices = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.assigned !== 'all') params.append('assigned', filter.assigned === 'assigned' ? 'true' : 'false');
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      const response = await fetch(`${BACKEND_URL}/api/device-agent/devices?${params}`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices || []);
        setPagination(prev => ({
          ...prev,
          page: data.pagination?.page || 1,
          total: data.pagination?.total || 0,
          total_pages: data.pagination?.total_pages || 1
        }));
        setStats({
          total: data.total || 0,
          online: data.online || 0,
          offline: data.offline || 0,
          assigned: data.assigned || 0,
          unassigned: data.unassigned || 0
        });
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, pagination.limit]);

  // Fetch when filters or search changes
  useEffect(() => {
    fetchDevices(1);
  }, [filter, debouncedSearch]);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/locations`);
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    fetchDevices();
    fetchLocations();

    // Auto-Refresh alle 30 Sekunden für Echtzeit-Status
    const refreshInterval = setInterval(() => {
      fetchDevices(pagination.page);
    }, 30000);

    // Connect to WebSocket
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/device-agent/ws/admin`);
    
    ws.onopen = () => {
      console.log('Admin WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'initial_devices':
          setDevices(data.devices || []);
          break;
        case 'device_registered':
        case 'device_heartbeat':
        case 'device_connected':
        case 'device_disconnected':
        case 'device_assigned':
        case 'device_unassigned':
          // Refresh device list
          fetchDevices();
          
          // Show toast for important events
          if (data.type === 'device_registered') {
            toast.success(`Neues Gerät registriert: ${data.device?.computername || 'Unbekannt'}`);
          } else if (data.type === 'device_assigned') {
            toast.success(`Gerät zugewiesen: ${data.location_code}-${data.device_number}`);
          }
          break;
        default:
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(refreshInterval);
    };
  }, [fetchDevices, fetchLocations]);

  // Assign device to location
  const assignDevice = async () => {
    if (!selectedDevice || !assignForm.location_code || !assignForm.device_number) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice.device_id,
          location_code: assignForm.location_code,
          device_number: assignForm.device_number,
          assigned_by: 'admin'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Gerät erfolgreich zugewiesen!');
        setShowAssignDialog(false);
        setAssignForm({ location_code: '', device_number: '' });
        fetchDevices();
      } else {
        toast.error(data.detail || 'Fehler bei der Zuweisung');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    }
  };

  // Unassign device
  const unassignDevice = async (deviceId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/unassign/${deviceId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Zuweisung entfernt');
        fetchDevices();
        setSelectedDevice(null);
      }
    } catch (error) {
      toast.error('Fehler beim Entfernen der Zuweisung');
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${Math.floor(hours / 24)}d`;
  };

  // Remote Command senden
  const sendRemoteCommand = async (command, params = {}, targets = []) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/remote/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          params,
          target_devices: targets.length > 0 ? targets : selectedDevices
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Befehl '${command}' an ${data.target_count} Gerät(e) gesendet`);
        setShowRemoteDialog(false);
        setSelectedDevices([]);
        fetchCommandHistory();
      } else {
        toast.error(data.error || 'Fehler beim Senden des Befehls');
      }
    } catch (error) {
      toast.error('Fehler beim Senden des Befehls');
    }
  };

  // Command History laden
  const fetchCommandHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/remote/history?limit=20`);
      const data = await response.json();
      if (data.success) {
        setCommandHistory(data.commands || []);
      }
    } catch (error) {
      console.error('Error fetching command history:', error);
    }
  };

  // Toggle Geräteauswahl für Remote-Befehle
  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // Alle Online-Geräte auswählen
  const selectAllOnlineDevices = () => {
    const onlineIds = devices.filter(d => d.status === 'online').map(d => d.device_id);
    setSelectedDevices(onlineIds);
  };

  // Page change handler
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchDevices(newPage);
  };

  return (
    <div className="text-white" data-testid="device-agent-management">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Server className="w-8 h-8 text-[#d50c2d]" />
          <div>
            <h1 className="text-2xl font-bold">Device Agent Management</h1>
            <p className="text-gray-400 text-sm">Echtzeit-Überwachung und Stationszuweisung der Windows-Geräte</p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedDevices.length > 0 && (
            <Button 
              onClick={() => setShowRemoteDialog(true)}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="remote-control-btn"
            >
              <Settings className="w-4 h-4 mr-2" />
              Remote Control ({selectedDevices.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowRemoteDialog(true)}
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
            data-testid="open-remote-dialog-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            Remote
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchDevices}
            className="border-[#444]"
            data-testid="refresh-devices-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-gray-400 text-sm">Geräte gesamt</div>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.online}</div>
              <div className="text-gray-400 text-sm">Online</div>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <WifiOff className="w-8 h-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.offline}</div>
              <div className="text-gray-400 text-sm">Offline</div>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <Link className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.assigned}</div>
              <div className="text-gray-400 text-sm">Zugewiesen</div>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.unassigned}</div>
              <div className="text-gray-400 text-sm">Nicht zugewiesen</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a1a1a] border-[#333] p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Suche nach Name, Station, TeamViewer ID, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#262626] border-[#444] text-white"
                data-testid="device-search-input"
              />
            </div>
          </div>
          <Select 
            value={filter.status} 
            onValueChange={(value) => setFilter({ ...filter, status: value })}
          >
            <SelectTrigger className="w-40 bg-[#262626] border-[#444]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-[#444]">
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={filter.assigned} 
            onValueChange={(value) => setFilter({ ...filter, assigned: value })}
          >
            <SelectTrigger className="w-40 bg-[#262626] border-[#444]">
              <SelectValue placeholder="Zuweisung" />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-[#444]">
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="assigned">Zugewiesen</SelectItem>
              <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="flex gap-6">
        {/* Device List - Full Width */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              Geräte ({pagination.total})
              {debouncedSearch && <span className="text-sm font-normal text-gray-400 ml-2">- Suche: "{debouncedSearch}"</span>}
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center text-gray-500 py-8">Lade Geräte...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                {devices.map((device) => (
                <Card 
                  key={device.device_id}
                  className={`
                    bg-[#1a1a1a] border-[#333] p-4 cursor-pointer transition-all
                    hover:border-[#d50c2d]/50 hover:scale-[1.02]
                    ${!device.assigned ? 'border-l-4 border-l-yellow-500' : ''}
                    ${selectedDevices.includes(device.device_id) ? 'ring-2 ring-orange-500' : ''}
                  `}
                  onClick={() => setSelectedDevice(device)}
                  data-testid={`device-card-${device.device_id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.device_id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDeviceSelection(device.device_id);
                        }}
                        className="w-4 h-4 rounded border-gray-600 bg-[#262626] text-orange-500 focus:ring-orange-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <span className="font-bold">{device.computername}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.status === 'online' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          <Activity className="w-3 h-3 mr-1 animate-pulse" />
                          Online
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                          <WifiOff className="w-3 h-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {device.assigned && device.location_code ? (
                    <div className="text-sm text-cyan-400 mb-2">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {device.location_code}-{device.device_number} • {device.location_name}
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-400 mb-2">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Keine Stationszuweisung
                    </div>
                  )}
                  
                  {/* TeamViewer ID prominent display */}
                  {device.teamviewer_id && device.teamviewer_id !== 'not found' && (
                    <div className="text-sm text-yellow-400 mb-2 font-mono">
                      TV-ID: {device.teamviewer_id}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                      <Globe className="w-3 h-3 inline mr-1" />
                      {device.network?.ip_address || '-'}
                    </span>
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTimeAgo(device.last_seen)}
                    </span>
                  </div>
                  
                  {/* Process Status Indicators - nur grün wenn Gerät online */}
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${device.status === 'online' && device.process_status?.teamviewer === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      TV {device.status === 'online' && device.process_status?.teamviewer === 'running' ? '●' : '○'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${device.status === 'online' && device.process_status?.tsrid === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      TSRID {device.status === 'online' && device.process_status?.tsrid === 'running' ? '●' : '○'}
                    </span>
                  </div>
                </Card>
              ))}
              
              {devices.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Keine Geräte gefunden
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#333]">
                <div className="text-sm text-gray-400">
                  Seite {pagination.page} von {pagination.total_pages} ({pagination.total} Geräte)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDevices(1)}
                    disabled={pagination.page === 1}
                    className="border-[#444] disabled:opacity-50"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDevices(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="border-[#444] disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-3 py-1 bg-[#262626] rounded text-sm">
                    {pagination.page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDevices(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="border-[#444] disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDevices(pagination.total_pages)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="border-[#444] disabled:opacity-50"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Device Detail Modal */}
      <Dialog open={!!selectedDevice} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-6 h-6" />
                <span className="text-xl">{selectedDevice?.computername}</span>
              </div>
              {selectedDevice?.status === 'online' ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-lg px-3 py-1">
                  <Activity className="w-4 h-4 mr-2 animate-pulse" />
                  ONLINE
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-lg px-3 py-1">
                  OFFLINE
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono text-xs">
              {selectedDevice?.device_id}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-6 py-4">
              {/* Station Assignment */}
              <Card className={`p-4 ${selectedDevice.assigned ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Stationszuweisung
                </h3>
                {selectedDevice.assigned ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {selectedDevice.location_code}-{selectedDevice.device_number}
                      </div>
                      <div className="text-gray-300">{selectedDevice.location_name}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => unassignDevice(selectedDevice.device_id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      data-testid="unassign-device-btn"
                    >
                      <Unlink className="w-4 h-4 mr-2" />
                      Entfernen
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-yellow-400">Keine Stationszuweisung</p>
                    <Button 
                      onClick={() => setShowAssignDialog(true)}
                      className="bg-[#d50c2d] hover:bg-[#b80a28]"
                      data-testid="assign-device-btn"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Zuweisen
                    </Button>
                  </div>
                )}
              </Card>

              {/* Hardware IDs */}
              <Card className="bg-[#262626] border-[#444] p-4">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-1">
                  <Server className="w-3 h-3" /> Hardware-Identifikation
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-gray-500 text-xs uppercase">TeamViewer ID</span>
                    <div className="font-mono text-lg text-yellow-400 font-bold">{selectedDevice.teamviewer_id || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase">UUID</span>
                    <div className="font-mono text-xs text-cyan-400 break-all">{selectedDevice.hardware_ids?.uuid || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase">BIOS Serial</span>
                    <div className="font-mono text-sm text-gray-300">{selectedDevice.hardware_ids?.bios_serial || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase">Mainboard Serial</span>
                    <div className="font-mono text-sm text-gray-300">{selectedDevice.hardware_ids?.mainboard_serial || '-'}</div>
                  </div>
                </div>
              </Card>

              {/* Hardware & Network Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3" /> Hersteller
                  </h4>
                  <div className="font-bold text-sm">{selectedDevice.hardware?.manufacturer || '-'}</div>
                  <div className="text-xs text-gray-400">{selectedDevice.hardware?.model || '-'}</div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> CPU
                  </h4>
                  <div className="font-bold text-xs">{selectedDevice.hardware?.cpu || '-'}</div>
                  <div className="text-xs text-gray-400">
                    {selectedDevice.hardware?.cpu_cores} Kerne / {selectedDevice.hardware?.cpu_threads} Threads
                  </div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <MemoryStick className="w-3 h-3" /> RAM
                  </h4>
                  <div className="font-bold">{selectedDevice.hardware?.ram_gb || '-'} GB</div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Speicher
                  </h4>
                  <div className="text-sm">{selectedDevice.hardware?.disks || '-'}</div>
                </Card>
              </div>

              {/* Network & OS */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Netzwerk
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400 text-xs">IP-Adresse:</span>
                      <div className="font-mono">{selectedDevice.network?.ip_address || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">MAC-Adresse:</span>
                      <div className="font-mono text-sm">{selectedDevice.network?.mac_address || '-'}</div>
                    </div>
                  </div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                    <Settings className="w-3 h-3" /> Betriebssystem
                  </h4>
                  <div className="font-bold">{selectedDevice.os?.windows_version || '-'}</div>
                  <div className="text-sm text-gray-400">Build {selectedDevice.os?.windows_build || '-'}</div>
                </Card>
              </div>

              {/* Timestamps */}
              <Card className="bg-[#1a1a1a] border-[#333] p-4">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Zeitstempel
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Registriert:</span>
                    <div className="text-gray-300">{selectedDevice.registered_at ? new Date(selectedDevice.registered_at).toLocaleString('de-DE') : '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Zuletzt gesehen:</span>
                    <div className="text-gray-300">{selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString('de-DE') : '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Aktualisiert:</span>
                    <div className="text-gray-300">{selectedDevice.updated_at ? new Date(selectedDevice.updated_at).toLocaleString('de-DE') : '-'}</div>
                  </div>
                  {selectedDevice.assigned_at && (
                    <div>
                      <span className="text-gray-500">Zugewiesen:</span>
                      <div className="text-gray-300">{new Date(selectedDevice.assigned_at).toLocaleString('de-DE')}</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Station zuweisen</DialogTitle>
            <DialogDescription className="text-gray-400">
              Weisen Sie {selectedDevice?.computername} einer Station zu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Standort</label>
              <Select 
                value={assignForm.location_code} 
                onValueChange={(value) => setAssignForm({ ...assignForm, location_code: value })}
              >
                <SelectTrigger className="bg-[#262626] border-[#444]">
                  <SelectValue placeholder="Standort auswählen" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444] max-h-60">
                  {locations.map((loc) => (
                    <SelectItem key={loc.location_code} value={loc.location_code}>
                      {loc.location_code} - {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Gerätenummer</label>
              <Input
                value={assignForm.device_number}
                onChange={(e) => setAssignForm({ ...assignForm, device_number: e.target.value })}
                placeholder="z.B. 01, 02, 03..."
                className="bg-[#262626] border-[#444]"
              />
            </div>
            
            {assignForm.location_code && assignForm.device_number && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <div className="text-cyan-400 font-bold">
                  Vorschau: {assignForm.location_code}-{assignForm.device_number}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)} className="border-[#444]">
              Abbrechen
            </Button>
            <Button onClick={assignDevice} className="bg-[#d50c2d] hover:bg-[#b80a28]">
              Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remote Control Dialog */}
      <Dialog open={showRemoteDialog} onOpenChange={setShowRemoteDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-orange-400" />
              Remote Control Center
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Senden Sie Befehle an ausgewählte oder alle Geräte
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Geräteauswahl */}
            <Card className="bg-[#262626] border-[#444] p-4">
              <h4 className="font-bold mb-3">Zielgeräte auswählen</h4>
              <div className="flex gap-2 mb-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={selectAllOnlineDevices}
                  className="border-green-500/50 text-green-400"
                >
                  Alle Online ({stats.online})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedDevices(devices.map(d => d.device_id))}
                  className="border-[#444]"
                >
                  Alle ({stats.total})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedDevices([])}
                  className="border-red-500/50 text-red-400"
                >
                  Auswahl löschen
                </Button>
              </div>
              <div className="text-sm text-gray-400">
                {selectedDevices.length > 0 
                  ? `${selectedDevices.length} Gerät(e) ausgewählt`
                  : 'Kein Gerät ausgewählt - Befehl wird an alle Online-Geräte gesendet'
                }
              </div>
              {selectedDevices.length > 0 && selectedDevices.length <= 10 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedDevices.map(id => {
                    const device = devices.find(d => d.device_id === id);
                    return (
                      <Badge key={id} className="bg-[#333] text-gray-300">
                        {device?.computername || id.substring(0, 15)}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Verfügbare Befehle */}
            <Card className="bg-[#262626] border-[#444] p-4">
              <h4 className="font-bold mb-3">Verfügbare Befehle</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button 
                  onClick={() => sendRemoteCommand('restart_agent')}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Agent neustarten
                </Button>
                <Button 
                  onClick={() => sendRemoteCommand('restart_pc')}
                  className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  PC neustarten
                </Button>
                <Button 
                  onClick={() => sendRemoteCommand('shutdown_pc')}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  PC herunterfahren
                </Button>
                <Button 
                  onClick={() => {
                    const msg = prompt('Nachricht eingeben:');
                    if (msg) sendRemoteCommand('message', { text: msg });
                  }}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Nachricht senden
                </Button>
                <Button 
                  onClick={() => {
                    const interval = prompt('Heartbeat-Intervall (Sekunden):', '60');
                    if (interval) sendRemoteCommand('update_config', { heartbeat_interval: parseInt(interval) });
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Config ändern
                </Button>
                <Button 
                  onClick={() => {
                    const script = prompt('PowerShell-Befehl eingeben:');
                    if (script) sendRemoteCommand('run_script', { script });
                  }}
                  className="bg-gray-600 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  Script ausführen
                </Button>
              </div>
            </Card>

            {/* Befehlsverlauf */}
            <Card className="bg-[#262626] border-[#444] p-4">
              <h4 className="font-bold mb-3 flex items-center justify-between">
                <span>Befehlsverlauf</span>
                <Button size="sm" variant="ghost" onClick={fetchCommandHistory} className="text-gray-400">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </h4>
              {commandHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">Noch keine Befehle gesendet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {commandHistory.map((cmd, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] rounded p-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-mono text-orange-400">{cmd.command}</span>
                        <span className="text-gray-500">{cmd.target_count} Gerät(e)</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(cmd.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceAgentManagement;
