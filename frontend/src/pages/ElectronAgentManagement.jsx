/**
 * Electron Agent Management Page
 * Verwaltung der Electron-basierten ID-Verifikations-Agents
 * Hetzner Dark Theme - Pure neutral grays + red accent
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Monitor, Cpu, Download, Upload, RefreshCw, Settings, 
  CheckCircle, XCircle, Clock, AlertTriangle, Wifi, WifiOff,
  Package, Tag, Server, Building, Globe, Activity, Play,
  Pause, Trash2, Eye, ChevronRight, HardDrive, Zap,
  Search, Filter, MoreVertical, Copy, ExternalLink,
  ArrowUpRight, Info, Layers, FileCode, Terminal,
  Usb, Scan, Camera, Shield, ArrowLeft
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ElectronAgentManagement = () => {
  const navigate = useNavigate();
  // State
  const [devices, setDevices] = useState([]);
  const [versions, setVersions] = useState([]);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [versionMatrix, setVersionMatrix] = useState([]);
  const [latestBuilds, setLatestBuilds] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});
  const [stats, setStats] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    pending_updates: 0,
    latest_version: null,
    by_platform: {},
    by_version: {},
    by_tenant: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showPushUpdateModal, setShowPushUpdateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [filter, setFilter] = useState({
    platform: 'all',
    status: 'all',
    version: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Forms
  const [versionForm, setVersionForm] = useState({
    version: '',
    platform: 'all',
    release_notes: '',
    is_mandatory: false,
    is_preview: false
  });
  const [pushForm, setPushForm] = useState({
    target_version: '',
    platform: 'all',
    force: false
  });

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, versionsRes, devicesRes, matrixRes, historyRes, buildsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/electron-agent/stats`),
        fetch(`${BACKEND_URL}/api/electron-agent/versions?include_preview=true`),
        fetch(`${BACKEND_URL}/api/electron-agent/devices?limit=100`),
        fetch(`${BACKEND_URL}/api/electron-agent/stats/version-matrix`),
        fetch(`${BACKEND_URL}/api/electron-agent/updates/history`),
        fetch(`${BACKEND_URL}/api/electron-agent/builds/latest`)
      ]);
      
      const [statsData, versionsData, devicesData, matrixData, historyData, buildsData] = await Promise.all([
        statsRes.json(),
        versionsRes.json(),
        devicesRes.json(),
        matrixRes.json(),
        historyRes.json(),
        buildsRes.json()
      ]);
      
      if (statsData.success) setStats(statsData.stats);
      if (versionsData.success) setVersions(versionsData.versions || []);
      if (devicesData.success) setDevices(devicesData.devices || []);
      if (matrixData.success) setVersionMatrix(matrixData.matrix || []);
      if (historyData.success) setUpdateHistory(historyData.history || []);
      if (buildsData.success) setLatestBuilds(buildsData.builds || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch download link and trigger download
  const handleDownload = async (platform) => {
    setDownloadLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const response = await fetch(`${BACKEND_URL}/api/electron-agent/download/${platform}`);
      const data = await response.json();
      
      if (data.success && data.available) {
        // Open download URL in new tab
        window.open(data.download_url, '_blank');
        toast.success(`Download für ${platform.toUpperCase()} gestartet`);
      } else {
        // Show setup instructions
        toast.error(data.message || 'Download nicht verfügbar');
      }
    } catch (error) {
      toast.error('Fehler beim Abrufen des Download-Links');
    } finally {
      setDownloadLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Initial data load + auto-refresh
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Create new version
  const createVersion = async () => {
    if (!versionForm.version) {
      toast.error('Version ist erforderlich');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/electron-agent/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionForm)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Version ${versionForm.version} erstellt`);
        setShowVersionModal(false);
        setVersionForm({ version: '', platform: 'all', release_notes: '', is_mandatory: false, is_preview: false });
        fetchAllData();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    }
  };

  // Delete version
  const deleteVersion = async (version, platform) => {
    if (!window.confirm(`Version ${version} wirklich löschen?`)) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/electron-agent/versions/${version}?platform=${platform}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Version gelöscht');
        fetchAllData();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Push update
  const pushUpdate = async () => {
    if (!pushForm.target_version) {
      toast.error('Zielversion erforderlich');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/electron-agent/updates/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_version: pushForm.target_version,
          platform: pushForm.platform !== 'all' ? pushForm.platform : null,
          force: pushForm.force
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Update an ${data.affected_count} Gerät(e) gepusht`);
        setShowPushUpdateModal(false);
        setPushForm({ target_version: '', platform: 'all', force: false });
        fetchAllData();
      } else {
        toast.error(data.detail || 'Fehler beim Pushen');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
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

  // Filter devices by search
  const filteredDevices = devices.filter(device => {
    // Apply filters
    if (filter.platform !== 'all' && device.platform !== filter.platform) return false;
    if (filter.status !== 'all' && device.status !== filter.status) return false;
    if (filter.version !== 'all' && device.version !== filter.version) return false;
    
    // Apply search
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      device.device_id?.toLowerCase().includes(search) ||
      device.hostname?.toLowerCase().includes(search) ||
      device.tenant_name?.toLowerCase().includes(search) ||
      device.location_code?.toLowerCase().includes(search) ||
      device.version?.toLowerCase().includes(search)
    );
  });

  // Platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'win32':
      case 'win':
        return <Monitor className="w-4 h-4" />;
      case 'darwin':
      case 'mac':
        return <Cpu className="w-4 h-4" />;
      case 'linux':
        return <Terminal className="w-4 h-4" />;
      default:
        return <HardDrive className="w-4 h-4" />;
    }
  };

  // Platform label
  const getPlatformLabel = (platform) => {
    switch (platform) {
      case 'win32':
      case 'win':
        return 'Windows';
      case 'darwin':
      case 'mac':
        return 'macOS';
      case 'linux':
        return 'Linux';
      case 'all':
        return 'Alle Plattformen';
      default:
        return platform || 'Unbekannt';
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white p-6" data-testid="electron-agent-management">
      {/* Back Navigation */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/devices')}
          className="text-gray-400 hover:text-white hover:bg-[#262626]"
          data-testid="back-to-devices-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Device Agent
        </Button>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#d50c2d]/20 rounded-lg">
            <Layers className="w-8 h-8 text-[#d50c2d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Electron Agent Management</h1>
            <p className="text-gray-400 text-sm">Verwaltung der Desktop ID-Verifikations-Agents mit Regula Scanner</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchAllData}
            className="border-[#444] hover:bg-[#262626]"
            data-testid="refresh-all-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button 
            onClick={() => setShowPushUpdateModal(true)}
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="push-update-btn"
          >
            <Upload className="w-4 h-4 mr-2" />
            Update Pushen
          </Button>
          <Button 
            onClick={() => setShowVersionModal(true)}
            className="bg-[#d50c2d] hover:bg-[#b80a28]"
            data-testid="new-version-btn"
          >
            <Package className="w-4 h-4 mr-2" />
            Neue Version
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <Monitor className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total_devices}</div>
              <div className="text-gray-400 text-xs">Geräte gesamt</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Wifi className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.online_devices}</div>
              <div className="text-gray-400 text-xs">Online</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <WifiOff className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.offline_devices}</div>
              <div className="text-gray-400 text-xs">Offline</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{stats.pending_updates}</div>
              <div className="text-gray-400 text-xs">Pending Updates</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Tag className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-cyan-400 font-mono">{stats.latest_version || '-'}</div>
              <div className="text-gray-400 text-xs">Neueste Version</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-[#1a1a1a] border-[#333] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Layers className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{versions.length}</div>
              <div className="text-gray-400 text-xs">Versionen</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#1a1a1a] border border-[#333] p-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger 
            value="download" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download & Installation
          </TabsTrigger>
          <TabsTrigger 
            value="devices" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Geräte ({devices.length})
          </TabsTrigger>
          <TabsTrigger 
            value="versions" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            Versionen ({versions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="scanner" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scanner Integration
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-[#d50c2d] data-[state=active]:text-white"
          >
            <Clock className="w-4 h-4 mr-2" />
            Update-Verlauf
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Version Distribution */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                Versions-Verteilung
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.by_version || {}).map(([version, count]) => (
                  <div key={version} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400">{version}</span>
                      {version === stats.latest_version && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                          Aktuell
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#262626] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all"
                          style={{ width: `${stats.total_devices > 0 ? (count / stats.total_devices) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(stats.by_version || {}).length === 0 && (
                  <div className="text-gray-500 text-center py-4">Keine Daten vorhanden</div>
                )}
              </div>
            </Card>

            {/* Platform Distribution */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Plattform-Verteilung
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.by_platform || {}).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(platform)}
                      <span>{getPlatformLabel(platform)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#262626] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${stats.total_devices > 0 ? (count / stats.total_devices) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(stats.by_platform || {}).length === 0 && (
                  <div className="text-gray-500 text-center py-4">Keine Daten vorhanden</div>
                )}
              </div>
            </Card>

            {/* Tenant Distribution */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-orange-400" />
                Geräte nach Tenant
              </h3>
              <div className="space-y-2">
                {(stats.by_tenant || []).slice(0, 6).map((tenant) => (
                  <div key={tenant._id} className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                    <span className="truncate max-w-[200px]">{tenant.tenant_name || tenant._id}</span>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">{tenant.count}</Badge>
                  </div>
                ))}
                {(stats.by_tenant || []).length === 0 && (
                  <div className="text-gray-500 text-center py-4">Keine Tenants mit Geräten</div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Schnellaktionen
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="border-[#444] hover:bg-[#262626] h-auto py-4 flex-col"
                  onClick={() => setShowVersionModal(true)}
                  data-testid="quick-new-version"
                >
                  <Package className="w-6 h-6 mb-2 text-cyan-400" />
                  <span>Neue Version</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-[#444] hover:bg-[#262626] h-auto py-4 flex-col"
                  onClick={() => setShowPushUpdateModal(true)}
                  data-testid="quick-push-update"
                >
                  <Upload className="w-6 h-6 mb-2 text-orange-400" />
                  <span>Update Pushen</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-[#444] hover:bg-[#262626] h-auto py-4 flex-col"
                  onClick={() => setActiveTab('devices')}
                  data-testid="quick-view-devices"
                >
                  <Monitor className="w-6 h-6 mb-2 text-green-400" />
                  <span>Geräte anzeigen</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-[#444] hover:bg-[#262626] h-auto py-4 flex-col"
                  onClick={() => setActiveTab('scanner')}
                  data-testid="quick-scanner-info"
                >
                  <Scan className="w-6 h-6 mb-2 text-purple-400" />
                  <span>Scanner Info</span>
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Download & Installation Tab */}
        <TabsContent value="download" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Download Links */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-400" />
                TSRID Agent herunterladen
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Laden Sie den TSRID Agent für Ihr Betriebssystem herunter. Der Agent verbindet sich automatisch mit dem Portal und bleibt online, solange Internet verfügbar ist.
              </p>
              
              <div className="space-y-3">
                {/* Windows Download */}
                <div className={`flex items-center justify-between p-4 bg-[#262626] rounded-lg border transition-colors ${latestBuilds.win ? 'border-green-500/50 hover:border-green-400' : 'border-[#444] hover:border-cyan-500/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Monitor className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        Windows
                        {latestBuilds.win && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            v{latestBuilds.win.version}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">Windows 10/11 (64-bit)</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      className={latestBuilds.win ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                      onClick={() => handleDownload('win')}
                      disabled={downloadLoading.win}
                      data-testid="download-win-exe"
                    >
                      {downloadLoading.win ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      .exe
                    </Button>
                  </div>
                </div>

                {/* macOS Download */}
                <div className={`flex items-center justify-between p-4 bg-[#262626] rounded-lg border transition-colors ${latestBuilds.mac ? 'border-green-500/50 hover:border-green-400' : 'border-[#444] hover:border-cyan-500/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500/20 rounded-lg">
                      <Cpu className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        macOS
                        {latestBuilds.mac && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            v{latestBuilds.mac.version}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">macOS 11+ (Intel & Apple Silicon)</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      className={latestBuilds.mac ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"}
                      onClick={() => handleDownload('mac')}
                      disabled={downloadLoading.mac}
                      data-testid="download-mac-dmg"
                    >
                      {downloadLoading.mac ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      .dmg
                    </Button>
                  </div>
                </div>

                {/* Linux Download */}
                <div className={`flex items-center justify-between p-4 bg-[#262626] rounded-lg border transition-colors ${latestBuilds.linux ? 'border-green-500/50 hover:border-green-400' : 'border-[#444] hover:border-cyan-500/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Terminal className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        Linux
                        {latestBuilds.linux && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            v{latestBuilds.linux.version}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">Ubuntu, Debian, Fedora (64-bit)</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      className={latestBuilds.linux ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
                      onClick={() => handleDownload('linux')}
                      disabled={downloadLoading.linux}
                      data-testid="download-linux-appimage"
                    >
                      {downloadLoading.linux ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      .AppImage
                    </Button>
                  </div>
                </div>
              </div>

              {/* Build Status Info */}
              {Object.keys(latestBuilds).length > 0 ? (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-300">
                      <strong>Builds verfügbar!</strong> Klicken Sie auf den Download-Button für Ihre Plattform.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-300">
                      <strong>Build Pipeline einrichten:</strong> 
                      <ol className="mt-2 space-y-1 list-decimal list-inside">
                        <li>Electron-Code zu GitHub pushen</li>
                        <li>GitHub Actions Workflow aktivieren</li>
                        <li>Version-Tag erstellen (z.B. v1.0.0)</li>
                        <li>Downloads erscheinen automatisch hier</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Installation Instructions */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                Installations-Anleitung
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">1</Badge>
                    <span className="font-bold">Installer herunterladen</span>
                  </div>
                  <p className="text-sm text-gray-400 ml-7">
                    Wählen Sie die passende Version für Ihr Betriebssystem und laden Sie den Installer herunter.
                  </p>
                </div>

                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">2</Badge>
                    <span className="font-bold">Installation starten</span>
                  </div>
                  <p className="text-sm text-gray-400 ml-7">
                    Führen Sie den Installer aus. Bei Windows klicken Sie auf "Ja" wenn die UAC-Abfrage erscheint.
                  </p>
                </div>

                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">3</Badge>
                    <span className="font-bold">Agent konfigurieren</span>
                  </div>
                  <p className="text-sm text-gray-400 ml-7">
                    Beim ersten Start wird nach Tenant und Standort gefragt. Der Agent verbindet sich automatisch mit dem Portal.
                  </p>
                </div>

                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">4</Badge>
                    <span className="font-bold">Fertig!</span>
                  </div>
                  <p className="text-sm text-gray-400 ml-7">
                    Der Agent startet automatisch mit dem System und bleibt mit dem Portal verbunden.
                  </p>
                </div>
              </div>
            </Card>

            {/* Connection Info */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6 lg:col-span-2">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-400" />
                Verbindung zum Portal
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Server URL</div>
                  <div className="font-mono text-cyan-400 text-sm break-all">{BACKEND_URL || 'https://agent.tsrid.com'}</div>
                </div>
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Heartbeat Intervall</div>
                  <div className="font-mono text-cyan-400">30 Sekunden</div>
                </div>
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Auto-Reconnect</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Aktiviert</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0d0d0d] rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-gray-400 mb-2"># Agent API Endpoints</div>
                <div className="text-cyan-400">POST {BACKEND_URL || 'https://agent.tsrid.com'}/api/electron-agent/devices/register</div>
                <div className="text-cyan-400">POST {BACKEND_URL || 'https://agent.tsrid.com'}/api/electron-agent/devices/heartbeat</div>
                <div className="text-green-400">GET  {BACKEND_URL || 'https://agent.tsrid.com'}/api/electron-agent/versions/latest</div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Was der Agent tut
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Automatische Registrierung beim Portal</li>
                    <li>• Heartbeat alle 30 Sekunden</li>
                    <li>• Scanner-Status überwachen</li>
                    <li>• Automatische Updates empfangen</li>
                    <li>• Offline-Modus mit Sync bei Reconnect</li>
                  </ul>
                </div>
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <h4 className="font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Sicherheit
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• HTTPS-verschlüsselte Verbindung</li>
                    <li>• Eindeutige Device-ID pro Installation</li>
                    <li>• Kein Zugriff auf Dateisystem</li>
                    <li>• Sandbox-Isolation (Electron)</li>
                    <li>• Code-signierte Installer</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          {/* Filters */}
          <Card className="bg-[#1a1a1a] border-[#333] p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Suche nach Hostname, Tenant, Standort..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#262626] border-[#444] text-white"
                    data-testid="device-search"
                  />
                </div>
              </div>
              <Select value={filter.status} onValueChange={(v) => setFilter({...filter, status: v})}>
                <SelectTrigger className="w-36 bg-[#262626] border-[#444]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.platform} onValueChange={(v) => setFilter({...filter, platform: v})}>
                <SelectTrigger className="w-40 bg-[#262626] border-[#444]" data-testid="filter-platform">
                  <SelectValue placeholder="Plattform" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  <SelectItem value="all">Alle Plattformen</SelectItem>
                  <SelectItem value="win32">Windows</SelectItem>
                  <SelectItem value="darwin">macOS</SelectItem>
                  <SelectItem value="linux">Linux</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.version} onValueChange={(v) => setFilter({...filter, version: v})}>
                <SelectTrigger className="w-36 bg-[#262626] border-[#444]" data-testid="filter-version">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  <SelectItem value="all">Alle Versionen</SelectItem>
                  {[...new Set(devices.map(d => d.version))].filter(Boolean).map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filter.status !== 'all' || filter.platform !== 'all' || filter.version !== 'all' || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFilter({ status: 'all', platform: 'all', version: 'all' }); setSearchTerm(''); }}
                  className="bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50"
                >
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </Card>

          {/* Device Grid */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Lade Geräte...
            </div>
          ) : filteredDevices.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-[#333] p-12 text-center">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold mb-2">Keine Electron Agents gefunden</h3>
              <p className="text-gray-400">Es sind noch keine Electron Agents registriert.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDevices.map((device) => (
                <Card 
                  key={device.device_id}
                  className={`
                    bg-[#1a1a1a] border-[#333] p-4 cursor-pointer transition-all
                    hover:border-[#d50c2d]/50 hover:scale-[1.02]
                    ${device.pending_update ? 'border-l-4 border-l-orange-500' : ''}
                  `}
                  onClick={() => { setSelectedDevice(device); setShowDeviceModal(true); }}
                  data-testid={`device-card-${device.device_id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(device.platform)}
                      <span className="font-bold truncate max-w-[150px]">{device.hostname || 'Unbekannt'}</span>
                    </div>
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
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building className="w-3 h-3" />
                      <span className="truncate">{device.tenant_name || '-'}</span>
                    </div>
                    {device.location_code && (
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Globe className="w-3 h-3" />
                        <span>{device.location_code}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="font-mono text-cyan-400">{device.version || '-'}</span>
                      {device.pending_update && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-xs ml-auto">
                          {device.pending_update}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Scanner Status */}
                  {device.scanner_status && (
                    <div className="mt-3 pt-3 border-t border-[#333]">
                      <div className="flex items-center gap-2">
                        <Scan className={`w-4 h-4 ${device.scanner_status.online ? 'text-green-400' : 'text-gray-500'}`} />
                        <span className="text-xs text-gray-400">
                          Scanner: {device.scanner_status.online ? 'Verbunden' : 'Nicht verbunden'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-[#333] flex justify-between items-center text-xs text-gray-500">
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTimeAgo(device.last_seen)}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-[#333]">
            <div className="p-4 border-b border-[#333] flex justify-between items-center">
              <h3 className="font-bold">Alle Versionen</h3>
              <Button 
                onClick={() => setShowVersionModal(true)}
                className="bg-[#d50c2d] hover:bg-[#b80a28]"
                size="sm"
              >
                <Package className="w-4 h-4 mr-2" />
                Neue Version
              </Button>
            </div>
            <div className="divide-y divide-[#333]">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  Keine Versionen vorhanden
                </div>
              ) : (
                versions.map((version) => (
                  <div key={version.version_id} className="p-4 hover:bg-[#262626] transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                          <Tag className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-bold text-cyan-400">{version.version}</span>
                            {version.is_preview && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Preview</Badge>
                            )}
                            {version.is_mandatory && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Pflicht</Badge>
                            )}
                            {version.version === stats.latest_version && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Aktuell</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              {getPlatformIcon(version.platform)}
                              {getPlatformLabel(version.platform)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {version.download_count || 0} Downloads
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(version.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {version.release_notes && (
                            <p className="mt-2 text-sm text-gray-400 max-w-xl">{version.release_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setPushForm({...pushForm, target_version: version.version}); setShowPushUpdateModal(true); }}
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteVersion(version.version, version.platform); }}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Scanner Integration Tab */}
        <TabsContent value="scanner" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Info */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Scan className="w-5 h-5 text-cyan-400" />
                Regula 7028M.111 Scanner
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#262626] rounded-lg">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Usb className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-bold">Regula 7028M.111</div>
                    <div className="text-sm text-gray-400">Vollformat-Dokumentenscanner mit RFID</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#262626] rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Unterstützte Funktionen</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">Weißlicht</Badge>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">UV</Badge>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">IR</Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">RFID</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-[#262626] rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">SDK Version</div>
                    <div className="font-mono text-cyan-400">Regula SDK (lokal)</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Integration Status */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Integration Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Electron Wrapper
                  </span>
                  <Badge className="bg-green-500/20 text-green-400">Implementiert</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Regula SDK Kommunikation
                  </span>
                  <Badge className="bg-green-500/20 text-green-400">Implementiert</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Auto-Update System
                  </span>
                  <Badge className="bg-green-500/20 text-green-400">Implementiert</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    Build Pipeline
                  </span>
                  <Badge className="bg-yellow-500/20 text-yellow-400">In Entwicklung</Badge>
                </div>
              </div>
            </Card>

            {/* Technical Details */}
            <Card className="bg-[#1a1a1a] border-[#333] p-6 lg:col-span-2">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                Technische Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Electron Version</div>
                  <div className="font-mono text-lg">^28.0.0</div>
                </div>
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Scanner Library</div>
                  <div className="font-mono text-lg">node-hid ^3.0.0</div>
                </div>
                <div className="p-4 bg-[#262626] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Update System</div>
                  <div className="font-mono text-lg">electron-updater ^6.1.7</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-[#0d0d0d] rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-gray-400 mb-2"># Scanner API Endpoints (lokal)</div>
                <div className="text-cyan-400">GET  https://localhost/Regula.SDK.Api/Methods/GetServiceVersion</div>
                <div className="text-cyan-400">GET  https://localhost/Regula.SDK.Api/Methods/GetReaderList</div>
                <div className="text-cyan-400">GET  https://localhost/Regula.SDK.Api/Methods/GetDeviceInfo</div>
                <div className="text-green-400">POST https://localhost/Regula.SDK.Api/Methods/ProcessDocument</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Update History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-[#333]">
            <div className="p-4 border-b border-[#333]">
              <h3 className="font-bold">Update-Verlauf</h3>
            </div>
            <div className="divide-y divide-[#333]">
              {updateHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  Kein Update-Verlauf vorhanden
                </div>
              ) : (
                updateHistory.map((update) => (
                  <div key={update.update_id} className="p-4 hover:bg-[#262626] transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${update.force ? 'bg-red-500/20' : 'bg-cyan-500/20'}`}>
                          <Upload className={`w-5 h-5 ${update.force ? 'text-red-400' : 'text-cyan-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cyan-400">{update.target_version}</span>
                            {update.force && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Erzwungen</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {update.affected_count} Gerät(e) betroffen
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(update.pushed_at).toLocaleString('de-DE')}
                        </div>
                        <div className="text-xs text-gray-500">
                          von {update.pushed_by}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Detail Modal */}
      <Dialog open={showDeviceModal} onOpenChange={setShowDeviceModal}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDevice && getPlatformIcon(selectedDevice.platform)}
              <span>{selectedDevice?.hostname || 'Unbekannt'}</span>
              {selectedDevice?.status === 'online' ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Online</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Offline</Badge>
              )}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-gray-400">
              {selectedDevice?.device_id}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-[#262626] border-[#444] p-3">
                  <div className="text-xs text-gray-400 mb-1">Tenant</div>
                  <div className="font-bold">{selectedDevice.tenant_name || '-'}</div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-3">
                  <div className="text-xs text-gray-400 mb-1">Standort</div>
                  <div className="font-bold text-cyan-400">{selectedDevice.location_code || '-'}</div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-3">
                  <div className="text-xs text-gray-400 mb-1">Version</div>
                  <div className="font-mono text-cyan-400">{selectedDevice.version}</div>
                </Card>
                <Card className="bg-[#262626] border-[#444] p-3">
                  <div className="text-xs text-gray-400 mb-1">Plattform</div>
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(selectedDevice.platform)}
                    {getPlatformLabel(selectedDevice.platform)} ({selectedDevice.arch})
                  </div>
                </Card>
              </div>

              {/* Pending Update */}
              {selectedDevice.pending_update && (
                <Card className="bg-orange-500/10 border-orange-500/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      <span className="font-bold">Update verfügbar</span>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 font-mono">
                      {selectedDevice.pending_update}
                    </Badge>
                  </div>
                </Card>
              )}

              {/* Scanner Status */}
              {selectedDevice.scanner_status && (
                <Card className="bg-[#262626] border-[#444] p-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Scan className="w-4 h-4 text-cyan-400" />
                    Scanner Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Status</div>
                      <Badge className={selectedDevice.scanner_status.online ? 
                        "bg-green-500/20 text-green-400 border-green-500/50" : 
                        "bg-red-500/20 text-red-400 border-red-500/50"
                      }>
                        {selectedDevice.scanner_status.online ? 'Verbunden' : 'Nicht verbunden'}
                      </Badge>
                    </div>
                    {selectedDevice.scanner_status.serialNumber && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Seriennummer</div>
                        <div className="font-mono text-sm">{selectedDevice.scanner_status.serialNumber}</div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Timestamps */}
              <Card className="bg-[#262626] border-[#444] p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Registriert</div>
                    <div>{selectedDevice.registered_at ? new Date(selectedDevice.registered_at).toLocaleString('de-DE') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Zuletzt gesehen</div>
                    <div>{selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString('de-DE') : '-'}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Version Modal */}
      <Dialog open={showVersionModal} onOpenChange={setShowVersionModal}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Neue Version erstellen</DialogTitle>
            <DialogDescription className="text-gray-400">
              Erstellen Sie eine neue Electron Agent Version
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Version *</label>
              <Input
                value={versionForm.version}
                onChange={(e) => setVersionForm({...versionForm, version: e.target.value})}
                placeholder="z.B. 1.2.0"
                className="bg-[#262626] border-[#444]"
                data-testid="version-input"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Plattform</label>
              <Select value={versionForm.platform} onValueChange={(v) => setVersionForm({...versionForm, platform: v})}>
                <SelectTrigger className="bg-[#262626] border-[#444]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  <SelectItem value="all">Alle Plattformen</SelectItem>
                  <SelectItem value="win">Windows</SelectItem>
                  <SelectItem value="mac">macOS</SelectItem>
                  <SelectItem value="linux">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Release Notes</label>
              <textarea
                value={versionForm.release_notes}
                onChange={(e) => setVersionForm({...versionForm, release_notes: e.target.value})}
                placeholder="Was ist neu in dieser Version?"
                className="w-full bg-[#262626] border border-[#444] rounded-md p-3 text-white resize-none h-24"
                data-testid="release-notes-input"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={versionForm.is_preview}
                  onChange={(e) => setVersionForm({...versionForm, is_preview: e.target.checked})}
                  className="rounded border-gray-600 bg-[#262626]"
                />
                <span className="text-sm">Preview Version</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={versionForm.is_mandatory}
                  onChange={(e) => setVersionForm({...versionForm, is_mandatory: e.target.checked})}
                  className="rounded border-gray-600 bg-[#262626]"
                />
                <span className="text-sm">Pflicht-Update</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionModal(false)} className="border-[#444]">
              Abbrechen
            </Button>
            <Button onClick={createVersion} className="bg-[#d50c2d] hover:bg-[#b80a28]">
              Version erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Update Modal */}
      <Dialog open={showPushUpdateModal} onOpenChange={setShowPushUpdateModal}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-400" />
              Update an Geräte pushen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Senden Sie ein Update an ausgewählte Geräte
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Zielversion *</label>
              <Select value={pushForm.target_version} onValueChange={(v) => setPushForm({...pushForm, target_version: v})}>
                <SelectTrigger className="bg-[#262626] border-[#444]" data-testid="target-version-select">
                  <SelectValue placeholder="Version auswählen" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  {versions.filter(v => !v.is_preview).map((v) => (
                    <SelectItem key={v.version_id} value={v.version}>
                      {v.version} ({getPlatformLabel(v.platform)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Plattform-Filter</label>
              <Select value={pushForm.platform} onValueChange={(v) => setPushForm({...pushForm, platform: v})}>
                <SelectTrigger className="bg-[#262626] border-[#444]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-[#444]">
                  <SelectItem value="all">Alle Plattformen</SelectItem>
                  <SelectItem value="win32">Nur Windows</SelectItem>
                  <SelectItem value="darwin">Nur macOS</SelectItem>
                  <SelectItem value="linux">Nur Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushForm.force}
                onChange={(e) => setPushForm({...pushForm, force: e.target.checked})}
                className="rounded border-gray-600 bg-[#262626]"
              />
              <span className="text-sm">Erzwungenes Update (sofort installieren)</span>
            </label>
            
            <Card className="bg-orange-500/10 border-orange-500/30 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-400 mt-0.5" />
                <div className="text-sm text-orange-300">
                  Geräte erhalten das Update beim nächsten Heartbeat. 
                  Bei erzwungenen Updates wird die Installation sofort gestartet.
                </div>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushUpdateModal(false)} className="border-[#444]">
              Abbrechen
            </Button>
            <Button onClick={pushUpdate} className="bg-orange-600 hover:bg-orange-700">
              <Upload className="w-4 h-4 mr-2" />
              Update pushen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectronAgentManagement;
