/**
 * Device Agent Management Page
 * Echtzeit-Überwachung und Verwaltung von TSRID-Geräten
 * Mit Pagination für 1000+ Geräte
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Monitor, Wifi, WifiOff, MapPin, Clock, RefreshCw, 
  AlertTriangle, Search,
  Cpu, HardDrive, MemoryStick, Globe, Settings, Link, Unlink,
  Activity, Server, Building, Eye,
  ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, Power, MessageSquare, Terminal,
  FileText, Plus, Edit, Trash2, Timer, Send, History, Copy, Wrench,
  Bold, Italic, Underline
} from 'lucide-react';
import MessageEditor from '../components/MessageEditor';
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
  const [messageText, setMessageText] = useState('');
  const [messageDuration, setMessageDuration] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [configInterval, setConfigInterval] = useState('60');
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', message_text: '', duration_minutes: '' });
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(BACKEND_URL);
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

  // Load templates and history when Remote Dialog opens
  useEffect(() => {
    if (showRemoteDialog) {
      fetchTemplates();
      fetchCommandHistory();
    }
  }, [showRemoteDialog]);

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
        // Modal NICHT schließen
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

  // Templates laden
  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/templates`);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Template speichern
  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.message_text.trim()) {
      toast.error('Name und Nachricht erforderlich');
      return;
    }

    try {
      const url = editingTemplate 
        ? `${BACKEND_URL}/api/device-agent/templates/${editingTemplate.template_id}`
        : `${BACKEND_URL}/api/device-agent/templates`;
      
      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateForm.name,
          message_text: templateForm.message_text,
          duration_minutes: templateForm.duration_minutes ? parseInt(templateForm.duration_minutes) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingTemplate ? 'Vorlage aktualisiert' : 'Vorlage erstellt');
        setShowTemplateDialog(false);
        setEditingTemplate(null);
        setTemplateForm({ name: '', message_text: '', duration_minutes: '' });
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    }
  };

  // Template löschen
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Vorlage wirklich löschen?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/device-agent/templates/${templateId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Vorlage gelöscht');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Template aus Vorlage senden
  const sendTemplateMessage = (template) => {
    sendRemoteCommand('message', { 
      text: template.message_text, 
      duration_minutes: template.duration_minutes 
    });
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
      {/* Server URL Banner */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-cyan-400" />
          <div>
            <span className="text-gray-400 text-sm">API Server: </span>
            <span className="text-cyan-400 font-mono text-sm">{BACKEND_URL}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(BACKEND_URL);
              toast.success('URL kopiert!');
            }}
            className="border-[#444] text-gray-400 hover:text-white"
          >
            <Copy className="w-3 h-3 mr-1" />
            Kopieren
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowServerSettings(true)}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
          >
            <Wrench className="w-3 h-3 mr-1" />
            Agent Script
          </Button>
        </div>
      </div>

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
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-5xl max-h-[90vh] overflow-y-auto">
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
              <h4 className="font-bold mb-3">Schnellbefehle</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                  onClick={() => sendRemoteCommand('screenshot')}
                  className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Screenshot
                </Button>
              </div>

              {/* Nachricht senden mit Timer */}
              <div className="space-y-3">
                <h5 className="text-sm text-gray-400 font-medium">Nachricht mit optionalem Countdown</h5>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nachricht eingeben..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="bg-[#1a1a1a] border-[#444] text-white flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="Min"
                      value={messageDuration}
                      onChange={(e) => setMessageDuration(e.target.value)}
                      className="bg-[#1a1a1a] border-[#444] text-white w-20"
                      title="Countdown-Timer in Minuten (optional)"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      if (messageText.trim()) {
                        sendRemoteCommand('message', { 
                          text: messageText, 
                          duration_minutes: messageDuration ? parseInt(messageDuration) : null 
                        });
                        setMessageText('');
                        setMessageDuration('');
                      } else {
                        toast.error('Bitte Nachricht eingeben');
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={!messageText.trim()}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Senden
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Timer optional: z.B. 120 für 2 Stunden Countdown</p>

                {/* Heartbeat Config */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Heartbeat-Intervall (Sek.)"
                    value={configInterval}
                    onChange={(e) => setConfigInterval(e.target.value)}
                    className="bg-[#1a1a1a] border-[#444] text-white w-48"
                  />
                  <Button 
                    onClick={() => {
                      const interval = parseInt(configInterval);
                      if (interval >= 10 && interval <= 3600) {
                        sendRemoteCommand('update_config', { heartbeat_interval: interval });
                      } else {
                        toast.error('Intervall muss zwischen 10 und 3600 Sekunden sein');
                      }
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Config ändern
                  </Button>
                </div>

                {/* PowerShell Script */}
                <div className="flex gap-2">
                  <Input
                    placeholder="PowerShell-Befehl eingeben..."
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="bg-[#1a1a1a] border-[#444] text-white flex-1"
                  />
                  <Button 
                    onClick={() => {
                      if (scriptText.trim()) {
                        sendRemoteCommand('run_script', { script: scriptText });
                        setScriptText('');
                      } else {
                        toast.error('Bitte Script eingeben');
                      }
                    }}
                    className="bg-gray-600 hover:bg-gray-700"
                    disabled={!scriptText.trim()}
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    Ausführen
                  </Button>
                </div>
              </div>
            </Card>

            {/* Nachrichten-Vorlagen */}
            <Card className="bg-[#262626] border-[#444] p-4">
              <h4 className="font-bold mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Nachrichten-Vorlagen
                </span>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: '', message_text: '', duration_minutes: '' });
                    setShowTemplateDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Neue Vorlage
                </Button>
              </h4>
              {templates.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Vorlagen vorhanden</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <div key={template.template_id} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold text-purple-400">{template.name}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateForm({
                                name: template.name,
                                message_text: template.message_text,
                                duration_minutes: template.duration_minutes?.toString() || ''
                              });
                              setShowTemplateDialog(true);
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTemplate(template.template_id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div 
                        className="text-sm text-gray-300 mb-2 line-clamp-2 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: template.message_text }}
                      />
                      {template.duration_minutes && (
                        <div className="text-xs text-yellow-400 mb-2">
                          <Timer className="w-3 h-3 inline mr-1" />
                          {template.duration_minutes} Min. Timer
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={() => sendTemplateMessage(template)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Senden
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Befehlsverlauf */}
            <Card className="bg-[#262626] border-[#444] p-4">
              <h4 className="font-bold mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Befehlsverlauf
                </span>
                <Button size="sm" variant="ghost" onClick={fetchCommandHistory} className="text-gray-400">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </h4>
              {commandHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">Noch keine Befehle gesendet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {commandHistory.map((cmd, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-orange-400 font-bold">{cmd.command}</span>
                        <Badge className="bg-[#333] text-gray-300 text-xs">
                          {cmd.target_count} Gerät(e)
                        </Badge>
                      </div>
                      
                      {/* Nachrichteninhalt anzeigen wenn vorhanden */}
                      {cmd.command === 'message' && cmd.params?.text && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 mb-2">
                          <div 
                            className="text-sm text-purple-300 prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: cmd.params.text }}
                          />
                          {cmd.params.duration_minutes && (
                            <span className="text-xs text-yellow-400">
                              <Timer className="w-3 h-3 inline mr-1" />
                              {cmd.params.duration_minutes} Min. Timer
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Script-Inhalt anzeigen */}
                      {cmd.command === 'run_script' && cmd.params?.script && (
                        <div className="bg-gray-500/10 border border-gray-500/30 rounded p-2 mb-2">
                          <code className="text-xs text-gray-300 break-all">{cmd.params.script}</code>
                        </div>
                      )}
                      
                      {/* Zielgeräte anzeigen */}
                      {cmd.device_names && cmd.device_names.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {cmd.device_names.slice(0, 5).map((name, i) => (
                            <span key={i} className="text-xs bg-[#333] px-2 py-0.5 rounded text-gray-300">
                              {name}
                            </span>
                          ))}
                          {cmd.device_names.length > 5 && (
                            <span className="text-xs text-gray-500">+{cmd.device_names.length - 5} weitere</span>
                          )}
                        </div>
                      )}
                      
                      <div className="text-gray-500 text-xs">
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

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Erstellen Sie eine wiederverwendbare Nachrichtenvorlage
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Name der Vorlage</label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="z.B. 2h Pause, Wartung, etc."
                className="bg-[#262626] border-[#444]"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nachrichtentext</label>
              <MessageEditor
                value={templateForm.message_text}
                onChange={(value) => setTemplateForm({ ...templateForm, message_text: value })}
                placeholder="Geben Sie den Nachrichtentext ein..."
              />
              <p className="text-xs text-gray-500 mt-2">
                <Bold className="w-3 h-3 inline mr-1" />Fett, 
                <Italic className="w-3 h-3 inline mx-1" />Kursiv, 
                <Underline className="w-3 h-3 inline mx-1" />Unterstrichen und Textausrichtung verfügbar
              </p>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Countdown-Timer (optional)</label>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={templateForm.duration_minutes}
                  onChange={(e) => setTemplateForm({ ...templateForm, duration_minutes: e.target.value })}
                  placeholder="Minuten (z.B. 120 für 2h)"
                  className="bg-[#262626] border-[#444] w-48"
                />
                <span className="text-sm text-gray-500">Minuten</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Wenn angegeben, wird ein Countdown auf dem Gerät angezeigt
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)} className="border-[#444]">
              Abbrechen
            </Button>
            <Button onClick={saveTemplate} className="bg-[#d50c2d] hover:bg-[#b80a28]">
              {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Script Dialog */}
      <Dialog open={showServerSettings} onOpenChange={setShowServerSettings}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-6 h-6 text-cyan-400" />
              Agent Installation Script
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Kopieren Sie diesen Code und führen Sie ihn auf dem Windows-Tablet in PowerShell (als Admin) aus
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current URL */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Aktuelle Server-URL
              </h4>
              <div className="flex items-center gap-2">
                <code className="bg-[#262626] px-3 py-2 rounded text-cyan-300 font-mono flex-1">{BACKEND_URL}</code>
                <Button 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(BACKEND_URL);
                    toast.success('URL kopiert!');
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Diese URL wird automatisch im Agent-Script verwendet
              </p>
            </div>

            {/* PowerShell Script */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-bold">PowerShell Installations-Script</h4>
                <Button
                  size="sm"
                  onClick={() => {
                    const script = generateAgentScript(BACKEND_URL);
                    navigator.clipboard.writeText(script);
                    toast.success('Script in Zwischenablage kopiert!');
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Script kopieren
                </Button>
              </div>
              <div className="bg-[#0d0d0d] border border-[#333] rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
{`# TSRID Agent Installer - In PowerShell (Admin) einfügen
# Server: ${BACKEND_URL}

$installPath = "C:\\TSRID-Agent"
$scriptPath = "$installPath\\TSRID-Agent-Service.ps1"
$apiUrl = "${BACKEND_URL}"

# Ordner erstellen
New-Item -ItemType Directory -Path $installPath -Force | Out-Null
Write-Host "[OK] Ordner erstellt: $installPath" -ForegroundColor Green

# Alte Message-Task und Dateien entfernen
schtasks /Delete /TN "TSRID-ShowMessage" /F 2>$null
Remove-Item "$installPath\\message.hta" -Force -ErrorAction SilentlyContinue
Remove-Item "$installPath\\msgtask.xml" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Alte Message-Dateien bereinigt" -ForegroundColor Green

# Logo herunterladen
$logoUrl = "https://customer-assets.emergentagent.com/job_06f80f02-2411-462d-ac08-59775fd1245f/artifacts/7kqzi6kx_Zeichenfl%C3%A4che%201.png"
$logoPath = "$installPath\\logo.png"
try { Invoke-WebRequest -Uri $logoUrl -OutFile $logoPath -UseBasicParsing; Write-Host "[OK] Logo heruntergeladen" -ForegroundColor Green } catch { Write-Host "[!] Logo konnte nicht heruntergeladen werden" -ForegroundColor Yellow }

# Agent-Script erstellen
@'
param([string]$ApiUrl = "${BACKEND_URL}")
$ErrorActionPreference = "Continue"
$global:ComputerName = $env:COMPUTERNAME
$global:LogFile = "C:\TSRID-Agent\agent.log"
$global:DeviceId = "$env:COMPUTERNAME-$((Get-WmiObject Win32_ComputerSystemProduct).UUID)"
$global:ErrorCount = 0

function Write-Log { 
    param([string]$Message,[string]$Level="INFO")
    $ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $line = "[$ts] [$Level] $Message"
    try { Add-Content -Path $global:LogFile -Value $line -ErrorAction SilentlyContinue } catch {}
    if($Level -eq "ERROR") { Write-Host $line -ForegroundColor Red } else { Write-Host $line }
}

function Get-HardwareInfo {
    try {
        $cs = Get-WmiObject Win32_ComputerSystem -ErrorAction Stop
        $cpu = Get-WmiObject Win32_Processor -ErrorAction Stop
        $os = Get-WmiObject Win32_OperatingSystem -ErrorAction Stop
        $bios = Get-WmiObject Win32_BIOS -ErrorAction Stop
        $net = Get-WmiObject Win32_NetworkAdapterConfiguration -ErrorAction Stop | Where-Object { $_.IPEnabled }
        $tvId = "not found"
        @("HKLM:\SOFTWARE\TeamViewer","HKLM:\SOFTWARE\WOW6432Node\TeamViewer") | ForEach-Object { 
            if (Test-Path $_) { $tvId = (Get-ItemProperty $_ -Name ClientID -EA SilentlyContinue).ClientID } 
        }
        if($tvId -is [int]) { $tvId = $tvId.ToString() }
        $tvStatus = if (Get-Process TeamViewer -EA SilentlyContinue) { "running" } else { "stopped" }
        $tsridStatus = if (Get-Process tsrid -EA SilentlyContinue) { "running" } else { "stopped" }
        return @{ 
            device_id = $global:DeviceId
            computername = $global:ComputerName
            uuid = (Get-WmiObject Win32_ComputerSystemProduct).UUID
            bios_serial = [string]$bios.SerialNumber
            teamviewer_id = [string]$tvId
            teamviewer_status = $tvStatus
            tsrid_status = $tsridStatus
            manufacturer = [string]$cs.Manufacturer
            model = [string]$cs.Model
            cpu = [string]$cpu.Name
            ram_gb = [math]::Round($cs.TotalPhysicalMemory/1GB,2)
            ip_address = [string](($net | Select-Object -First 1).IPAddress[0])
            windows_version = [string]$os.Caption
            timestamp = (Get-Date).ToString("o")
        }
    } catch { 
        Write-Log "HW-Info Fehler: $_" "ERROR"
        return @{ device_id=$global:DeviceId; computername=$global:ComputerName; timestamp=(Get-Date).ToString("o") }
    }
}

function Invoke-Api { 
    param([string]$Endpoint,[string]$Method="GET",[hashtable]$Body=$null)
    try { 
        $uri = "$ApiUrl/api/device-agent/$Endpoint"
        $params = @{Uri=$uri; Method=$Method; ContentType="application/json"; TimeoutSec=30}
        if($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
        $result = Invoke-RestMethod @params
        $global:ErrorCount = 0  # Reset error count on success
        return $result
    } catch { 
        $global:ErrorCount++
        Write-Log "API-Fehler ($Endpoint): $($_.Exception.Message)" "ERROR"
        return $null 
    }
}

function Show-BigMessage { 
    param([string]$Message,[int]$DurationMinutes=0)
    try {
        $ts = Get-Date -Format "dd.MM.yyyy HH:mm:ss"
        $safeMsg = $Message -replace "'","" -replace '"',""
        $timerHtml = ""
        $timerVB = ""
        if($DurationMinutes -gt 0) {
            $timerHtml = "<br><br><font face='Segoe UI' color='#ff6600' size='5'>Verbleibend: <span id='cd'>--:--:--</span></font>"
            $timerVB = "t=$DurationMinutes*60:window.setTimeout ""Tick"",1000"
        }
$html = @"
<html>
<head>
<title>TSRID</title>
<HTA:APPLICATION ID="oHTA" BORDER="none" CAPTION="no" SHOWINTASKBAR="yes" SINGLEINSTANCE="yes" SCROLL="no" WINDOWSTATE="maximize"/>
</head>
<script language="VBScript">
Dim t
Sub Window_OnLoad
    window.resizeTo screen.width, screen.height
    window.moveTo 0, 0
    $timerVB
End Sub
Sub Tick
    If t <= 0 Then
        document.getElementById("cd").innerText = "ABGELAUFEN"
        Exit Sub
    End If
    Dim h,m,s
    h = Int(t/3600)
    m = Int((t Mod 3600)/60)
    s = t Mod 60
    document.getElementById("cd").innerText = Right("0"&h,2) & ":" & Right("0"&m,2) & ":" & Right("0"&s,2)
    t = t - 1
    window.setTimeout "Tick",1000
End Sub
Sub CloseMe
    window.close
End Sub
Sub Document_OnKeyDown
    If window.event.keyCode = 27 Then window.close
End Sub
</script>
<body bgcolor="#171717">
<center><br><br><br>
<table bgcolor="#242424" cellpadding="50" style="border: 4px solid #d50c2d;">
<tr><td align="center">
<img src="C:\TSRID-Agent\logo.png" width="180"><br><br>
<font face="Segoe UI" color="#888888" size="4">$ts</font>
</td></tr>
<tr><td align="center">
<font face="Segoe UI" color="#ffffff" size="7"><b>$safeMsg</b></font>
$timerHtml
</td></tr>
<tr><td align="center">
<br>
<input type="button" value="SCHLIESSEN (ESC)" onclick="CloseMe" style="background-color:#d50c2d;color:white;border:none;padding:15px 40px;font-size:20px;cursor:hand;">
</td></tr>
</table>
</center>
</body>
</html>
"@
        $html | Out-File "C:\TSRID-Agent\message.hta" -Encoding ASCII -Force
        Start-Process "mshta.exe" -ArgumentList "C:\TSRID-Agent\message.hta"
        Write-Log "Nachricht angezeigt"
    } catch {
        Write-Log "Show-BigMessage Fehler: $_" "ERROR"
    }
}

function Process-Cmd { 
    param($c)
    try {
        $cmdType = $c.command
        $params = $c.params
        $cmdId = $c.command_id
        Write-Log "Befehl empfangen: $cmdType (ID: $cmdId)"
        $success = $false
        $output = ""
        switch($cmdType) { 
            "message" { 
                Show-BigMessage -Message $params.text -DurationMinutes ([int]$params.duration_minutes)
                $output = "Nachricht angezeigt"
                $success = $true 
            } 
            "restart_pc" { 
                $output = "PC wird neugestartet..."
                $success = $true
                Start-Job { Start-Sleep 3; Restart-Computer -Force } | Out-Null
            } 
            "shutdown_pc" { 
                $output = "PC wird heruntergefahren..."
                $success = $true
                Start-Job { Start-Sleep 3; Stop-Computer -Force } | Out-Null
            } 
            "restart_agent" {
                $output = "Agent wird neugestartet..."
                $success = $true
                Start-Job { Start-Sleep 2; Start-ScheduledTask -TaskName "TSRID-Agent-Service" } | Out-Null
            }
            "run_script" { 
                try {
                    $output = (Invoke-Expression $params.script | Out-String)
                    $success = $true
                } catch {
                    $output = "Script-Fehler: $_"
                    $success = $false
                }
            } 
            default {
                $output = "Unbekannter Befehl: $cmdType"
                $success = $false
            }
        }
        Invoke-Api -Endpoint "remote/result" -Method POST -Body @{
            device_id = $global:DeviceId
            command_id = $cmdId
            success = $success
            output = $output
        }
        Write-Log "Befehl $cmdType abgeschlossen: $success"
    } catch {
        Write-Log "Process-Cmd Fehler: $_" "ERROR"
    }
}

# === HAUPTPROGRAMM ===
Write-Log "=========================================="
Write-Log "TSRID Agent V14 gestartet"
Write-Log "Server: $ApiUrl"
Write-Log "Device-ID: $global:DeviceId"
Write-Log "Computer: $global:ComputerName"
Write-Log "=========================================="

# Initiale Registrierung
$regResult = Invoke-Api -Endpoint "register" -Method POST -Body (Get-HardwareInfo)
if($regResult) { Write-Log "Registrierung erfolgreich" } else { Write-Log "Registrierung fehlgeschlagen" "ERROR" }

$lastHeartbeat = [DateTime]::MinValue
$lastPoll = [DateTime]::MinValue
$heartbeatInterval = 60
$pollInterval = 5

# Hauptschleife mit Error-Recovery
while($true) {
    try {
        $now = Get-Date
        
        # Heartbeat alle 60 Sekunden
        if(($now - $lastHeartbeat).TotalSeconds -ge $heartbeatInterval) {
            $hbResult = Invoke-Api -Endpoint "heartbeat" -Method POST -Body (Get-HardwareInfo)
            if($hbResult -and $hbResult.commands) {
                foreach($cmd in $hbResult.commands) { Process-Cmd $cmd }
            }
            $lastHeartbeat = $now
        }
        
        # Commands pollen alle 5 Sekunden
        if(($now - $lastPoll).TotalSeconds -ge $pollInterval) {
            $pollResult = Invoke-Api -Endpoint "remote/commands/$($global:DeviceId)" -Method GET
            if($pollResult -and $pollResult.commands) {
                foreach($cmd in $pollResult.commands) { Process-Cmd $cmd }
            }
            $lastPoll = $now
        }
        
        # Bei zu vielen Fehlern: Pause einlegen
        if($global:ErrorCount -gt 10) {
            Write-Log "Zu viele Fehler ($($global:ErrorCount)), warte 60 Sekunden..." "ERROR"
            Start-Sleep 60
            $global:ErrorCount = 0
        }
        
        Start-Sleep 1
        
    } catch {
        Write-Log "Hauptschleife Fehler: $_" "ERROR"
        $global:ErrorCount++
        Start-Sleep 5  # Kurze Pause bei Fehler
    }
}
'@ | Out-File $scriptPath -Encoding UTF8 -Force
Write-Host "[OK] Agent-Script V14 erstellt (mit Error-Recovery)" -ForegroundColor Green

# Task erstellen
$taskName = "TSRID-Agent-Service"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -EA SilentlyContinue
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-ExecutionPolicy Bypass -WindowStyle Hidden -File " + $scriptPath)
$trigger1 = New-ScheduledTaskTrigger -AtStartup; $trigger1.Delay = "PT1M"
$trigger2 = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger1,$trigger2) -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "[OK] Task erstellt und gestartet" -ForegroundColor Green
Start-ScheduledTask -TaskName $taskName
Write-Host "[OK] Agent V14 laeuft! Server: $apiUrl" -ForegroundColor Green
`}
              </pre>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to generate the agent script for copying
function generateAgentScript(apiUrl) {
  return `# TSRID Agent Installer V15 - In PowerShell (Admin) einfuegen
# Server: ${apiUrl}

$installPath = "C:\\TSRID-Agent"
$scriptPath = "$installPath\\TSRID-Agent-Service.ps1"
$apiUrl = "${apiUrl}"

# Cleanup
schtasks /Delete /TN "TSRID-Agent-Service" /F 2>$null
schtasks /Delete /TN "TSRID-ShowMessage" /F 2>$null
Stop-Process -Name "mshta" -Force -ErrorAction SilentlyContinue
Remove-Item "$installPath\\message.hta" -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Path $installPath -Force | Out-Null
Write-Host "[OK] Ordner erstellt" -ForegroundColor Green

$logoUrl = "https://customer-assets.emergentagent.com/job_06f80f02-2411-462d-ac08-59775fd1245f/artifacts/7kqzi6kx_Zeichenfl%C3%A4che%201.png"
try { Invoke-WebRequest -Uri $logoUrl -OutFile "$installPath\\logo.png" -UseBasicParsing; Write-Host "[OK] Logo" -ForegroundColor Green } catch {}

@'
param([string]$ApiUrl)
$ErrorActionPreference = "Continue"
$global:ComputerName = $env:COMPUTERNAME
$global:LogFile = "C:\\TSRID-Agent\\agent.log"
$global:DeviceId = "$env:COMPUTERNAME-$((Get-WmiObject Win32_ComputerSystemProduct).UUID)"
$global:ErrorCount = 0

function Write-Log { param([string]$M,[string]$L="INFO"); try { Add-Content -Path $global:LogFile -Value "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] [$L] $M" -EA SilentlyContinue } catch {} }

function Get-HardwareInfo {
    try {
        $cs = Get-WmiObject Win32_ComputerSystem; $cpu = Get-WmiObject Win32_Processor
        $os = Get-WmiObject Win32_OperatingSystem; $bios = Get-WmiObject Win32_BIOS
        $net = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
        $tvId = "not found"; @("HKLM:\\SOFTWARE\\TeamViewer","HKLM:\\SOFTWARE\\WOW6432Node\\TeamViewer") | ForEach-Object { if (Test-Path $_) { $tvId = (Get-ItemProperty $_ -Name ClientID -EA SilentlyContinue).ClientID } }
        if($tvId -is [int]) { $tvId = $tvId.ToString() }
        return @{ device_id=$global:DeviceId; computername=$global:ComputerName; uuid=(Get-WmiObject Win32_ComputerSystemProduct).UUID; bios_serial=[string]$bios.SerialNumber; teamviewer_id=[string]$tvId; teamviewer_status=$(if(Get-Process TeamViewer -EA SilentlyContinue){"running"}else{"stopped"}); tsrid_status=$(if(Get-Process tsrid -EA SilentlyContinue){"running"}else{"stopped"}); manufacturer=[string]$cs.Manufacturer; model=[string]$cs.Model; cpu=[string]$cpu.Name; ram_gb=[math]::Round($cs.TotalPhysicalMemory/1GB,2); ip_address=[string](($net|Select -First 1).IPAddress[0]); windows_version=[string]$os.Caption; timestamp=(Get-Date).ToString("o") }
    } catch { Write-Log "HW-Fehler: $_" "ERROR"; return @{ device_id=$global:DeviceId; computername=$global:ComputerName; timestamp=(Get-Date).ToString("o") } }
}

function Invoke-Api { param([string]$Endpoint,[string]$Method="GET",[hashtable]$Body=$null)
    try { $p = @{Uri="$ApiUrl/api/device-agent/$Endpoint";Method=$Method;ContentType="application/json";TimeoutSec=30}; if($Body){$p.Body=($Body|ConvertTo-Json -Depth 10 -Compress)}; $r=Invoke-RestMethod @p; $global:ErrorCount=0; return $r } catch { $global:ErrorCount++; Write-Log "API-Fehler: $_" "ERROR"; return $null }
}

function Show-BigMessage { param([string]$Message,[int]$DurationMinutes=0)
    try {
        $ts = Get-Date -Format "dd.MM.yyyy HH:mm:ss"
        $safeMsg = $Message -replace "'","" -replace '"',""
        $timerHtml = ""
        $timerVB = ""
        if($DurationMinutes -gt 0) {
            $timerHtml = "<br><br><font face='Segoe UI' color='#ff6600' size='5'>Verbleibend: <span id='cd'>--:--:--</span></font>"
            $timerVB = "t=$DurationMinutes*60:window.setTimeout ""Tick"",1000"
        }
$html = @"
<html>
<head><title>TSRID</title>
<HTA:APPLICATION ID="oHTA" BORDER="none" CAPTION="no" SHOWINTASKBAR="yes" SINGLEINSTANCE="yes" SCROLL="no" WINDOWSTATE="maximize"/>
</head>
<script language="VBScript">
Dim t
Sub Window_OnLoad:window.resizeTo screen.width,screen.height:window.moveTo 0,0:$timerVB:End Sub
Sub Tick:If t<=0 Then:document.getElementById("cd").innerText="ABGELAUFEN":Exit Sub:End If:Dim h,m,s:h=Int(t/3600):m=Int((t Mod 3600)/60):s=t Mod 60:document.getElementById("cd").innerText=Right("0"&h,2)&":"&Right("0"&m,2)&":"&Right("0"&s,2):t=t-1:window.setTimeout "Tick",1000:End Sub
Sub CloseMe:window.close:End Sub
Sub Document_OnKeyDown:If window.event.keyCode=27 Then window.close:End Sub
</script>
<body bgcolor="#171717">
<center><br><br><br>
<table bgcolor="#242424" cellpadding="50" style="border:4px solid #d50c2d;">
<tr><td align="center"><img src="C:\\TSRID-Agent\\logo.png" width="180"><br><br><font face="Segoe UI" color="#888888" size="4">$ts</font></td></tr>
<tr><td align="center"><font face="Segoe UI" color="#ffffff" size="7"><b>$safeMsg</b></font>$timerHtml</td></tr>
<tr><td align="center"><br><input type="button" value="SCHLIESSEN (ESC)" onclick="CloseMe" style="background-color:#d50c2d;color:white;border:none;padding:15px 40px;font-size:20px;cursor:hand;"></td></tr>
</table></center></body></html>
"@
        $html | Out-File "C:\\TSRID-Agent\\message.hta" -Encoding ASCII -Force
        Start-Process "mshta.exe" -ArgumentList "C:\\TSRID-Agent\\message.hta"
        Write-Log "Nachricht angezeigt"
    } catch { Write-Log "MSG-Fehler: $_" "ERROR" }
}

function Process-Cmd { param($c)
    try { $t=$c.command;$p=$c.params;$id=$c.command_id; Write-Log "CMD: $t"; $ok=$false;$out=""
        switch($t){ "message"{Show-BigMessage -Message $p.text -DurationMinutes ([int]$p.duration_minutes);$out="OK";$ok=$true} "restart_pc"{$out="Neustart";$ok=$true;Start-Job{Start-Sleep 3;Restart-Computer -Force}|Out-Null} "shutdown_pc"{$out="Shutdown";$ok=$true;Start-Job{Start-Sleep 3;Stop-Computer -Force}|Out-Null} "restart_agent"{$out="Neustart";$ok=$true;Start-Job{Start-Sleep 2;Start-ScheduledTask -TaskName "TSRID-Agent-Service"}|Out-Null} "run_script"{try{$out=(Invoke-Expression $p.script|Out-String);$ok=$true}catch{$out="Fehler: $_";$ok=$false}} }
        Invoke-Api -Endpoint "remote/result" -Method POST -Body @{device_id=$global:DeviceId;command_id=$id;success=$ok;output=$out}
    } catch { Write-Log "CMD-Fehler: $_" "ERROR" }
}

Write-Log "=== TSRID Agent V15 ===" "INFO"; Write-Log "Server: $ApiUrl" "INFO"
Invoke-Api -Endpoint "register" -Method POST -Body (Get-HardwareInfo)
$lastHB=[DateTime]::MinValue; $lastPoll=[DateTime]::MinValue
while($true) { try { $now=Get-Date
    if(($now-$lastHB).TotalSeconds -ge 60){ $r=Invoke-Api -Endpoint "heartbeat" -Method POST -Body (Get-HardwareInfo); if($r -and $r.commands){$r.commands|%{Process-Cmd $_}}; $lastHB=$now }
    if(($now-$lastPoll).TotalSeconds -ge 5){ $r=Invoke-Api -Endpoint "remote/commands/$($global:DeviceId)" -Method GET; if($r -and $r.commands){$r.commands|%{Process-Cmd $_}}; $lastPoll=$now }
    if($global:ErrorCount -gt 10){ Write-Log "Pause 60s" "ERROR"; Start-Sleep 60; $global:ErrorCount=0 }
    Start-Sleep 1
} catch { Write-Log "Loop-Fehler: $_" "ERROR"; Start-Sleep 5 } }
'@ | Out-File $scriptPath -Encoding UTF8 -Force
Write-Host "[OK] Agent-Script V15" -ForegroundColor Green

$taskName = "TSRID-Agent-Service"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-ExecutionPolicy Bypass -WindowStyle Hidden -File " + $scriptPath + " -ApiUrl " + $apiUrl)
$trigger1 = New-ScheduledTaskTrigger -AtStartup; $trigger1.Delay = "PT1M"
$trigger2 = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger1,$trigger2) -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host "[OK] Agent V15 laeuft! Server: $apiUrl" -ForegroundColor Green`;
}

export default DeviceAgentManagement;