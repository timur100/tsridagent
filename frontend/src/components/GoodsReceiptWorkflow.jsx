import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, MapPin, Search, Plus, Check, Trash2, 
  RefreshCw, Barcode as BarcodeIcon, Printer, ArrowRight, CheckCircle,
  Tag, Scan, ClipboardList, Edit, Edit2, X, Loader2, AlertTriangle, History
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
import Barcode from 'react-barcode';
import { useAuth } from '../contexts/AuthContext';
import { printAssetLabel, LabelPrintModal } from './PrintableLabel';

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
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('intake');
  const [loading, setLoading] = useState(false);
  
  // Wareneingang (Intake) State
  const [intakeItems, setIntakeItems] = useState([]);
  const [currentSN, setCurrentSN] = useState('');
  const [currentIMEI, setCurrentIMEI] = useState('');
  const [currentMAC, setCurrentMAC] = useState('');
  const [currentType, setCurrentType] = useState('tab_tsr_i7');
  // Auto-fill receivedBy with logged-in user
  const [receivedBy, setReceivedBy] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  
  // Set receivedBy when user is available
  useEffect(() => {
    if (user && !receivedBy) {
      setReceivedBy(user.name || user.email || '');
    }
  }, [user, receivedBy]);
  
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
  
  // Asset Detail Modal State
  const [showAssetDetailModal, setShowAssetDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [assetDetailLoading, setAssetDetailLoading] = useState(false);
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [assetEditForm, setAssetEditForm] = useState({});
  const [savingAsset, setSavingAsset] = useState(false);
  
  // Label Print Modal State
  const [showLabelPrintModal, setShowLabelPrintModal] = useState(false);
  const [labelToPrint, setLabelToPrint] = useState(null);

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';
  
  // Duplicate Check State
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [fixingDuplicate, setFixingDuplicate] = useState(false);
  
  // Edit Row State (for inline editing in the table)
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [savingRow, setSavingRow] = useState(false);
  
  // ID History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Fetch ID History
  const fetchIdHistory = async (warehouseAssetId) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/id-history/${encodeURIComponent(warehouseAssetId)}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data);
        setShowHistoryModal(true);
      } else {
        toast.error('Keine Historie gefunden');
      }
    } catch (e) {
      toast.error('Fehler beim Laden der Historie');
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Check for duplicates
  const checkDuplicates = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/check-duplicate`);
      const data = await res.json();
      if (data.success && data.has_duplicates) {
        setDuplicates(data.duplicates);
        toast.error(`${data.duplicate_count} Duplikat(e) gefunden!`);
        return data.duplicates;
      } else {
        setDuplicates([]);
        return [];
      }
    } catch (e) {
      console.error('Error checking duplicates:', e);
      return [];
    }
  }, []);
  
  // Fix a duplicate
  const fixDuplicate = async (warehouseId) => {
    setFixingDuplicate(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/fix-duplicate/${encodeURIComponent(warehouseId)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchUnassignedAssets();
        checkDuplicates();
      } else {
        toast.error(data.detail || 'Fehler beim Korrigieren');
      }
    } catch (e) {
      toast.error('Fehler beim Korrigieren');
    } finally {
      setFixingDuplicate(false);
    }
  };
  
  // Save row edit (update unassigned asset)
  const saveRowEdit = async () => {
    if (!editingRowId || !editRowData) return;
    
    setSavingRow(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/unassigned/${encodeURIComponent(editingRowId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer_sn: editRowData.manufacturer_sn,
          imei: editRowData.imei,
          mac: editRowData.mac
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Gerät aktualisiert');
        setEditingRowId(null);
        setEditRowData({});
        fetchUnassignedAssets();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingRow(false);
    }
  };
  
  // Cancel row edit
  const cancelRowEdit = () => {
    setEditingRowId(null);
    setEditRowData({});
  };
  
  // Start editing a row
  const startEditRow = (asset) => {
    setEditingRowId(asset.warehouse_asset_id);
    setEditRowData({
      manufacturer_sn: asset.manufacturer_sn || '',
      imei: asset.imei || '',
      mac: asset.mac || ''
    });
  };

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

  // Fetch tenants for assignment
  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tenants`);
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
    }
  }, []);

  // Fetch cities for selected tenant
  const fetchCities = useCallback(async (tenantId) => {
    if (!tenantId) {
      setCities([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/unified-locations/cities?country=Deutschland&tenant_id=${tenantId}`);
      const data = await res.json();
      setCities(data.cities || []);
    } catch (e) {
      console.error('Error fetching cities:', e);
    }
  }, []);

  // Fetch locations for selected city and tenant
  const fetchLocationsByCity = useCallback(async (city, tenantId) => {
    if (!city || !tenantId) {
      setLocations([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/unified-locations/by-city?city=${encodeURIComponent(city)}&country=Deutschland&tenant_id=${tenantId}`);
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  }, []);

  // Open Asset Detail Modal - Search by warehouse_asset_id, manufacturer_sn, or imei
  const openAssetDetail = useCallback(async (searchValue) => {
    if (!searchValue) return;
    
    setAssetDetailLoading(true);
    setShowAssetDetailModal(true);
    
    try {
      // Search for asset by any identifier
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/assets/search-detail?q=${encodeURIComponent(searchValue)}`);
      const data = await res.json();
      
      if (data.success && data.asset) {
        setSelectedAssetDetail(data.asset);
      } else {
        toast.error(`Kein Gerät gefunden für: ${searchValue}`);
        setShowAssetDetailModal(false);
      }
    } catch (e) {
      console.error('Error fetching asset detail:', e);
      toast.error('Fehler beim Laden der Gerätdetails');
      setShowAssetDetailModal(false);
    } finally {
      setAssetDetailLoading(false);
    }
  }, []);

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

  // Start editing asset
  const startEditingAsset = useCallback(() => {
    if (!selectedAssetDetail) return;
    setAssetEditForm({
      manufacturer: selectedAssetDetail.manufacturer || '',
      model: selectedAssetDetail.model || '',
      imei: selectedAssetDetail.imei || '',
      mac: selectedAssetDetail.mac || '',
      purchase_date: selectedAssetDetail.purchase_date ? selectedAssetDetail.purchase_date.split('T')[0] : '',
      purchase_price: selectedAssetDetail.purchase_price || '',
      supplier: selectedAssetDetail.supplier || '',
      warranty_until: selectedAssetDetail.warranty_until ? selectedAssetDetail.warranty_until.split('T')[0] : '',
      warranty_type: selectedAssetDetail.warranty_type || '',
      notes: selectedAssetDetail.notes || '',
    });
    setIsEditingAsset(true);
  }, [selectedAssetDetail]);

  // Save asset changes
  const saveAssetChanges = useCallback(async () => {
    if (!selectedAssetDetail) return;
    
    const identifier = selectedAssetDetail.warehouse_asset_id || selectedAssetDetail.manufacturer_sn || selectedAssetDetail.asset_id;
    if (!identifier) {
      toast.error('Kein Identifikator gefunden');
      return;
    }
    
    setSavingAsset(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/assets/update-by-identifier?identifier=${encodeURIComponent(identifier)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetEditForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Asset aktualisiert');
        setSelectedAssetDetail(data.asset);
        setIsEditingAsset(false);
        // Refresh the unassigned list
        fetchUnassignedAssets();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      console.error('Error saving asset:', e);
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingAsset(false);
    }
  }, [selectedAssetDetail, assetEditForm, fetchUnassignedAssets]);

  // Open label print modal
  const openLabelPrint = useCallback((asset) => {
    setLabelToPrint(asset);
    setShowLabelPrintModal(true);
  }, []);

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

  // Fetch unassigned assets when tab changes to 'unassigned' or on filter changes
  useEffect(() => {
    if (activeSubTab === 'unassigned') {
      fetchUnassignedAssets();
    }
  }, [activeSubTab, fetchUnassignedAssets]);

  // Fetch initial data (locations, suppliers, tenants, and initial unassigned count)
  useEffect(() => {
    fetchLocations();
    fetchSuppliers();
    fetchTenants();
    // Always fetch unassigned count for the badge, regardless of active tab
    fetchUnassignedAssets();
  }, [fetchLocations, fetchSuppliers, fetchTenants, fetchUnassignedAssets]);

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
        if (data.freed_id) {
          toast.success(`ID ${data.freed_id} ist jetzt wieder verfügbar`, { duration: 3000 });
        }
        setShowDeleteModal(false);
        setAssetToDelete(null);
        fetchUnassignedAssets();
        fetchNextAssetId(currentType); // WICHTIG: Nächste ID aktualisieren nach Löschung
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
        fetchNextAssetId(currentType); // WICHTIG: Nächste ID aktualisieren nach Löschung
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
    
    // Check for duplicate in local list
    if (intakeItems.some(item => item.manufacturer_sn === currentSN.trim())) {
      toast.error('Seriennummer bereits in der Liste');
      return;
    }
    
    // IMPORTANT: Check if SN/IMEI/MAC already exists in database
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('manufacturer_sn', currentSN.trim());
      if (currentIMEI.trim()) params.append('imei', currentIMEI.trim());
      if (currentMAC.trim()) params.append('mac', currentMAC.trim());
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/validate-unique?${params.toString()}`);
      const validation = await res.json();
      
      if (!validation.is_unique) {
        // Show all conflicts
        validation.conflicts.forEach(conflict => {
          toast.error(conflict.message, { duration: 5000 });
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Error validating:', e);
      // Continue anyway if validation fails - backend will catch duplicates
    }
    setLoading(false);
    
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
        // Refresh the unassigned assets list so new assets appear immediately
        fetchUnassignedAssets();
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
    
    if (!receivedBy.trim()) {
      toast.error('Bitte "Empfangen von" ausfüllen');
      return;
    }
    
    setLoading(true);
    try {
      // Use new endpoint with auto-ID generation
      let successCount = 0;
      let errorCount = 0;
      let errorMessages = [];
      
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
            // Capture the specific error message (e.g., duplicate SN/IMEI)
            const errorMsg = data.detail || 'Unbekannter Fehler';
            errorMessages.push(`${item.manufacturer_sn}: ${errorMsg}`);
            // Show immediate toast for duplicate errors
            if (errorMsg.includes('existiert bereits')) {
              toast.error(errorMsg, { duration: 5000 });
            }
          }
        } catch (e) {
          errorCount++;
          errorMessages.push(`${item.manufacturer_sn}: Netzwerkfehler`);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} Geräte mit Auto-ID erfasst`);
        setIntakeItems([]);
        // Don't clear receivedBy - it's auto-filled with logged-in user
        setSupplier('');
        setDeliveryNote('');
        fetchNextAssetId(currentType);
        // Refresh the unassigned assets list so new assets appear immediately
        fetchUnassignedAssets();
        if (onRefreshStats) onRefreshStats();
      }
      if (errorCount > 0) {
        // Show detailed error message
        const errorDetail = errorMessages.length > 0 
          ? errorMessages.join('\n') 
          : `${errorCount} Geräte konnten nicht erfasst werden`;
        toast.error(errorDetail, { duration: 6000 });
        console.error('Intake errors:', errorMessages);
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
    setSelectedTenant('');
    setSelectedCity('');
    setSelectedLocation('');
    setAssignTechnician('');
    setCities([]);
    setLocations([]);
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
                  <BarcodeIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
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
                <BarcodeIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
                  placeholder="Lager-ID / Seriennummer / IMEI scannen..."
                  value={searchUnassigned}
                  onChange={(e) => setSearchUnassigned(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchUnassigned.trim()) {
                      // If it looks like a specific ID (starts with TSRID- or has certain patterns), open detail directly
                      const val = searchUnassigned.trim();
                      if (val.startsWith('TSRID-') || val.length >= 8) {
                        openAssetDetail(val);
                        setSearchUnassigned('');
                        e.preventDefault();
                      }
                    }
                  }}
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
            
            <Button 
              variant="outline" 
              onClick={checkDuplicates}
              title="Auf Duplikate prüfen"
              className={duplicates.length > 0 ? 'border-red-500 text-red-500' : ''}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              {duplicates.length > 0 ? `${duplicates.length} Duplikat(e)` : 'Duplikat-Check'}
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
          
          {/* Duplicate Warning */}
          {duplicates.length > 0 && (
            <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-red-500/20 border border-red-500/50' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  {duplicates.length} doppelte Lager-ID(s) gefunden!
                </span>
              </div>
              <div className="space-y-2">
                {duplicates.map(dup => (
                  <div key={dup._id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                    <div>
                      <code className="text-sm font-mono">{dup._id}</code>
                      <span className={`ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({dup.count}x vorhanden)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => fixDuplicate(dup._id)}
                      disabled={fixingDuplicate}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {fixingDuplicate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Korrigieren'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <th className="px-4 py-3 text-left text-xs font-semibold">Lager-ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Seriennummer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">IMEI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">MAC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Typ</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedAssets.map(asset => {
                    const isEditing = editingRowId === asset.warehouse_asset_id;
                    
                    return (
                    <tr 
                      key={asset.manufacturer_sn}
                      className={`border-t ${isEditing ? 'bg-blue-500/10' : ''} ${!isEditing ? 'cursor-pointer' : ''} ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => !isEditing && openAssetDetail(asset.warehouse_asset_id || asset.manufacturer_sn)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.manufacturer_sn)}
                          onChange={() => toggleAssetSelection(asset.manufacturer_sn)}
                          className="rounded"
                          disabled={isEditing}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {asset.warehouse_asset_id ? (
                          <div className="flex items-center gap-2">
                            <code className={`px-2 py-1 rounded text-sm font-mono ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                              {asset.warehouse_asset_id}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchIdHistory(asset.warehouse_asset_id);
                              }}
                              title="ID-Historie anzeigen"
                              className={`p-1 rounded hover:bg-gray-600/30 transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-mono text-sm ${isDark ? 'text-white' : ''}`} onClick={(e) => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editRowData.manufacturer_sn || ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, manufacturer_sn: e.target.value }))}
                            className={`h-8 text-xs font-mono ${inputBg}`}
                            placeholder="Seriennummer"
                          />
                        ) : (
                          asset.manufacturer_sn
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : ''}`} onClick={(e) => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editRowData.imei || ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, imei: e.target.value }))}
                            className={`h-8 text-xs ${inputBg}`}
                            placeholder="IMEI"
                          />
                        ) : (
                          asset.imei || '-'
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : ''}`} onClick={(e) => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editRowData.mac || ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, mac: e.target.value }))}
                            className={`h-8 text-xs ${inputBg}`}
                            placeholder="MAC-Adresse"
                          />
                        ) : (
                          asset.mac || '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{asset.type_label || getTypeLabel(asset.type)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2 text-gray-500"
                                onClick={cancelRowEdit}
                                disabled={savingRow}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 px-2"
                                onClick={saveRowEdit}
                                disabled={savingRow}
                              >
                                {savingRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2"
                                onClick={() => startEditRow(asset)}
                                title="Bearbeiten"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2"
                                onClick={() => openLabelPrint(asset)}
                                title="Label drucken"
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
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
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setShowDeleteModal(true);
                                }}
                                data-testid={`delete-btn-${asset.manufacturer_sn}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
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
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              {assetToAssign 
                ? `Gerät zuweisen`
                : `${selectedAssets.size} Geräte zuweisen`
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {assetToAssign && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Lager-ID:</span>
                  <code className={`font-mono ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {assetToAssign.warehouse_asset_id || '-'}
                  </code>
                </div>
                <div className="flex justify-between mt-2">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Seriennummer:</span>
                  <span className={`font-mono text-sm ${isDark ? 'text-white' : ''}`}>
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
            
            {/* Tenant Selection */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Kunde (Tenant) *
              </label>
              <Select 
                value={selectedTenant} 
                onValueChange={(v) => {
                  setSelectedTenant(v);
                  setSelectedCity('');
                  setSelectedLocation('');
                  setLocations([]);
                  fetchCities(v);
                }}
              >
                <SelectTrigger className={inputBg} data-testid="tenant-select">
                  <SelectValue placeholder="Kunden auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.tenant_id} value={t.tenant_id}>
                      {t.display_name || t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* City Selection */}
            {selectedTenant && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Stadt *
                </label>
                <Select 
                  value={selectedCity} 
                  onValueChange={(v) => {
                    setSelectedCity(v);
                    setSelectedLocation('');
                    fetchLocationsByCity(v, selectedTenant);
                  }}
                >
                  <SelectTrigger className={inputBg} data-testid="city-select">
                    <SelectValue placeholder="Stadt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Location Selection with Street */}
            {selectedCity && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Standort auswählen *
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className={inputBg} data-testid="location-select">
                    <SelectValue placeholder="Standort wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => {
                      const locCode = loc.station_code || loc.location_code || loc.location_id || '';
                      const locValue = locCode || loc.street;
                      return (
                        <SelectItem key={locValue} value={locValue}>
                          <div className="flex flex-col">
                            <span className="font-medium font-mono">{locCode || 'N/A'}</span>
                            <span className="text-xs text-gray-500">
                              {loc.street} {loc.house_number || ''}, {loc.zip || loc.postal_code || ''} {loc.city}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
                  onClick={() => printAssetLabel(labelData)}
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

      {/* Asset Detail Modal */}
      <Dialog open={showAssetDetailModal} onOpenChange={(open) => {
        if (!open) {
          setIsEditingAsset(false);
        }
        setShowAssetDetailModal(open);
      }}>
        <DialogContent className={`max-w-2xl max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center justify-between ${isDark ? 'text-white' : ''}`}>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                {isEditingAsset ? 'Gerät bearbeiten' : 'Gerätdetails'}
              </div>
              {!isEditingAsset && selectedAssetDetail && !assetDetailLoading && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openLabelPrint(selectedAssetDetail)}>
                    <Printer className="h-4 w-4 mr-1" />
                    Label
                  </Button>
                  <Button size="sm" variant="outline" onClick={startEditingAsset}>
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {assetDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : selectedAssetDetail ? (
            <div className="space-y-4">
              {/* Identifikation - immer nur Anzeige */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-semibold text-gray-500 mb-3">Identifikation</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAssetDetail.warehouse_asset_id && (
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lager-ID</p>
                      <code className={`px-2 py-1 rounded text-sm font-mono ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        {selectedAssetDetail.warehouse_asset_id}
                      </code>
                    </div>
                  )}
                  {selectedAssetDetail.asset_id && (
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Asset-ID</p>
                      <code className={`px-2 py-1 rounded text-sm font-mono ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {selectedAssetDetail.asset_id}
                      </code>
                    </div>
                  )}
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Seriennummer</p>
                    <p className={`font-mono text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.manufacturer_sn || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                    <Badge variant={selectedAssetDetail.status === 'deployed' ? 'default' : 'outline'} 
                           className={selectedAssetDetail.status === 'deployed' ? 'bg-green-500' : ''}>
                      {selectedAssetDetail.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Produkt & Technische Daten - Editierbar */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-semibold text-gray-500 mb-3">Produkt & Technische Daten</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Typ</p>
                    <Badge variant="outline">{selectedAssetDetail.type_label || selectedAssetDetail.type}</Badge>
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hersteller</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.manufacturer}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, manufacturer: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="z.B. Samsung, Microsoft"
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.manufacturer || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Modell</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.model}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, model: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="z.B. Galaxy Tab S9"
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.model || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IMEI</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.imei}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, imei: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="15-stellige IMEI"
                      />
                    ) : (
                      <p className={`font-mono text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.imei || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>MAC-Adresse</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.mac}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, mac: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="00:00:00:00:00:00"
                      />
                    ) : (
                      <p className={`font-mono text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.mac || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Kaufdaten & Garantie - Editierbar */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-semibold text-gray-500 mb-3">Kaufdaten & Garantie</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kaufdatum</p>
                    {isEditingAsset ? (
                      <Input
                        type="date"
                        value={assetEditForm.purchase_date}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, purchase_date: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>
                        {selectedAssetDetail.purchase_date 
                          ? new Date(selectedAssetDetail.purchase_date).toLocaleDateString('de-DE')
                          : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kaufpreis (€)</p>
                    {isEditingAsset ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={assetEditForm.purchase_price}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, purchase_price: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="0.00"
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>
                        {selectedAssetDetail.purchase_price ? `${selectedAssetDetail.purchase_price.toFixed(2)} €` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lieferant</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.supplier}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, supplier: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="Lieferantenname"
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.supplier || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Garantie bis</p>
                    {isEditingAsset ? (
                      <Input
                        type="date"
                        value={assetEditForm.warranty_until}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, warranty_until: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>
                        {selectedAssetDetail.warranty_until 
                          ? new Date(selectedAssetDetail.warranty_until).toLocaleDateString('de-DE')
                          : '-'}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Garantie-Art</p>
                    {isEditingAsset ? (
                      <Input
                        value={assetEditForm.warranty_type}
                        onChange={(e) => setAssetEditForm(prev => ({...prev, warranty_type: e.target.value}))}
                        className={`h-8 ${inputBg}`}
                        placeholder="z.B. Herstellergarantie, Erweiterte Garantie"
                      />
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.warranty_type || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Wareneingang Info - nur Anzeige */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-semibold text-gray-500 mb-3">Wareneingang</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Empfangen am</p>
                    <p className={`text-sm ${isDark ? 'text-white' : ''}`}>
                      {selectedAssetDetail.intake_date 
                        ? new Date(selectedAssetDetail.intake_date).toLocaleDateString('de-DE')
                        : selectedAssetDetail.created_at 
                          ? new Date(selectedAssetDetail.created_at).toLocaleDateString('de-DE')
                          : '-'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Empfangen von</p>
                    <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.received_by || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lieferschein-Nr.</p>
                    <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.delivery_note || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Notes - Editierbar */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Notizen</h4>
                {isEditingAsset ? (
                  <textarea
                    value={assetEditForm.notes}
                    onChange={(e) => setAssetEditForm(prev => ({...prev, notes: e.target.value}))}
                    className={`w-full p-2 rounded border text-sm ${isDark ? 'bg-[#2d2d2d] border-gray-600 text-white' : 'border-gray-300'}`}
                    rows={3}
                    placeholder="Notizen zum Gerät..."
                  />
                ) : (
                  <p className={`text-sm ${isDark ? 'text-white' : ''}`}>{selectedAssetDetail.notes || '-'}</p>
                )}
              </div>
              
              {/* Location / Bundle Info - nur im Ansichtsmodus */}
              {!isEditingAsset && (selectedAssetDetail.location || selectedAssetDetail.bundle) && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <h4 className="text-xs font-semibold text-gray-500 mb-3">Zuordnung</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAssetDetail.location && (
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Standort</p>
                        <p className={`text-sm ${isDark ? 'text-white' : ''}`}>
                          {selectedAssetDetail.location.location_id} - {selectedAssetDetail.location.city}
                        </p>
                        <p className="text-xs text-gray-400">{selectedAssetDetail.location.address}</p>
                      </div>
                    )}
                    {selectedAssetDetail.bundle && (
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kit</p>
                        <p className={`text-sm text-purple-500`}>
                          {selectedAssetDetail.bundle.bundle_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* History Timeline - nur im Ansichtsmodus */}
              {!isEditingAsset && selectedAssetDetail.history && selectedAssetDetail.history.length > 0 && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <h4 className="text-xs font-semibold text-gray-500 mb-3">Historie ({selectedAssetDetail.history.length})</h4>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {selectedAssetDetail.history.slice().reverse().map((entry, idx) => (
                      <div key={idx} className={`flex gap-3 pb-3 ${idx < selectedAssetDetail.history.length - 1 ? 'border-b border-gray-700' : ''}`}>
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                          entry.event_type === 'intake' ? 'bg-green-500' :
                          entry.event_type === 'assignment' ? 'bg-blue-500' :
                          entry.event_type === 'kit_assignment' ? 'bg-purple-500' :
                          entry.event_type === 'update' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDark ? 'text-white' : ''}`}>{entry.event}</p>
                          {entry.notes && <p className="text-xs text-gray-400 mt-1">{entry.notes}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{new Date(entry.date).toLocaleString('de-DE')}</span>
                            {entry.technician && <span>• {entry.technician}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          
          <DialogFooter className="gap-2">
            {isEditingAsset ? (
              <>
                <Button variant="outline" onClick={() => setIsEditingAsset(false)} disabled={savingAsset}>
                  Abbrechen
                </Button>
                <Button onClick={saveAssetChanges} disabled={savingAsset} className="bg-green-600 hover:bg-green-700">
                  {savingAsset ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Speichern
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowAssetDetailModal(false)}>
                Schließen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label Print Modal - Verwendet wiederverwendbare Komponente */}
      <LabelPrintModal
        open={showLabelPrintModal}
        onOpenChange={setShowLabelPrintModal}
        asset={labelToPrint}
        isDark={isDark}
      />

      {/* ID History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#2d2d2d] text-white border-gray-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              ID-Historie: {historyData?.warehouse_asset_id}
            </DialogTitle>
          </DialogHeader>
          
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : historyData?.history ? (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <p className="text-xs text-blue-500 mb-1">Diese ID wurde</p>
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>
                  {historyData.event_count}x verwendet
                </p>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {historyData.history.events?.slice().reverse().map((event, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border ${
                      event.action === 'created' 
                        ? isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'
                        : event.action === 'deleted'
                        ? isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'
                        : isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={
                        event.action === 'created' ? 'default' : 
                        event.action === 'deleted' ? 'destructive' : 
                        'secondary'
                      } className={
                        event.action === 'created' ? 'bg-green-600' :
                        event.action === 'deleted' ? 'bg-red-600' :
                        'bg-blue-600'
                      }>
                        {event.action === 'created' ? 'Erstellt' : 
                         event.action === 'deleted' ? 'Gelöscht' : 
                         event.action === 'reassigned' ? 'Neu zugewiesen' :
                         event.action}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString('de-DE')}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {event.asset_sn && (
                        <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          <span className="text-gray-500">Seriennummer:</span>{' '}
                          <code className="font-mono">{event.asset_sn}</code>
                        </p>
                      )}
                      {event.previous_asset_sn && (
                        <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          <span className="text-gray-500">Vorherige SN:</span>{' '}
                          <code className="font-mono line-through text-red-400">{event.previous_asset_sn}</code>
                        </p>
                      )}
                      {event.user && (
                        <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          <span className="text-gray-500">Benutzer:</span> {event.user}
                        </p>
                      )}
                      {event.reason && (
                        <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          <span className="text-gray-500">Grund:</span> {event.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
                {historyData.note}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Keine Historie für diese ID vorhanden</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoodsReceiptWorkflow;
