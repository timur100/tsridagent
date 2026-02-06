import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Box, Monitor, Tablet, Printer, HardDrive, 
  Search, RefreshCw, Filter, Building2, ChevronDown, 
  ChevronRight, Check, AlertCircle, Warehouse
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

const DEVICE_TYPE_ICONS = {
  scanner: Monitor,
  computer: Tablet,
  tablet: Tablet,
  printer: Printer,
  docking_station: HardDrive,
  network_device: HardDrive,
  other: Box
};

const DEVICE_TYPE_LABELS = {
  scanner: 'Scanner',
  computer: 'Computer',
  tablet: 'Tablet',
  printer: 'Drucker',
  docking_station: 'Docking Station',
  network_device: 'Netzwerkgerät',
  other: 'Sonstiges'
};

/**
 * StorageOverview - Übersicht aller Geräte im Lager
 * Zeigt an: Anzahl pro Typ, pro Tenant, verfügbar für Kits
 */
const StorageOverview = ({ theme, tenants = [] }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Expanded sections
  const [expandedTenants, setExpandedTenants] = useState({});

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/device-lifecycle/storage/overview`;
      if (selectedTenant && selectedTenant !== 'all') {
        url += `?tenant_id=${selectedTenant}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStorageData(data.storage);
        setDevices(data.storage.devices || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Fehler beim Laden der Lager-Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, [selectedTenant]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = !searchTerm || 
        device.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTenant = selectedTenant === 'all' || device.tenant_id === selectedTenant;
      const matchesType = selectedType === 'all' || device.device_type === selectedType;
      const matchesAvailable = !showOnlyAvailable || device.available_for_kit;
      
      return matchesSearch && matchesTenant && matchesType && matchesAvailable;
    });
  }, [devices, searchTerm, selectedTenant, selectedType, showOnlyAvailable]);

  // Paginated devices
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTenant, selectedType, showOnlyAvailable]);

  const toggleTenantExpanded = (tenantId) => {
    setExpandedTenants(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  };

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700' : '';

  const getDeviceIcon = (type) => {
    const Icon = DEVICE_TYPE_ICONS[type] || Box;
    return <Icon className="h-4 w-4" />;
  };

  const getTenantName = (tenantId) => {
    if (!tenantId || tenantId === 'unassigned') return 'Nicht zugewiesen';
    const tenant = tenants.find(t => t.tenant_id === tenantId);
    return tenant?.display_name || tenant?.name || tenantId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`p-6 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt im Lager</p>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {storageData?.total_in_storage || 0}
              </p>
            </div>
            <Warehouse className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        
        <Card className={`p-6 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Verfügbar für Kits</p>
              <p className="text-3xl font-bold text-green-500">
                {storageData?.available_for_kits || 0}
              </p>
            </div>
            <Package className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </Card>
        
        <Card className={`p-6 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>In Kits zugewiesen</p>
              <p className="text-3xl font-bold text-orange-500">
                {(storageData?.total_in_storage || 0) - (storageData?.available_for_kits || 0)}
              </p>
            </div>
            <Box className="h-10 w-10 text-orange-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* By Device Type Summary */}
      {storageData?.by_type && Object.keys(storageData.by_type).length > 0 && (
        <Card className={`p-4 ${cardBg}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Package className="h-5 w-5 text-primary" />
            Nach Gerätetyp (Alle Tenants)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(storageData.by_type).map(([type, data]) => (
              <div 
                key={type} 
                className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getDeviceIcon(type)}
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {DEVICE_TYPE_LABELS[type] || type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {data.total}
                  </span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    {data.available_for_kits} verf.
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* By Tenant Breakdown */}
      {storageData?.by_tenant && Object.keys(storageData.by_tenant).length > 0 && (
        <Card className={`p-4 ${cardBg}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Building2 className="h-5 w-5 text-primary" />
            Nach Tenant
          </h3>
          <div className="space-y-2">
            {Object.entries(storageData.by_tenant).map(([tenantId, data]) => (
              <div key={tenantId} className={`rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => toggleTenantExpanded(tenantId)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-50 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {expandedTenants[tenantId] ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {getTenantName(tenantId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                      {data.total} Geräte
                    </Badge>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                      {data.available_for_kits} verfügbar
                    </Badge>
                  </div>
                </button>
                
                {expandedTenants[tenantId] && (
                  <div className={`px-4 py-3 border-t ${isDark ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(data.by_type).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          {getDeviceIcon(type)}
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {DEVICE_TYPE_LABELS[type] || type}: <strong>{count}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Seriennummer, Hersteller, Modell..."
                className={`pl-10 ${inputBg}`}
              />
            </div>
          </div>
          
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className={`w-[180px] ${inputBg}`}>
              <SelectValue placeholder="Alle Tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Tenants</SelectItem>
              {tenants.map(t => (
                <SelectItem key={t.tenant_id} value={t.tenant_id}>
                  {t.display_name || t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className={`w-[180px] ${inputBg}`}>
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(DEVICE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant={showOnlyAvailable ? 'default' : 'outline'}
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            className={showOnlyAvailable ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Check className="h-4 w-4 mr-2" />
            Nur verfügbar für Kits
          </Button>
          
          <Button variant="outline" onClick={fetchStorageData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </Card>

      {/* Device List */}
      <Card className={`${cardBg} overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Geräte im Lager ({filteredDevices.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Typ
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Seriennummer
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Hersteller / Modell
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tenant
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Eingelagert am
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.map((device) => (
                <tr 
                  key={device.id}
                  className={`border-t ${isDark ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.device_type)}
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {DEVICE_TYPE_LABELS[device.device_type] || device.device_type}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {device.serial_number || '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>{device.manufacturer || '-'}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {device.model || '-'}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {device.tenant_id ? (
                      <Badge variant="outline" className="text-xs">
                        {getTenantName(device.tenant_id)}
                      </Badge>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Nicht zugewiesen
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {device.available_for_kit ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" />
                        Verfügbar
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        In Kit
                      </Badge>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {device.created_at ? new Date(device.created_at).toLocaleDateString('de-DE') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDevices.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredDevices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            theme={theme}
          />
        )}
        
        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <Warehouse className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Keine Geräte im Lager gefunden
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StorageOverview;
