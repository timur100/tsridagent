/**
 * ReportingOverview - Umfassende Reporting-Übersicht
 * Unterstützt Devices, Locations, Assets, Asset-Kits mit Export-Funktionen
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { 
  FileText, Printer, Search, ChevronDown, ChevronRight,
  Monitor, MapPin, Package, Boxes, X, FileSpreadsheet, File,
  RefreshCw, Layers, Building2
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
  const { selectedTenantId } = useTenant();
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(selectedTenantId || 'all');
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedKits, setExpandedKits] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Load tenants on mount
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const response = await apiCall('/api/tenants');
        const apiData = response?.data;
        const tenantsArray = apiData?.tenants || [];
        console.log('[Reporting] Loaded tenants:', tenantsArray.length);
        setTenants(tenantsArray);
      } catch (error) {
        console.error('[Reporting] Error loading tenants:', error);
      }
    };
    loadTenants();
  }, [apiCall]);
  
  // Load data based on selected template and tenant
  const loadReportData = useCallback(async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    setDataLoaded(false);
    
    try {
      console.log('[Reporting] Loading data for template:', selectedTemplate.type, 'tenant:', selectedTenant);
      
      // Load devices for device-related reports
      if (['devices', 'teamviewer', 'all'].includes(selectedTemplate.type)) {
        try {
          let devicesList = [];
          
          if (selectedTenant && selectedTenant !== 'all') {
            // Get devices for specific tenant
            const response = await apiCall(`/api/tenant-devices/${selectedTenant}`);
            const apiData = response?.data;
            devicesList = apiData?.data?.devices || apiData?.devices || [];
          } else {
            // Get all devices from all tenants
            const response = await apiCall('/api/tenant-devices/all/devices');
            const apiData = response?.data;
            devicesList = apiData?.data?.devices || apiData?.devices || [];
          }
          
          console.log('[Reporting] Loaded devices:', devicesList.length);
          setDevices(devicesList);
        } catch (e) {
          console.error('[Reporting] Error loading devices:', e);
          setDevices([]);
        }
      }
      
      // Load locations
      if (['locations', 'all'].includes(selectedTemplate.type)) {
        try {
          let locationsList = [];
          
          if (selectedTenant && selectedTenant !== 'all') {
            // Get locations for specific tenant
            const response = await apiCall(`/api/tenant-locations/${selectedTenant}`);
            const apiData = response?.data;
            locationsList = apiData?.locations || apiData?.data?.locations || [];
          } else {
            // For "all" tenants, load locations from all available tenants
            const allLocations = [];
            
            // Load tenants first if not already loaded
            let tenantsToFetch = tenants;
            if (tenantsToFetch.length === 0) {
              const tenantsResponse = await apiCall('/api/tenants');
              tenantsToFetch = tenantsResponse?.data?.tenants || [];
            }
            
            // Load locations from each tenant
            for (const tenant of tenantsToFetch) {
              try {
                const response = await apiCall(`/api/tenant-locations/${tenant.tenant_id}`);
                const apiData = response?.data;
                const tenantLocations = apiData?.locations || apiData?.data?.locations || [];
                allLocations.push(...tenantLocations);
              } catch (tenantError) {
                console.error(`[Reporting] Error loading locations for tenant ${tenant.tenant_id}:`, tenantError);
              }
            }
            
            locationsList = allLocations;
          }
          
          console.log('[Reporting] Loaded locations:', locationsList.length);
          setLocations(Array.isArray(locationsList) ? locationsList : []);
        } catch (e) {
          console.error('[Reporting] Error loading locations:', e);
          setLocations([]);
        }
      }
      
      // Load assets
      if (['assets', 'kits', 'all'].includes(selectedTemplate.type)) {
        try {
          const response = await apiCall('/api/asset-mgmt/assets');
          const apiData = response?.data;
          const assetsList = apiData?.assets || apiData?.data?.assets || [];
          console.log('[Reporting] Loaded assets:', assetsList.length);
          setAssets(assetsList);
        } catch (e) {
          console.error('[Reporting] Error loading assets:', e);
          setAssets([]);
        }
      }
      
      setDataLoaded(true);
      toast.success('Daten geladen');
    } catch (error) {
      console.error('[Reporting] Error loading report data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [apiCall, selectedTemplate, selectedTenant]);
  
  // Load data when template or tenant changes
  useEffect(() => {
    if (selectedTemplate) {
      loadReportData();
    }
  }, [selectedTemplate, selectedTenant, loadReportData]);
  
  // Filter devices
  const filteredDevices = useMemo(() => {
    if (!devices || !Array.isArray(devices)) return [];
    
    return devices.filter(device => {
      const matchesSearch = !searchTerm || 
        device.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.teamviewer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.locationcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.sn_pc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchTerm, statusFilter]);
  
  // Filter locations
  const filteredLocations = useMemo(() => {
    if (!locations || !Array.isArray(locations)) return [];
    
    return locations.filter(location => {
      const matchesSearch = !searchTerm || 
        location.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.station_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.street?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [locations, searchTerm]);
  
  // Filter assets
  const filteredAssets = useMemo(() => {
    if (!assets || !Array.isArray(assets)) return [];
    
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
  
  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }
    
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
    
    const headers = Object.keys(data[0]);
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #d50c2d; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #d50c2d; color: white; }
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
  
  // Render devices table
  const renderDevicesTable = () => {
    if (filteredDevices.length === 0) {
      return (
        <div className="text-center py-8 text-[#8c8c8c]">
          <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Keine Geräte gefunden</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Standort</TableHead>
            <TableHead>Stadt</TableHead>
            <TableHead>TeamViewer ID</TableHead>
            <TableHead>SN PC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDevices.map(device => (
            <TableRow key={device.device_id || device.id}>
              <TableCell className="font-medium">{device.device_id || '-'}</TableCell>
              <TableCell>
                <Badge variant={device.status === 'active' ? 'default' : 'secondary'} 
                       className={device.status === 'active' ? 'bg-[#16a34a]' : ''}>
                  {device.status || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>{device.locationcode || '-'}</TableCell>
              <TableCell>{device.city || '-'}</TableCell>
              <TableCell className="font-mono text-sm">{device.teamviewer_id || '-'}</TableCell>
              <TableCell className="font-mono text-sm">{device.sn_pc || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render TeamViewer table
  const renderTeamViewerTable = () => {
    const devicesWithTV = filteredDevices.filter(d => d.teamviewer_id);
    
    if (devicesWithTV.length === 0) {
      return (
        <div className="text-center py-8 text-[#8c8c8c]">
          <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Keine TeamViewer-IDs gefunden</p>
        </div>
      );
    }
    
    return (
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
          {devicesWithTV.map(device => (
            <TableRow key={device.device_id}>
              <TableCell className="font-medium">{device.device_id}</TableCell>
              <TableCell className="font-mono text-lg font-bold text-[#d50c2d]">{device.teamviewer_id}</TableCell>
              <TableCell>{device.locationcode || '-'}</TableCell>
              <TableCell>{device.city || '-'}</TableCell>
              <TableCell>
                <Badge variant={device.status === 'active' ? 'default' : 'secondary'}
                       className={device.status === 'active' ? 'bg-[#16a34a]' : ''}>
                  {device.status || 'N/A'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render locations table
  const renderLocationsTable = () => {
    if (filteredLocations.length === 0) {
      return (
        <div className="text-center py-8 text-[#8c8c8c]">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Keine Standorte gefunden</p>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Standort-Code</TableHead>
            <TableHead>Stationsname</TableHead>
            <TableHead>Straße</TableHead>
            <TableHead>PLZ</TableHead>
            <TableHead>Stadt</TableHead>
            <TableHead>Telefon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLocations.map((location, idx) => (
            <TableRow key={location.location_code || location.id || idx}>
              <TableCell className="font-medium">{location.location_code || '-'}</TableCell>
              <TableCell>{location.station_name || '-'}</TableCell>
              <TableCell>{location.street || '-'}</TableCell>
              <TableCell>{location.postal_code || location.zip || '-'}</TableCell>
              <TableCell>{location.city || '-'}</TableCell>
              <TableCell>{location.phone || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render assets table
  const renderAssetsTable = () => {
    if (filteredAssets.length === 0) {
      return (
        <div className="text-center py-8 text-[#8c8c8c]">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Keine Assets gefunden</p>
        </div>
      );
    }
    
    return (
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
          {filteredAssets.map((asset, idx) => (
            <TableRow key={asset.asset_id || asset.warehouse_asset_id || idx}>
              <TableCell className="font-medium">{asset.asset_id || '-'}</TableCell>
              <TableCell className="font-mono text-sm">{asset.warehouse_asset_id || '-'}</TableCell>
              <TableCell>{asset.type_label || asset.type || '-'}</TableCell>
              <TableCell className="font-mono text-sm">{asset.manufacturer_sn || '-'}</TableCell>
              <TableCell>
                <Badge variant={asset.status === 'active' ? 'default' : asset.status === 'in_stock' ? 'outline' : 'secondary'}
                       className={asset.status === 'active' ? 'bg-[#16a34a]' : ''}>
                  {asset.status || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>{asset.location_name || asset.location_code || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render kits table
  const renderKitsTable = () => {
    const kitAssets = filteredAssets.filter(a => a.type === 'kit_tsr' || a.type_label?.toLowerCase().includes('kit'));
    
    if (kitAssets.length === 0) {
      return (
        <div className="text-center py-8 text-[#8c8c8c]">
          <Boxes className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Keine Asset-Kits gefunden</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {kitAssets.map((kit, idx) => (
          <Card key={kit.asset_id || idx} className="p-4 bg-[#2e2e2e] border-[#595959]">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedKits(prev => ({ ...prev, [kit.asset_id]: !prev[kit.asset_id] }))}
            >
              <div className="flex items-center gap-3">
                {expandedKits[kit.asset_id] ? <ChevronDown className="h-5 w-5 text-[#d4d4d4]" /> : <ChevronRight className="h-5 w-5 text-[#d4d4d4]" />}
                <Boxes className="h-5 w-5 text-[#d50c2d]" />
                <div>
                  <p className="font-bold text-[#ededed]">{kit.asset_id}</p>
                  <p className="text-sm text-[#8c8c8c]">{kit.type_label} | SN: {kit.manufacturer_sn || 'N/A'}</p>
                </div>
              </div>
              <Badge className={kit.status === 'active' ? 'bg-[#16a34a]' : 'bg-[#383838]'}>{kit.status}</Badge>
            </div>
            
            {expandedKits[kit.asset_id] && (
              <div className="mt-4 pl-10 border-l-2 border-[#d50c2d]/30 space-y-2">
                <p className="text-sm font-medium mb-2 text-[#d4d4d4]">Komponenten:</p>
                {kit.components?.length > 0 ? (
                  kit.components.map((comp, cidx) => (
                    <div key={cidx} className="flex items-center gap-2 text-sm text-[#d4d4d4]">
                      <Package className="h-4 w-4 text-[#8c8c8c]" />
                      <span>{comp.type_label || comp.type}: </span>
                      <span className="font-mono">{comp.asset_id || comp.serial_number}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8c8c8c]">Keine Komponenten-Details verfügbar</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };
  
  // Render table based on template type
  const renderTable = () => {
    if (!selectedTemplate) return null;
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[#d50c2d]" />
        </div>
      );
    }
    
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
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#ededed]">
                <Monitor className="h-5 w-5 text-[#d50c2d]" /> Geräte ({filteredDevices.length})
              </h3>
              {renderDevicesTable()}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#ededed]">
                <MapPin className="h-5 w-5 text-[#d50c2d]" /> Standorte ({filteredLocations.length})
              </h3>
              {renderLocationsTable()}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#ededed]">
                <Package className="h-5 w-5 text-[#d50c2d]" /> Assets ({filteredAssets.length})
              </h3>
              {renderAssetsTable()}
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Get selected tenant name
  const getSelectedTenantName = () => {
    if (selectedTenant === 'all') return 'Alle Tenants';
    const tenant = tenants.find(t => t.tenant_id === selectedTenant);
    return tenant?.name || selectedTenant;
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-[#141414]">
      {/* Header - Hetzner Blue Style */}
      <div className="h-16 px-6 flex items-center justify-between bg-[#262626] border-b border-[#595959]">
        <div className="flex items-center gap-4">
          <FileText className="h-6 w-6 text-[#d50c2d]" />
          <h1 className="text-xl font-bold text-[#ededed]">
            Reporting & Auswertungen
          </h1>
        </div>
        
        {/* Tenant Selector im Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#8c8c8c]" />
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-56 bg-[#2e2e2e] border-[#595959] text-[#ededed]">
                <SelectValue placeholder="Tenant wählen" />
              </SelectTrigger>
              <SelectContent className="bg-[#2e2e2e] border-[#595959]">
                <SelectItem value="all">Alle Tenants</SelectItem>
                {tenants.map(tenant => (
                  <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="border-[#595959] text-[#ededed] hover:bg-[#383838]"
          >
            <X className="h-4 w-4 mr-2" />
            Schließen
          </Button>
        </div>
      </div>
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Report Templates */}
        <div className="w-72 border-r p-4 overflow-y-auto bg-[#262626] border-[#595959]">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-[#8c8c8c]">Report-Vorlagen</h2>
          <div className="space-y-2">
            {REPORT_TEMPLATES.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'bg-[#d50c2d] text-white shadow-lg'
                      : 'hover:bg-[#383838] text-[#d4d4d4]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              );
            })}
          </div>
          
          {/* Current Selection Info */}
          {selectedTenant && (
            <div className="mt-6 pt-6 border-t border-[#595959]">
              <p className="text-xs uppercase tracking-wide text-[#8c8c8c] mb-2">Aktueller Filter</p>
              <div className="p-3 rounded-lg bg-[#2e2e2e]">
                <p className="text-sm font-medium text-[#ededed]">{getSelectedTenantName()}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b flex items-center justify-between bg-[#262626] border-[#595959]">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c8c]" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#2e2e2e] border-[#595959] text-[#ededed] placeholder:text-[#8c8c8c]"
                />
              </div>
              
              {/* Status Filter */}
              {selectedTemplate && ['devices', 'assets', 'all'].includes(selectedTemplate.type) && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-[#2e2e2e] border-[#595959] text-[#ededed]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2e2e2e] border-[#595959]">
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="in_stock">Auf Lager</SelectItem>
                    <SelectItem value="in_preparation">In Vorbereitung</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Refresh */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadReportData} 
                disabled={loading || !selectedTemplate}
                className="border-[#595959] text-[#ededed] hover:bg-[#383838]"
              >
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
                disabled={!selectedTemplate || getCurrentData().length === 0}
                className="border-[#d50c2d] text-[#d50c2d] hover:bg-[#d50c2d] hover:text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                PDF / Drucken
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel(getCurrentData(), selectedTemplate?.id || 'report')}
                disabled={!selectedTemplate || getCurrentData().length === 0}
                className="border-[#595959] text-[#ededed] hover:bg-[#383838]"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(getCurrentData(), selectedTemplate?.id || 'report')}
                disabled={!selectedTemplate || getCurrentData().length === 0}
                className="border-[#595959] text-[#ededed] hover:bg-[#383838]"
              >
                <File className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
          
          {/* Data Table */}
          <div className="flex-1 overflow-auto p-6 bg-[#141414]">
            {!selectedTemplate ? (
              <div className="h-full flex flex-col items-center justify-center text-[#8c8c8c]">
                <FileText className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Wählen Sie eine Report-Vorlage</p>
                <p className="text-sm mt-2">Klicken Sie links auf einen Report-Typ</p>
              </div>
            ) : (
              <Card className="p-6 bg-[#262626] border-[#595959]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-[#ededed]">
                    {selectedTemplate.icon && <selectedTemplate.icon className="h-5 w-5 text-[#d50c2d]" />}
                    {selectedTemplate.name}
                  </h2>
                  {dataLoaded && (
                    <Badge variant="outline" className="text-[#d50c2d] border-[#d50c2d]">
                      {getCurrentData().length} Einträge
                    </Badge>
                  )}
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
