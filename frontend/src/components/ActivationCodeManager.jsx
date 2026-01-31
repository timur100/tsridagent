import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Plus, Trash2, Copy, Download, Check, Loader2, Search, RefreshCw, Building2, Settings } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useTenant } from '../contexts/TenantContext';
import TableExportImport from './ui/TableExportImport';
import TableColumnSettings from './ui/TableColumnSettings';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Default column configuration for Activation Codes
const DEFAULT_CODE_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false },
  { id: 'code', label: 'Code', visible: true, sortable: true },
  { id: 'device_id', label: 'Device-ID', visible: true, sortable: true },
  { id: 'location_code', label: 'Standort', visible: true, sortable: true },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'created_at', label: 'Erstellt', visible: true, sortable: true },
  { id: 'activated_at', label: 'Aktiviert', visible: false, sortable: true },
  { id: 'expires_at', label: 'Läuft ab', visible: false, sortable: true },
  { id: 'actions', label: 'Aktionen', visible: true, sortable: false },
];

/**
 * ActivationCodeManager - Admin-UI für Aktivierungscode-Verwaltung
 * Ermöglicht das Generieren, Anzeigen und Verwalten von Aktivierungscodes
 * Gefiltert nach dem aktuell ausgewählten Tenant
 */
const ActivationCodeManager = () => {
  const { selectedTenantId, selectedTenantName } = useTenant();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('activationCodeColumns');
    return saved ? JSON.parse(saved) : DEFAULT_CODE_COLUMNS;
  });
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Generierung States
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [locationCode, setLocationCode] = useState('');
  
  // Tenant ID für API-Calls (lowercase, ohne UUID)
  const tenantIdForApi = selectedTenantId === 'all' 
    ? '' 
    : (selectedTenantName?.toLowerCase() || 'europcar');

  // Lade alle Codes beim Start und bei Tenant-Wechsel
  useEffect(() => {
    loadCodes();
  }, [statusFilter, selectedTenantId]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/activation/list?limit=100`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      // Filter by tenant if not "all"
      if (tenantIdForApi) {
        url += `&tenant_id=${tenantIdForApi}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCodes(data.codes || []);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Codes:', e);
      toast.error('Fehler beim Laden der Aktivierungscodes');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    if (!deviceId.trim() || !locationCode.trim()) {
      toast.error('Bitte Device-ID und Location-Code eingeben');
      return;
    }
    
    if (selectedTenantId === 'all') {
      toast.error('Bitte wählen Sie zuerst einen Tenant aus');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/activation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.trim().toUpperCase(),
          location_code: locationCode.trim().toUpperCase(),
          tenant_id: tenantIdForApi
        })
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Aktivierungscode ${data.activation_code.code} generiert!`);
        setShowGenerateForm(false);
        setDeviceId('');
        setLocationCode('');
        setSelectedCode(data.activation_code);
        loadCodes();
      } else {
        toast.error(data.detail || 'Fehler beim Generieren');
      }
    } catch (e) {
      console.error('Fehler beim Generieren:', e);
      toast.error('Fehler beim Generieren des Codes');
    } finally {
      setGenerating(false);
    }
  };

  const deleteCode = async (code) => {
    if (!confirm(`Aktivierungscode ${code} wirklich löschen?`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/activation/${code}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Code gelöscht');
        if (selectedCode?.code === code) {
          setSelectedCode(null);
        }
        loadCodes();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
      toast.error('Fehler beim Löschen des Codes');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('In Zwischenablage kopiert');
  };

  const downloadQRCode = (code, qrBase64) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qrBase64}`;
    link.download = `QR-${code}.png`;
    link.click();
    toast.success('QR-Code heruntergeladen');
  };

  // Gefilterte Codes
  const filteredCodes = codes.filter(code => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      code.code?.toLowerCase().includes(query) ||
      code.device_id?.toLowerCase().includes(query) ||
      code.location_code?.toLowerCase().includes(query)
    );
  });

  // Paginated codes
  const paginatedCodes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCodes.slice(startIndex, startIndex + pageSize);
  }, [filteredCodes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCodes.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header mit Tenant-Anzeige */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Aktivierungscodes</h3>
            <p className="text-sm text-muted-foreground">
              QR-Codes und Aktivierungscodes für Geräte verwalten
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Export/Import and Column Settings */}
          <TableExportImport
            data={codes}
            columns={columns}
            filename="aktivierungscodes"
            selectedIds={selectedIds}
            idField="code"
          />
          <TableColumnSettings
            columns={columns}
            onColumnsChange={setColumns}
            storageKey="activationCodeColumns"
            defaultColumns={DEFAULT_CODE_COLUMNS}
          />
          {/* Aktueller Tenant Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <span className="text-xs text-muted-foreground block">Aktueller Tenant:</span>
              <span className="font-semibold text-primary">
                {selectedTenantId === 'all' ? 'Alle Tenants' : selectedTenantName}
              </span>
            </div>
          </div>
          <Button 
            onClick={() => setShowGenerateForm(true)} 
            className="gap-2"
            disabled={selectedTenantId === 'all'}
          >
            <Plus className="h-4 w-4" />
            Neuen Code generieren
          </Button>
        </div>
      </div>

      {/* Warnung wenn kein Tenant ausgewählt */}
      {selectedTenantId === 'all' && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-yellow-600">
              Bitte wählen Sie einen Tenant im Header aus, um Aktivierungscodes zu generieren oder zu filtern.
            </p>
          </div>
        </Card>
      )}

      {/* Generierungs-Formular */}
      {showGenerateForm && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <h4 className="font-semibold text-foreground mb-4">
            Neuen Aktivierungscode generieren für <span className="text-primary">{selectedTenantName}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Device-ID *</label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="z.B. BERT01-01"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Location-Code *</label>
              <Input
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                placeholder="z.B. BERT01"
                className="font-mono"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={generateCode} disabled={generating} className="flex-1">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generieren'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowGenerateForm(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter & Suche */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Code, Device-ID oder Location..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="activated">Aktiviert</SelectItem>
            <SelectItem value="expired">Abgelaufen</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadCodes}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Zwei-Spalten Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Codes Liste */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b border-border">
            <h4 className="font-semibold text-foreground">
              Aktivierungscodes ({filteredCodes.length})
            </h4>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Lade Codes...
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Keine Aktivierungscodes gefunden
              </div>
            ) : (
              filteredCodes.map((code) => (
                <div
                  key={code.code}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedCode?.code === code.code ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => setSelectedCode(code)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-primary text-lg">
                      {code.code}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      code.status === 'activated' 
                        ? 'bg-green-500/20 text-green-500' 
                        : code.status === 'expired'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {code.status === 'activated' ? 'Aktiviert' : 
                       code.status === 'expired' ? 'Abgelaufen' : 'Ausstehend'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{code.device_id}</span>
                    <span className="mx-2">@</span>
                    <span className="font-mono">{code.location_code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Erstellt: {new Date(code.created_at).toLocaleString('de-DE')}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* QR-Code & Details */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b border-border">
            <h4 className="font-semibold text-foreground">QR-Code & Details</h4>
          </div>
          {selectedCode ? (
            <div className="p-6">
              {/* QR-Code */}
              <div className="flex flex-col items-center mb-6">
                <div className="bg-white p-4 rounded-lg shadow-lg mb-4">
                  <img
                    src={`data:image/png;base64,${selectedCode.qr_code_base64}`}
                    alt={`QR-Code für ${selectedCode.code}`}
                    className="w-48 h-48"
                  />
                </div>
                <p className="font-mono font-bold text-2xl text-primary mb-2">
                  {selectedCode.code}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedCode.code)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Code kopieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQRCode(selectedCode.code, selectedCode.qr_code_base64)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    QR herunterladen
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${
                    selectedCode.status === 'activated' ? 'text-green-500' : 
                    selectedCode.status === 'expired' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {selectedCode.status === 'activated' ? 'Aktiviert' : 
                     selectedCode.status === 'expired' ? 'Abgelaufen' : 'Ausstehend'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Device-ID:</span>
                  <span className="font-mono font-medium text-foreground">{selectedCode.device_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-mono font-medium text-foreground">{selectedCode.location_code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium text-foreground">{selectedCode.tenant_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Erstellt:</span>
                  <span className="text-foreground">
                    {new Date(selectedCode.created_at).toLocaleString('de-DE')}
                  </span>
                </div>
                {selectedCode.activated_at && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Aktiviert:</span>
                    <span className="text-foreground">
                      {new Date(selectedCode.activated_at).toLocaleString('de-DE')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Aktivierungs-URL:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedCode.activation_url)}
                    className="gap-1 h-auto py-1"
                  >
                    <Copy className="h-3 w-3" />
                    URL kopieren
                  </Button>
                </div>
              </div>

              {/* Löschen Button */}
              {selectedCode.status !== 'activated' && (
                <div className="mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => deleteCode(selectedCode.code)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Code löschen
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Wählen Sie einen Code aus der Liste um den QR-Code anzuzeigen</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ActivationCodeManager;
