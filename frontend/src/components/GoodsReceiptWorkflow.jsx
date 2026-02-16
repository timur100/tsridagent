import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, MapPin, Search, Plus, Check, Trash2, 
  RefreshCw, Barcode, Printer, ArrowRight, CheckCircle,
  Tag, Scan, ClipboardList
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Asset-Typ Kategorien für Dropdown
const ASSET_TYPE_CATEGORIES = {
  'Tablets': [
    { value: 'tab_sp4', label: 'Surface Pro 4' },
    { value: 'tab_sp6', label: 'Surface Pro 6' },
    { value: 'tab_tsr_i5', label: 'TSRID Tablet i5' },
    { value: 'tab_tsr_i7', label: 'TSRID Tablet i7' },
  ],
  'Scanner': [
    { value: 'sca_tsr', label: 'TSRID Scanner' },
    { value: 'sca_dsk', label: 'Desko Scanner' },
  ],
  'Tablet Docks': [
    { value: 'tdo_qer', label: 'Quer Dock (Surface)' },
    { value: 'tdo_tsr', label: 'TSRID Tablet Dock' },
  ],
  'Scanner Docks': [
    { value: 'sdo_dsk', label: 'Desko Scanner Dock' },
    { value: 'sdo_tsr', label: 'TSRID Scanner Dock' },
  ],
  'Netzteile': [
    { value: 'tps_spx', label: 'Surface Netzteil' },
    { value: 'tps_tsr', label: 'TSRID Tablet Netzteil' },
    { value: 'sps_dsk', label: 'Desko Scanner Netzteil' },
    { value: 'sps_tsr', label: 'TSRID Scanner Netzteil' },
  ],
  'Kabel (mit SN)': [
    { value: 'cab_usb_a', label: 'USB-A Kabel' },
    { value: 'cab_usb_c', label: 'USB-C Kabel' },
    { value: 'cab_lan', label: 'LAN-Kabel' },
    { value: 'cab_hdmi', label: 'HDMI-Kabel' },
    { value: 'cab_dp', label: 'DisplayPort-Kabel' },
    { value: 'cab_pwr', label: 'Stromkabel' },
  ],
  'Adapter': [
    { value: 'adp_usb_c', label: 'USB-C Adapter/Hub' },
    { value: 'adp_hdmi', label: 'HDMI Adapter' },
    { value: 'adp_dp', label: 'DisplayPort Adapter' },
    { value: 'adp_90', label: '90° Adapter' },
  ],
  'Stromverteiler': [
    { value: 'pwr_strip', label: 'Netzleiste' },
    { value: 'pwr_12v', label: '12V Verteiler' },
  ],
  'Sonstiges': [
    { value: 'other', label: 'Sonstiges' },
  ]
};

const GoodsReceiptWorkflow = ({ theme, onRefreshStats }) => {
  const isDark = theme === 'dark';
  const [activeSubTab, setActiveSubTab] = useState('intake');
  const [loading, setLoading] = useState(false);
  
  // Wareneingang (Intake) State
  const [intakeItems, setIntakeItems] = useState([]);
  const [currentSN, setCurrentSN] = useState('');
  const [currentIMEI, setCurrentIMEI] = useState('');
  const [currentMAC, setCurrentMAC] = useState('');
  const [currentType, setCurrentType] = useState('tab_tsr_i7');
  const [receivedBy, setReceivedBy] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  
  // Auto Asset-ID State
  const [nextAssetId, setNextAssetId] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Unassigned Assets State
  const [unassignedAssets, setUnassignedAssets] = useState([]);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [typeSummary, setTypeSummary] = useState({});
  const [searchUnassigned, setSearchUnassigned] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const pageSize = 50;
  
  // Assignment State
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assetToAssign, setAssetToAssign] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [assignTechnician, setAssignTechnician] = useState('');
  
  // Tenant/Location Selection State (like Kit Management)
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  
  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  
  // Label Modal State
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelData, setLabelData] = useState(null);
  
  // Quick Add Supplier Modal State
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch next asset ID for selected type
  const fetchNextAssetId = useCallback(async (assetType) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/asset-id-config/next-id?asset_type=${assetType}`);
      const data = await res.json();
      if (data.success) {
        setNextAssetId(data.next_asset_id);
      }
    } catch (e) {
      console.error('Error fetching next asset ID:', e);
    }
  }, []);

  // Update next ID when type changes
  useEffect(() => {
    fetchNextAssetId(currentType);
  }, [currentType, fetchNextAssetId]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/suppliers`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.suppliers || []);
      }
    } catch (e) {
      console.error('Error fetching suppliers:', e);
    }
  }, []);

  // Quick add supplier
  const quickAddSupplier = async () => {
    if (!quickSupplierName.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: quickSupplierName.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Lieferant "${quickSupplierName}" angelegt`);
        setSupplier(quickSupplierName.trim());
        setQuickSupplierName('');
        setShowQuickSupplierModal(false);
        fetchSuppliers();
      } else {
        toast.error(data.detail || 'Fehler beim Anlegen');
      }
    } catch (e) {
      console.error('Error creating supplier:', e);
      toast.error('Fehler beim Anlegen des Lieferanten');
    }
  };

  // Handle supplier selection
  const handleSupplierChange = (value) => {
    if (value === '__new__') {
      setShowQuickSupplierModal(true);
    } else {
      setSupplier(value);
    }
  };

  // Fetch unassigned assets
  const fetchUnassignedAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pagination.page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (searchUnassigned) params.append('search', searchUnassigned);
      if (filterType && filterType !== 'all') params.append('type', filterType);

      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/unassigned?${params}`);
      const data = await res.json();
      if (data.success) {
        setUnassignedAssets(data.assets || []);
        setUnassignedTotal(data.total || 0);
        setTypeSummary(data.type_summary || {});
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
      }
    } catch (e) {
      console.error('Error fetching unassigned assets:', e);
      toast.error('Fehler beim Laden der nicht zugewiesenen Geräte');
    } finally {
      setLoading(false);
    }
  }, [searchUnassigned, filterType, pagination.page]);

  // Fetch locations for assignment
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/locations?limit=500`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'unassigned') {
      fetchUnassignedAssets();
    }
    fetchLocations();
    fetchSuppliers();
  }, [activeSubTab, fetchUnassignedAssets, fetchLocations, fetchSuppliers]);

  // Delete unassigned asset
  const deleteUnassignedAsset = async (sn) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/unassigned/${encodeURIComponent(sn)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Gerät ${sn} wurde gelöscht`);
        setShowDeleteModal(false);
        setAssetToDelete(null);
        fetchUnassignedAssets();
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      console.error('Error deleting asset:', e);
      toast.error('Fehler beim Löschen des Geräts');
    } finally {
      setLoading(false);
    }
  };

  // Delete selected assets (bulk)
  const deleteSelectedAssets = async () => {
    if (selectedAssets.size === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/unassigned/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.from(selectedAssets))
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.deleted_count} Geräte gelöscht`);
        setSelectedAssets(new Set());
        setShowDeleteModal(false);
        fetchUnassignedAssets();
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      console.error('Error deleting assets:', e);
      toast.error('Fehler beim Löschen der Geräte');
    } finally {
      setLoading(false);
    }
  };

  // Add item to intake list with auto-generated asset ID
  const addIntakeItem = async () => {
    if (!currentSN.trim()) {
      toast.error('Bitte Seriennummer eingeben');
      return;
    }
    
    // Check for duplicate
    if (intakeItems.some(item => item.manufacturer_sn === currentSN.trim())) {
      toast.error('Seriennummer bereits in der Liste');
      return;
    }
    
    const typeLabel = Object.values(ASSET_TYPE_CATEGORIES)
      .flat()
      .find(t => t.value === currentType)?.label || currentType;
    
    // Calculate next ID based on already added items of same type
    const sameTypeCount = intakeItems.filter(i => i.type === currentType).length;
    const baseIdParts = nextAssetId.split('-');
    const baseSeq = parseInt(baseIdParts[baseIdParts.length - 1]) || 1;
    const newSeq = baseSeq + sameTypeCount;
    const newAssetId = baseIdParts.slice(0, -1).join('-') + '-' + String(newSeq).padStart(4, '0');
    
    setIntakeItems(prev => [...prev, {
      manufacturer_sn: currentSN.trim(),
      type: currentType,
      type_label: typeLabel,
      warehouse_asset_id: newAssetId,
      imei: currentIMEI.trim(),
      mac: currentMAC.trim(),
      manufacturer: '',
      model: '',
      notes: ''
    }]);
    setCurrentSN('');
    setCurrentIMEI('');
    setCurrentMAC('');
    
    // Focus back to SN input for next scan
    setTimeout(() => {
      const snInput = document.querySelector('[data-testid="sn-input"]');
      if (snInput) snInput.focus();
    }, 100);
  };

  // Submit bulk intake (multiple items at once with count)
  const submitBulkIntake = async () => {
    if (bulkCount < 1) {
      toast.error('Anzahl muss mindestens 1 sein');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/intake-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: currentType,
          count: bulkCount,
          supplier: supplier,
          delivery_note: deliveryNote,
          received_by: receivedBy,
          notes: ''
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.created_count} Geräte erstellt: ${data.first_id} bis ${data.last_id}`);
        setShowBulkModal(false);
        setBulkCount(1);
        fetchNextAssetId(currentType);
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen');
      }
    } catch (e) {
      console.error('Error bulk intake:', e);
      toast.error('Fehler beim Erstellen der Geräte');
    } finally {
      setLoading(false);
    }
  };

  // Remove item from intake list
  const removeIntakeItem = (sn) => {
    setIntakeItems(prev => prev.filter(item => item.manufacturer_sn !== sn));
  };

  // Handle key press for serial number input
  // Scanner sends Enter after scan - move focus to next field instead of submitting
  const handleSNKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move focus to IMEI field instead of adding item
      const imeiInput = document.querySelector('[data-testid="imei-input"]');
      if (imeiInput) {
        imeiInput.focus();
      }
    }
  };
  
  // Handle key press for IMEI input - move to MAC field
  const handleIMEIKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const macInput = document.querySelector('[data-testid="mac-input"]');
      if (macInput) {
        macInput.focus();
      }
    }
  };
  
  // Handle key press for MAC input - add item on Enter
  const handleMACKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIntakeItem();
    }
  };

  // Submit batch intake with auto-generated IDs
  const submitIntake = async () => {
    if (intakeItems.length === 0) {
      toast.error('Keine Geräte zum Erfassen');
      return;
    }
    
    setLoading(true);
    try {
      // Use new endpoint with auto-ID generation
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of intakeItems) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/intake-with-auto-id?received_by=${encodeURIComponent(receivedBy)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              manufacturer_sn: item.manufacturer_sn,
              type: item.type,
              imei: item.imei,
              mac: item.mac,
              manufacturer: item.manufacturer,
              model: item.model,
              notes: item.notes
            })
          });
          
          const data = await res.json();
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} Geräte mit Auto-ID erfasst`);
        setIntakeItems([]);
        setReceivedBy('');
        setSupplier('');
        setDeliveryNote('');
        fetchNextAssetId(currentType);
        if (onRefreshStats) onRefreshStats();
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} Geräte konnten nicht erfasst werden`);
      }
    } catch (e) {
      console.error('Error submitting intake:', e);
      toast.error('Fehler beim Erfassen der Geräte');
    } finally {
      setLoading(false);
    }
  };

  // Open assign modal
  const openAssignModal = (asset) => {
    setAssetToAssign(asset);
    setSelectedLocation('');
    setAssignTechnician('');
    setShowAssignModal(true);
  };

  // Assign asset to location
  const assignAssetToLocation = async () => {
    if (!assetToAssign || !selectedLocation) {
      toast.error('Bitte Standort auswählen');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/assign/${encodeURIComponent(assetToAssign.manufacturer_sn)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocation,
          technician: assignTechnician
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Asset-ID generiert: ${data.asset_id}`);
        setShowAssignModal(false);
        setAssetToAssign(null);
        
        // Show label modal
        setLabelData(data.label);
        setShowLabelModal(true);
        
        // Refresh unassigned list
        fetchUnassignedAssets();
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Zuweisen');
      }
    } catch (e) {
      console.error('Error assigning asset:', e);
      toast.error('Fehler beim Zuweisen des Geräts');
    } finally {
      setLoading(false);
    }
  };

  // Bulk assign selected assets
  const bulkAssignAssets = async () => {
    if (selectedAssets.size === 0 || !selectedLocation) {
      toast.error('Bitte Geräte und Standort auswählen');
      return;
    }
    
    setLoading(true);
    try {
      const serialNumbers = Array.from(selectedAssets);
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/bulk-assign?location_id=${selectedLocation}&technician=${encodeURIComponent(assignTechnician)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serialNumbers)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.assigned_count} Geräte zugewiesen, ${data.failed_count} fehlgeschlagen`);
        setSelectedAssets(new Set());
        setShowAssignModal(false);
        fetchUnassignedAssets();
        if (onRefreshStats) onRefreshStats();
        
        // Show first label if any were assigned
        if (data.labels && data.labels.length > 0) {
          setLabelData(data.labels[0]);
          setShowLabelModal(true);
        }
      } else {
        toast.error(data.detail || 'Fehler beim Bulk-Zuweisen');
      }
    } catch (e) {
      console.error('Error bulk assigning:', e);
      toast.error('Fehler beim Bulk-Zuweisen');
    } finally {
      setLoading(false);
    }
  };

  // Toggle asset selection
  const toggleAssetSelection = (sn) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(sn)) {
      newSelected.delete(sn);
    } else {
      newSelected.add(sn);
    }
    setSelectedAssets(newSelected);
  };

  // Select all on page
  const selectAllOnPage = () => {
    if (selectedAssets.size === unassignedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(unassignedAssets.map(a => a.manufacturer_sn)));
    }
  };

  // Get type label
  const getTypeLabel = (type) => {
    for (const category of Object.values(ASSET_TYPE_CATEGORIES)) {
      const found = category.find(t => t.value === type);
      if (found) return found.label;
    }
    return type;
  };

  // Print label (opens browser print dialog)
  const printLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
            Wareneingang
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Neue Geräte erfassen und Standorten zuweisen
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`text-lg px-4 py-2 ${unassignedTotal > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}
          data-testid="unassigned-count-badge"
        >
          <Package className="h-5 w-5 mr-2" />
          {unassignedTotal} nicht zugewiesen
        </Badge>
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className={`${isDark ? 'bg-[#1a1a1a]' : ''}`}>
          <TabsTrigger value="intake" data-testid="intake-tab">
            <Scan className="h-4 w-4 mr-2" />
            Wareneingang erfassen
          </TabsTrigger>
          <TabsTrigger value="unassigned" data-testid="unassigned-tab">
            <ClipboardList className="h-4 w-4 mr-2" />
            Nicht zugewiesen
            {unassignedTotal > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {unassignedTotal}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Wareneingang Tab */}
        <TabsContent value="intake" className="space-y-6">
          <Card className={`p-6 ${cardBg}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>
              Neue Geräte erfassen
            </h3>
            
            {/* Lieferdaten */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-700">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Empfangen von
                </label>
                <Input
                  placeholder="Name des Empfängers"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className={inputBg}
                  data-testid="received-by-input"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Lieferant
                </label>
                <Select value={supplier} onValueChange={handleSupplierChange}>
                  <SelectTrigger className={inputBg} data-testid="supplier-select">
                    <SelectValue placeholder="Lieferant auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-green-500 font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Neuer Lieferant...
                      </span>
                    </SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Lieferschein-Nr.
                </label>
                <Input
                  placeholder="Optional"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className={inputBg}
                  data-testid="delivery-note-input"
                />
              </div>
            </div>
            
            {/* Seriennummer, IMEI, MAC Eingabe */}
            <div className="grid grid-cols-12 gap-4 mb-4">
              <div className="col-span-3">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Seriennummer (Barcode scannen oder eingeben)
                </label>
                <div className="relative">
                  <Barcode className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <Input
                    placeholder="Seriennummer scannen oder eingeben..."
                    value={currentSN}
                    onChange={(e) => setCurrentSN(e.target.value)}
                    onKeyDown={handleSNKeyDown}
                    className={`pl-10 ${inputBg}`}
                    data-testid="sn-input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  IMEI (optional)
                </label>
                <Input
                  placeholder="IMEI-Nummer"
                  value={currentIMEI}
                  onChange={(e) => setCurrentIMEI(e.target.value)}
                  onKeyDown={handleIMEIKeyDown}
                  className={inputBg}
                  data-testid="imei-input"
                />
              </div>
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  MAC-Adresse (optional)
                </label>
                <Input
                  placeholder="00:00:00:00:00:00"
                  value={currentMAC}
                  onChange={(e) => setCurrentMAC(e.target.value)}
                  onKeyDown={handleMACKeyDown}
                  className={inputBg}
                  data-testid="mac-input"
                />
              </div>
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Gerätetyp
                </label>
                <Select value={currentType} onValueChange={setCurrentType}>
                  <SelectTrigger className={inputBg} data-testid="device-type-select">
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_CATEGORIES).map(([category, types]) => (
                      <React.Fragment key={category}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500">{category}</div>
                        {types.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 flex items-end gap-2">
                <Button 
                  onClick={addIntakeItem}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                  data-testid="add-item-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
                <Button 
                  onClick={() => setShowBulkModal(true)}
                  variant="outline"
                  className={`${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                  data-testid="bulk-btn"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Bulk
                </Button>
              </div>
            </div>
            
            {/* Nächste Asset-ID Vorschau */}
            {nextAssetId && (
              <div className={`mb-6 p-3 rounded-lg flex items-center justify-between ${isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-3">
                  <Tag className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                      Nächste Asset-ID (Lager):
                    </p>
                    <p className={`text-lg font-mono font-bold ${isDark ? 'text-green-400' : 'text-green-800'}`} data-testid="next-asset-id">
                      {nextAssetId}
                    </p>
                  </div>
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Nach Zuweisung: <span className="font-mono">LOC-01-{nextAssetId.split('-').slice(1, -1).join('-')}</span>
                </div>
              </div>
            )}
            
            {/* Intake List */}
            {intakeItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${isDark ? 'text-white' : ''}`}>
                    Zu erfassende Geräte ({intakeItems.length})
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIntakeItems([])}
                    className="text-red-500 border-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Liste leeren
                  </Button>
                </div>
                
                <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold">#</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Lager-ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Seriennummer</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">IMEI</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">MAC</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Typ</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intakeItems.map((item, idx) => (
                        <tr 
                          key={item.manufacturer_sn}
                          className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                        >
                          <td className="px-4 py-2 text-sm">{idx + 1}</td>
                          <td className={`px-4 py-2 font-mono text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                            {item.warehouse_asset_id || '-'}
                          </td>
                          <td className={`px-4 py-2 font-mono text-sm ${isDark ? 'text-white' : ''}`}>
                            {item.manufacturer_sn}
                          </td>
                          <td className={`px-4 py-2 font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.imei || '-'}
                          </td>
                          <td className={`px-4 py-2 font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.mac || '-'}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="outline">{item.type_label}</Badge>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeIntakeItem(item.manufacturer_sn)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={submitIntake}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="submit-intake-btn"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {intakeItems.length} Geräte erfassen
                  </Button>
                </div>
              </div>
            )}
            
            {intakeItems.length === 0 && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Barcode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Scannen Sie Barcodes oder geben Sie Seriennummern ein</p>
                <p className="text-sm mt-1">Geräte erhalten automatisch eine Lager-ID (z.B. {nextAssetId})</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Nicht zugewiesene Geräte Tab */}
        <TabsContent value="unassigned" className="space-y-6">
          {/* Type Summary Cards */}
          {Object.keys(typeSummary).length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {Object.entries(typeSummary).map(([type, count]) => (
                <Card key={type} className={`px-4 py-2 flex items-center gap-2 ${cardBg}`}>
                  <Badge variant="outline">{getTypeLabel(type)}</Badge>
                  <span className={`font-bold ${isDark ? 'text-white' : ''}`}>{count}</span>
                </Card>
              ))}
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <Input
                  placeholder="Seriennummer suchen..."
                  value={searchUnassigned}
                  onChange={(e) => setSearchUnassigned(e.target.value)}
                  className={`pl-10 ${inputBg}`}
                  data-testid="search-unassigned-input"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className={`w-[180px] ${inputBg}`} data-testid="filter-type-select">
                <SelectValue placeholder="Alle Typen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {Object.entries(ASSET_TYPE_CATEGORIES).map(([category, types]) => (
                  <React.Fragment key={category}>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">{category}</div>
                    {types.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={fetchUnassignedAssets}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {selectedAssets.size > 0 && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setAssetToAssign(null);
                    setShowAssignModal(true);
                  }}
                  data-testid="bulk-assign-btn"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {selectedAssets.size} Geräte zuweisen
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                  onClick={() => {
                    setAssetToDelete(null);
                    setShowDeleteModal(true);
                  }}
                  data-testid="bulk-delete-btn"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedAssets.size} löschen
                </Button>
              </>
            )}
          </div>

          {/* Unassigned Assets Table */}
          <Card className={`${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold w-10">
                      <input
                        type="checkbox"
                        checked={selectedAssets.size === unassignedAssets.length && unassignedAssets.length > 0}
                        onChange={selectAllOnPage}
                        className="rounded"
                        data-testid="select-all-checkbox"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Seriennummer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Typ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Empfangen am</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Lieferant</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedAssets.map(asset => (
                    <tr 
                      key={asset.manufacturer_sn}
                      className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.manufacturer_sn)}
                          onChange={() => toggleAssetSelection(asset.manufacturer_sn)}
                          className="rounded"
                        />
                      </td>
                      <td className={`px-4 py-3 font-mono ${isDark ? 'text-white' : ''}`}>
                        {asset.manufacturer_sn}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{asset.type_label || getTypeLabel(asset.type)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {asset.intake_date 
                          ? new Date(asset.intake_date).toLocaleDateString('de-DE')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {asset.supplier || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openAssignModal(asset)}
                            data-testid={`assign-btn-${asset.manufacturer_sn}`}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Zuweisen
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setAssetToDelete(asset);
                              setShowDeleteModal(true);
                            }}
                            data-testid={`delete-btn-${asset.manufacturer_sn}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {unassignedAssets.length === 0 && !loading && (
              <div className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Alle Geräte sind zugewiesen
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Erfassen Sie neue Geräte im Tab "Wareneingang erfassen"
                </p>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {unassignedTotal > pageSize && (
            <TablePagination
              currentPage={pagination.page}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              theme={theme}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              {assetToAssign 
                ? `Gerät zuweisen: ${assetToAssign.manufacturer_sn}`
                : `${selectedAssets.size} Geräte zuweisen`
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {assetToAssign && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Seriennummer:</span>
                  <span className={`font-mono ${isDark ? 'text-white' : ''}`}>
                    {assetToAssign.manufacturer_sn}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Typ:</span>
                  <Badge variant="outline">
                    {assetToAssign.type_label || getTypeLabel(assetToAssign.type)}
                  </Badge>
                </div>
              </div>
            )}
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Standort auswählen *
              </label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className={inputBg} data-testid="location-select">
                  <SelectValue placeholder="Standort wählen" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.location_id} value={loc.location_id}>
                      {loc.location_id} - {loc.city || loc.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Techniker (optional)
              </label>
              <Input
                placeholder="Name des Technikers"
                value={assignTechnician}
                onChange={(e) => setAssignTechnician(e.target.value)}
                className={inputBg}
                data-testid="technician-input"
              />
            </div>
            
            {selectedLocation && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50'} border`}>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-500" />
                  <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    Asset-ID wird generiert: {selectedLocation}-XX-[TYP]
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={assetToAssign ? assignAssetToLocation : bulkAssignAssets}
              disabled={loading || !selectedLocation}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-assign-btn"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Zuweisen & Label generieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label Modal */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className={`max-w-sm ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Label generiert
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {labelData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={labelData.qr_content || labelData.asset_id}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>
              
              {/* Label Info */}
              <div className={`space-y-2 text-center ${isDark ? 'text-gray-300' : ''}`}>
                <p className="text-2xl font-bold font-mono">
                  {labelData.asset_id}
                </p>
                <p className="text-sm">
                  {labelData.type_label}
                </p>
                <p className="text-xs text-gray-500">
                  SN: {labelData.manufacturer_sn}
                </p>
                <p className="text-xs text-gray-500">
                  {labelData.location_name}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowLabelModal(false)}
                >
                  Schließen
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={printLabel}
                  data-testid="print-label-btn"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`${isDark ? 'text-white' : ''} flex items-center gap-2`}>
              <Trash2 className="h-5 w-5 text-red-500" />
              {assetToDelete ? 'Gerät löschen' : `${selectedAssets.size} Geräte löschen`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
              {assetToDelete ? (
                <>
                  Möchten Sie das Gerät mit der Seriennummer{' '}
                  <span className="font-mono font-bold">{assetToDelete.manufacturer_sn}</span>{' '}
                  wirklich löschen?
                </>
              ) : (
                <>
                  Möchten Sie wirklich <span className="font-bold">{selectedAssets.size} Geräte</span> löschen?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </>
              )}
            </p>
            
            {assetToDelete && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Typ:</span>
                  <Badge variant="outline">{getTypeLabel(assetToDelete.type)}</Badge>
                </div>
                {assetToDelete.supplier && (
                  <div className="flex justify-between mt-2">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Lieferant:</span>
                    <span className={isDark ? 'text-white' : ''}>{assetToDelete.supplier}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteModal(false);
              setAssetToDelete(null);
            }}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (assetToDelete) {
                  deleteUnassignedAsset(assetToDelete.manufacturer_sn);
                } else {
                  deleteSelectedAssets();
                }
              }}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {assetToDelete ? 'Löschen' : `${selectedAssets.size} löschen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Modal */}
      <Dialog open={showQuickSupplierModal} onOpenChange={setShowQuickSupplierModal}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              Neuen Lieferanten anlegen
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Schnell einen neuen Lieferanten anlegen. Weitere Details können später unter "Lieferanten" hinzugefügt werden.
            </p>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Name *
              </label>
              <Input
                value={quickSupplierName}
                onChange={(e) => setQuickSupplierName(e.target.value)}
                placeholder="Firmenname"
                className={inputBg}
                onKeyDown={(e) => e.key === 'Enter' && quickAddSupplier()}
                data-testid="quick-supplier-name-input"
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuickSupplierModal(false);
              setQuickSupplierName('');
            }}>
              Abbrechen
            </Button>
            <Button 
              onClick={quickAddSupplier}
              className="bg-green-600 hover:bg-green-700"
              data-testid="quick-add-supplier-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Intake Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bulk-Wareneingang
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Erstellen Sie mehrere Geräte gleichzeitig mit automatisch generierten Asset-IDs.
              Seriennummern können später nachgetragen werden.
            </p>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Gerätetyp
              </label>
              <Select value={currentType} onValueChange={(val) => {
                setCurrentType(val);
                fetchNextAssetId(val);
              }}>
                <SelectTrigger className={inputBg} data-testid="bulk-type-select">
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_TYPE_CATEGORIES).map(([category, types]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500">{category}</div>
                      {types.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Anzahl
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                className={inputBg}
                data-testid="bulk-count-input"
              />
            </div>
            
            {/* Preview */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Tag className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  Vorschau der Asset-IDs:
                </span>
              </div>
              <div className={`font-mono text-sm ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                {nextAssetId && (
                  <>
                    <p><strong>Erste ID:</strong> {nextAssetId}</p>
                    {bulkCount > 1 && (
                      <p><strong>Letzte ID:</strong> {(() => {
                        const parts = nextAssetId.split('-');
                        const baseSeq = parseInt(parts[parts.length - 1]) || 1;
                        const lastSeq = baseSeq + bulkCount - 1;
                        return parts.slice(0, -1).join('-') + '-' + String(lastSeq).padStart(4, '0');
                      })()}</p>
                    )}
                    <p className="mt-2 text-xs opacity-70">
                      Gesamt: {bulkCount} Geräte
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={submitBulkIntake}
              disabled={loading || bulkCount < 1}
              className="bg-green-600 hover:bg-green-700"
              data-testid="bulk-submit-btn"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {bulkCount} Geräte erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoodsReceiptWorkflow;
