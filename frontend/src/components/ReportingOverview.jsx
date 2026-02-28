/**
 * ReportingOverview - Umfassende Reporting-Übersicht
 * Unterstützt Devices, Locations, Assets, Asset-Kits mit Export-Funktionen
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTenant } from '../contexts/TenantContext';
import { 
  FileText, Download, Printer, Filter, Search, ChevronDown, ChevronRight,
  Monitor, MapPin, Package, Boxes, Building2, X, FileSpreadsheet, File,
  RefreshCw, Eye, Layers
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import toast from 'react-hot-toast';

// Report Templates
const REPORT_TEMPLATES = [
  { id: 'devices-by-location', name: 'Geräte pro Standort', type: 'devices', icon: Monitor },
  { id: 'locations-overview', name: 'Standort-Übersicht', type: 'locations', icon: MapPin },
  { id: 'assets-inventory', name: 'Asset-Inventar', type: 'assets', icon: Package },
  { id: 'asset-kit-composition', name: 'Asset-Kit Zusammensetzung', type: 'kits', icon: Boxes },
  { id: 'teamviewer-list', name: 'TeamViewer-IDs Liste', type: 'teamviewer', icon: Monitor },
  { id: 'all-data', name: 'Gesamtübersicht', type: 'all', icon: Layers },
];

const ReportingOverview = ({ onClose }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const { selectedTenantId, selectedTenantName } = useTenant();
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(selectedTenantId || 'all');
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedKits, setExpandedKits] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  
  const isDark = theme === 'dark';
  
  // Load tenants
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const result = await apiCall('/api/tenants');
        const tenantsArray = result?.data?.tenants || result?.tenants || [];
        setTenants(tenantsArray);
      } catch (error) {
        console.error('Error loading tenants:', error);
      }
    };
    loadTenants();
  }, [apiCall]);
  
  // Load data based on selected template and tenant
  const loadReportData = useCallback(async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    try {
      const tenantParam = selectedTenant !== 'all' ? `?tenant_id=${selectedTenant}` : '';
      
      if (selectedTemplate.type === 'devices' || selectedTemplate.type === 'teamviewer' || selectedTemplate.type === 'all') {
        const devicesResult = await apiCall(`/api/devices${tenantParam}`);
        setDevices(devicesResult?.data?.devices || devicesResult?.devices || []);
      }
      
      if (selectedTemplate.type === 'locations' || selectedTemplate.type === 'all') {
        const locationsResult = await apiCall(`/api/standorte${tenantParam}`);
        setLocations(locationsResult?.data?.standorte || locationsResult?.standorte || locationsResult?.data || []);
      }
      
      if (selectedTemplate.type === 'assets' || selectedTemplate.type === 'kits' || selectedTemplate.type === 'all') {
        const assetsResult = await apiCall('/api/asset-mgmt/assets');
        setAssets(assetsResult?.assets || []);
        
        // Load kit compositions
        const kitsResult = await apiCall('/api/kit-templates');
        setKits(kitsResult?.data?.templates || kitsResult?.templates || []);
      }
      
      toast.success('Daten geladen');
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [apiCall, selectedTemplate, selectedTenant]);
  
  useEffect(() => {
    if (selectedTemplate) {
      loadReportData();
    }
  }, [selectedTemplate, selectedTenant, loadReportData]);
  
  // Filter data based on search and status
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = !searchTerm || 
        device.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.teamviewer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.locationcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.sn_pc?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchTerm, statusFilter]);
  
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const matchesSearch = !searchTerm || 
        location.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.station_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.street?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [locations, searchTerm]);
  
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.warehouse_asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.manufacturer_sn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.type_label?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, statusFilter]);
  
  // Export functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/;/g, ',').replace(/\n/g, ' ');
      }).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportiert');
  };
  
  const exportToExcel = async (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }
    
    // Simple Excel export using CSV with .xlsx extension
    // For proper Excel, we would need xlsx library
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    toast.success('Excel exportiert');
  };
  
  const exportToPDF = (data, title) => {
    if (!data || data.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }
    
    // Create printable HTML
    const headers = Object.keys(data[0]);
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #c00000; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #c00000; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .meta { color: #666; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Erstellt am: ${new Date().toLocaleString('de-DE')}</p>
        <p class="meta">Anzahl Datensätze: ${data.length}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `<tr>${headers.map(h => {
              const val = row[h];
              if (val === null || val === undefined) return '<td></td>';
              if (typeof val === 'object') return `<td>${JSON.stringify(val)}</td>`;
              return `<td>${val}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
  };
  
  // Get current data based on template
  const getCurrentData = () => {
    if (!selectedTemplate) return [];
    
    switch (selectedTemplate.type) {
      case 'devices':
      case 'teamviewer':
        return filteredDevices;
      case 'locations':
        return filteredLocations;
      case 'assets':
      case 'kits':
        return filteredAssets;
      case 'all':
        return [...filteredDevices, ...filteredLocations, ...filteredAssets];
      default:
        return [];
    }
  };
  
  // Render table based on template type
  const renderTable = () => {
    if (!selectedTemplate) return null;
    
    switch (selectedTemplate.type) {
      case 'devices':
        return renderDevicesTable();
      case 'teamviewer':
        return renderTeamViewerTable();
      case 'locations':
        return renderLocationsTable();
      case 'assets':
        return renderAssetsTable();
      case 'kits':
        return renderKitsTable();
      case 'all':
        return renderAllDataTable();
      default:
        return null;
    }
  };
  
  const renderDevicesTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox 
              checked={selectedRows.length === filteredDevices.length && filteredDevices.length > 0}
              onCheckedChange={(checked) => {
                setSelectedRows(checked ? filteredDevices.map(d => d.device_id) : []);
              }}
            />
          </TableHead>
          <TableHead>Device ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Standort</TableHead>
          <TableHead>Stadt</TableHead>
          <TableHead>TeamViewer ID</TableHead>
          <TableHead>SN PC</TableHead>
          <TableHead>Tenant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredDevices.map(device => (
          <TableRow key={device.device_id}>
            <TableCell>
              <Checkbox 
                checked={selectedRows.includes(device.device_id)}
                onCheckedChange={(checked) => {
                  setSelectedRows(prev => 
                    checked 
                      ? [...prev, device.device_id]
                      : prev.filter(id => id !== device.device_id)
                  );
                }}
              />
            </TableCell>
            <TableCell className="font-medium">{device.device_id}</TableCell>
            <TableCell>
              <Badge variant={device.status === 'active' ? 'success' : 'secondary'}>
                {device.status || 'N/A'}
              </Badge>
            </TableCell>
            <TableCell>{device.locationcode || '-'}</TableCell>
            <TableCell>{device.city || '-'}</TableCell>
            <TableCell className="font-mono text-sm">{device.teamviewer_id || '-'}</TableCell>
            <TableCell className="font-mono text-sm">{device.sn_pc || '-'}</TableCell>
            <TableCell>{device.tenant_name || device.tenant_id || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  const renderTeamViewerTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device ID</TableHead>
          <TableHead>TeamViewer ID</TableHead>
          <TableHead>Standort</TableHead>
          <TableHead>Stadt</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredDevices.filter(d => d.teamviewer_id).map(device => (
          <TableRow key={device.device_id}>
            <TableCell className="font-medium">{device.device_id}</TableCell>
            <TableCell className="font-mono text-lg font-bold text-blue-600">{device.teamviewer_id}</TableCell>
            <TableCell>{device.locationcode || '-'}</TableCell>
            <TableCell>{device.city || '-'}</TableCell>
            <TableCell>
              <Badge variant={device.status === 'active' ? 'success' : 'secondary'}>
                {device.status || 'N/A'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  const renderLocationsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Standort-Code</TableHead>
          <TableHead>Stationsname</TableHead>
          <TableHead>Straße</TableHead>
          <TableHead>PLZ</TableHead>
          <TableHead>Stadt</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Geräte</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredLocations.map(location => (
          <TableRow key={location.location_code || location.id}>
            <TableCell className="font-medium">{location.location_code || '-'}</TableCell>
            <TableCell>{location.station_name || '-'}</TableCell>
            <TableCell>{location.street || '-'}</TableCell>
            <TableCell>{location.postal_code || '-'}</TableCell>
            <TableCell>{location.city || '-'}</TableCell>
            <TableCell>{location.phone || '-'}</TableCell>
            <TableCell>
              <Badge variant="outline">{location.device_count || 0}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  const renderAssetsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset ID</TableHead>
          <TableHead>Warehouse ID</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Seriennummer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Standort</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAssets.map(asset => (
          <TableRow key={asset.asset_id || asset.warehouse_asset_id}>
            <TableCell className="font-medium">{asset.asset_id || '-'}</TableCell>
            <TableCell className="font-mono text-sm">{asset.warehouse_asset_id || '-'}</TableCell>
            <TableCell>{asset.type_label || asset.type || '-'}</TableCell>
            <TableCell className="font-mono text-sm">{asset.manufacturer_sn || '-'}</TableCell>
            <TableCell>
              <Badge variant={asset.status === 'active' ? 'success' : asset.status === 'in_stock' ? 'default' : 'secondary'}>
                {asset.status || 'N/A'}
              </Badge>
            </TableCell>
            <TableCell>{asset.location_name || asset.location_code || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  const renderKitsTable = () => (
    <div className="space-y-4">
      {filteredAssets.filter(a => a.type === 'kit_tsr' || a.type_label?.includes('Kit')).map(kit => (
        <Card key={kit.asset_id} className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedKits(prev => ({ ...prev, [kit.asset_id]: !prev[kit.asset_id] }))}
          >
            <div className="flex items-center gap-3">
              {expandedKits[kit.asset_id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              <Boxes className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-bold">{kit.asset_id}</p>
                <p className="text-sm text-gray-500">{kit.type_label}</p>
              </div>
            </div>
            <Badge>{kit.status}</Badge>
          </div>
          
          {expandedKits[kit.asset_id] && (
            <div className="mt-4 pl-10 border-l-2 border-gray-200 space-y-2">
              <p className="text-sm font-medium mb-2">Komponenten:</p>
              {kit.components?.length > 0 ? (
                kit.components.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span>{comp.type_label || comp.type}: </span>
                    <span className="font-mono">{comp.asset_id || comp.serial_number}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Keine Komponenten-Details verfügbar</p>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
  
  const renderAllDataTable = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Monitor className="h-5 w-5" /> Geräte ({filteredDevices.length})
        </h3>
        {renderDevicesTable()}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Standorte ({filteredLocations.length})
        </h3>
        {renderLocationsTable()}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Package className="h-5 w-5" /> Assets ({filteredAssets.length})
        </h3>
        {renderAssetsTable()}
      </div>
    </div>
  );
  
  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`h-16 px-6 flex items-center justify-between border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#c00000]" />
          <h1 className="text-xl font-bold">Reporting & Auswertungen</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Report Templates */}
        <div className={`w-72 border-r p-4 overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="font-semibold mb-4">Report-Vorlagen</h2>
          <div className="space-y-2">
            {REPORT_TEMPLATES.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-[#c00000] text-white'
                      : isDark 
                        ? 'hover:bg-gray-700' 
                        : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              );
            })}
          </div>
          
          {/* Tenant Filter */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3">Tenant Filter</h3>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger>
                <SelectValue placeholder="Tenant wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Tenants</SelectItem>
                {tenants.map(tenant => (
                  <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className={`px-6 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Status Filter */}
              {(selectedTemplate?.type === 'devices' || selectedTemplate?.type === 'assets') && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="in_stock">Auf Lager</SelectItem>
                    <SelectItem value="in_preparation">In Vorbereitung</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={loadReportData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToPDF(getCurrentData(), selectedTemplate?.name || 'Report')}
                disabled={!selectedTemplate}
              >
                <Printer className="h-4 w-4 mr-2" />
                PDF / Drucken
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel(getCurrentData(), selectedTemplate?.id || 'report')}
                disabled={!selectedTemplate}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(getCurrentData(), selectedTemplate?.id || 'report')}
                disabled={!selectedTemplate}
              >
                <File className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
          
          {/* Data Table */}
          <div className="flex-1 overflow-auto p-6">
            {!selectedTemplate ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">Wählen Sie eine Report-Vorlage aus der linken Seitenleiste</p>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#c00000]" />
              </div>
            ) : (
              <Card className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {selectedTemplate.icon && <selectedTemplate.icon className="h-5 w-5" />}
                    {selectedTemplate.name}
                  </h2>
                  <Badge variant="outline">
                    {getCurrentData().length} Einträge
                  </Badge>
                </div>
                {renderTable()}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingOverview;
