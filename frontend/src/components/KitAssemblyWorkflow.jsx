import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Scan, Check, X, AlertTriangle, RefreshCw, Barcode, 
  CheckCircle, ArrowRight, Printer, QrCode, Plus, Trash2,
  ChevronRight, Box, Search, Tag, Edit, Copy, Settings, ShoppingCart
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const KitAssemblyWorkflow = ({ theme, onRefreshStats }) => {
  const isDark = theme === 'dark';

  // Kit Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Template Management
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    template_id: '',
    name: '',
    description: '',
    components: [],
    inventory_components: []
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Inventory Items for Template Editor
  const [inventoryItems, setInventoryItems] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  
  // Reorder Suggestions
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);

  // Assembly State
  const [assemblyMode, setAssemblyMode] = useState(false);
  const [scannedComponents, setScannedComponents] = useState([]);
  const [currentScan, setCurrentScan] = useState('');
  const [validating, setValidating] = useState(false);

  // Finalization
  const [finalizing, setFinalizing] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [kitLabelData, setKitLabelData] = useState(null);
  const [technician, setTechnician] = useState('');

  // Printer Settings
  const [printerIP, setPrinterIP] = useState(localStorage.getItem('labelPrinterIP') || '');
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerStatus, setPrinterStatus] = useState(null);
  const [testingPrinter, setTestingPrinter] = useState(false);

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch Kit Templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kit-templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        // Calculate reorder suggestions
        calculateReorderSuggestions(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
      toast.error('Fehler beim Laden der Kit-Vorlagen');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch Inventory Items for Template Editor
  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory-for-templates`);
      const data = await res.json();
      if (data.success) {
        setInventoryItems(data.items || []);
      }
    } catch (e) {
      console.error('Error fetching inventory:', e);
    }
  }, []);

  // Fetch Asset Types
  const fetchAssetTypes = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/asset-types`);
      const data = await res.json();
      if (data.success) {
        setAssetTypes(data.types || []);
      }
    } catch (e) {
      console.error('Error fetching asset types:', e);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchInventoryItems();
    fetchAssetTypes();
  }, [fetchTemplates, fetchInventoryItems, fetchAssetTypes]);

  // Calculate Reorder Suggestions
  const calculateReorderSuggestions = (templatesData) => {
    const suggestions = [];
    const targetKits = 10; // Ziel: mindestens 10 Kits bauen können
    
    templatesData.forEach(template => {
      const possibleKits = template.possible_kits?.count || 0;
      
      if (possibleKits < targetKits) {
        // Check inventory components
        template.inventory_components?.forEach(inv => {
          const currentStock = inv.quantity_in_stock || 0;
          const neededPerKit = inv.quantity || 1;
          const shortfall = (targetKits - possibleKits) * neededPerKit;
          
          if (currentStock < (targetKits * neededPerKit)) {
            const existing = suggestions.find(s => s.inventory_item_id === inv.inventory_item_id);
            if (existing) {
              existing.shortfall = Math.max(existing.shortfall, shortfall);
            } else {
              suggestions.push({
                inventory_item_id: inv.inventory_item_id,
                name: inv.name,
                current_stock: currentStock,
                min_stock: inv.min_stock_level || 5,
                shortfall: shortfall,
                used_in_templates: [template.name]
              });
            }
          }
        });
        
        // Check asset components
        template.components?.forEach(comp => {
          const available = comp.available_in_storage || 0;
          const neededPerKit = comp.quantity || 1;
          const shortfall = (targetKits - possibleKits) * neededPerKit;
          
          if (available < (targetKits * neededPerKit)) {
            const existing = suggestions.find(s => s.asset_type === comp.asset_type);
            if (existing) {
              existing.shortfall = Math.max(existing.shortfall, shortfall);
            } else {
              suggestions.push({
                asset_type: comp.asset_type,
                name: comp.label || comp.asset_type,
                current_stock: available,
                shortfall: shortfall,
                is_asset: true,
                used_in_templates: [template.name]
              });
            }
          }
        });
      }
    });
    
    // Sort by shortfall (highest first)
    suggestions.sort((a, b) => b.shortfall - a.shortfall);
    setReorderSuggestions(suggestions);
  };

  // Template CRUD Operations
  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      template_id: '',
      name: '',
      description: '',
      components: [],
      inventory_components: []
    });
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_id: template.template_id,
      name: template.name,
      description: template.description || '',
      components: template.components || [],
      inventory_components: template.inventory_components || []
    });
    setShowTemplateModal(true);
  };

  const duplicateTemplate = async (template) => {
    const newName = prompt('Name für die duplizierte Vorlage:', `${template.name} (Kopie)`);
    if (!newName) return;
    
    const newId = `KIT-${Date.now().toString(36).toUpperCase()}`;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kit-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: newId,
          name: newName,
          description: template.description || '',
          components: template.components || [],
          inventory_components: template.inventory_components || []
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Vorlage "${newName}" erstellt`);
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler beim Duplizieren');
      }
    } catch (e) {
      toast.error('Fehler beim Duplizieren');
    }
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Vorlage "${template.name}" wirklich löschen?`)) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kit-templates/${template.template_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vorlage gelöscht');
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    
    setSavingTemplate(true);
    try {
      const isNew = !editingTemplate;
      const url = isNew 
        ? `${BACKEND_URL}/api/asset-mgmt/kit-templates`
        : `${BACKEND_URL}/api/asset-mgmt/kit-templates/${editingTemplate.template_id}`;
      
      const body = isNew 
        ? {
            template_id: templateForm.template_id || `KIT-${Date.now().toString(36).toUpperCase()}`,
            name: templateForm.name,
            description: templateForm.description,
            components: templateForm.components,
            inventory_components: templateForm.inventory_components
          }
        : {
            name: templateForm.name,
            description: templateForm.description,
            components: templateForm.components,
            inventory_components: templateForm.inventory_components
          };
      
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(isNew ? 'Vorlage erstellt' : 'Vorlage aktualisiert');
        setShowTemplateModal(false);
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Add/Remove Components in Template Form
  const addAssetComponent = (assetType, label) => {
    const existing = templateForm.components.find(c => c.asset_type === assetType);
    if (existing) {
      setTemplateForm(prev => ({
        ...prev,
        components: prev.components.map(c => 
          c.asset_type === assetType ? { ...c, quantity: c.quantity + 1 } : c
        )
      }));
    } else {
      setTemplateForm(prev => ({
        ...prev,
        components: [...prev.components, { asset_type: assetType, label, quantity: 1, optional: false }]
      }));
    }
  };

  const removeAssetComponent = (assetType) => {
    setTemplateForm(prev => ({
      ...prev,
      components: prev.components.filter(c => c.asset_type !== assetType)
    }));
  };

  const addInventoryComponent = (item) => {
    const existing = templateForm.inventory_components.find(c => c.inventory_item_id === item.id);
    if (existing) {
      setTemplateForm(prev => ({
        ...prev,
        inventory_components: prev.inventory_components.map(c => 
          c.inventory_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }));
    } else {
      setTemplateForm(prev => ({
        ...prev,
        inventory_components: [...prev.inventory_components, { 
          inventory_item_id: item.id, 
          name: item.name, 
          quantity: 1, 
          optional: false 
        }]
      }));
    }
  };

  const removeInventoryComponent = (itemId) => {
    setTemplateForm(prev => ({
      ...prev,
      inventory_components: prev.inventory_components.filter(c => c.inventory_item_id !== itemId)
    }));
  };

  // Start Assembly for selected template
  const startAssembly = (template) => {
    setSelectedTemplate(template);
    setScannedComponents([]);
    setAssemblyMode(true);
    setCurrentScan('');
  };

  // Cancel Assembly
  const cancelAssembly = () => {
    if (scannedComponents.length > 0) {
      if (!window.confirm('Wollen Sie die Kit-Zusammenstellung wirklich abbrechen? Alle gescannten Komponenten werden verworfen.')) {
        return;
      }
    }
    setAssemblyMode(false);
    setSelectedTemplate(null);
    setScannedComponents([]);
    setCurrentScan('');
  };

  // Handle barcode scan
  const handleScan = async (e) => {
    if (e.key !== 'Enter' || !currentScan.trim()) return;
    
    const scannedValue = currentScan.trim();
    setCurrentScan('');
    setValidating(true);

    try {
      // First, check if this component was already scanned
      if (scannedComponents.some(c => c.manufacturer_sn === scannedValue || c.asset_id === scannedValue)) {
        toast.error('Diese Komponente wurde bereits gescannt');
        setValidating(false);
        return;
      }

      // Lookup the asset by serial number or asset_id
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/by-sn/${encodeURIComponent(scannedValue)}`);
      const data = await res.json();

      if (!data.success || !data.asset) {
        // Try looking up by asset_id
        const res2 = await fetch(`${BACKEND_URL}/api/asset-mgmt/assets?search=${encodeURIComponent(scannedValue)}&limit=1`);
        const data2 = await res2.json();
        
        if (!data2.success || !data2.assets || data2.assets.length === 0) {
          toast.error(`Gerät nicht gefunden: ${scannedValue}`);
          setValidating(false);
          return;
        }
        
        const asset = data2.assets[0];
        validateAndAddComponent(asset);
      } else {
        validateAndAddComponent(data.asset);
      }
    } catch (e) {
      console.error('Error validating scan:', e);
      toast.error('Fehler bei der Validierung');
    } finally {
      setValidating(false);
    }
  };

  // Validate component against template requirements
  const validateAndAddComponent = (asset) => {
    if (!selectedTemplate) return;

    // Check if this type is needed - template uses asset_type, asset uses type
    const neededTypes = selectedTemplate.components.map(c => c.asset_type || c.type);
    const alreadyScannedTypes = scannedComponents.map(c => c.type);
    
    // Count how many of each type we need vs have
    const typeCount = {};
    neededTypes.forEach(t => { typeCount[t] = (typeCount[t] || 0) + 1; });
    
    const scannedTypeCount = {};
    alreadyScannedTypes.forEach(t => { scannedTypeCount[t] = (scannedTypeCount[t] || 0) + 1; });

    const assetType = asset.type;
    const neededOfThisType = typeCount[assetType] || 0;
    const alreadyHaveOfThisType = scannedTypeCount[assetType] || 0;

    if (neededOfThisType === 0) {
      toast.error(`Typ "${asset.type_label || assetType}" wird für dieses Kit nicht benötigt`);
      return;
    }

    if (alreadyHaveOfThisType >= neededOfThisType) {
      toast.error(`Alle benötigten "${asset.type_label || assetType}" wurden bereits gescannt`);
      return;
    }

    // Check if asset is already assigned to another kit
    if (asset.parent_kit_id) {
      toast.error(`Gerät ist bereits einem Kit zugewiesen: ${asset.parent_kit_id}`);
      return;
    }

    // Add the component
    const componentInfo = {
      ...asset,
      scanned_at: new Date().toISOString(),
      validated: true
    };

    setScannedComponents(prev => [...prev, componentInfo]);
    toast.success(`${asset.type_label || asset.type} hinzugefügt`);
  };

  // Remove scanned component
  const removeComponent = (index) => {
    setScannedComponents(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate progress
  const getProgress = () => {
    if (!selectedTemplate) return { percentage: 0, remaining: [] };
    
    const needed = {};
    const typeLabels = {};
    selectedTemplate.components.forEach(c => {
      const type = c.asset_type || c.type;
      needed[type] = (needed[type] || 0) + (c.quantity || 1);
      typeLabels[type] = c.label || c.notes || type;
    });

    const have = {};
    scannedComponents.forEach(c => {
      have[c.type] = (have[c.type] || 0) + 1;
    });

    const totalNeeded = Object.values(needed).reduce((a, b) => a + b, 0);
    const totalHave = Object.values(have).reduce((a, b) => a + b, 0);
    
    const remaining = [];
    Object.entries(needed).forEach(([type, count]) => {
      const haveCount = have[type] || 0;
      if (haveCount < count) {
        remaining.push({ type, label: typeLabels[type], needed: count, have: haveCount });
      }
    });

    return {
      percentage: totalNeeded > 0 ? Math.round((totalHave / totalNeeded) * 100) : 0,
      remaining,
      isComplete: remaining.length === 0
    };
  };

  // Finalize Kit - Kit wird im "Lager" erstellt, kein Standort erforderlich
  const finalizeKit = async () => {
    const progress = getProgress();
    if (!progress.isComplete) {
      if (!window.confirm('Das Kit ist noch nicht vollständig. Trotzdem fortfahren?')) {
        return;
      }
    }

    setFinalizing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/quick-assemble?technician=${encodeURIComponent(technician || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.template_id,
          component_sns: scannedComponents.map(c => c.manufacturer_sn || c.asset_id)
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Kit erstellt: ${data.kit_id} - Im Lager gespeichert`);
        setKitLabelData({
          asset_id: data.kit_id,
          type_label: selectedTemplate.name,
          manufacturer_sn: data.kit_id,
          location_name: 'Lager',
          qr_content: data.kit_id,
          components: scannedComponents.length
        });
        setShowLabelModal(true);
        
        // Reset assembly
        setAssemblyMode(false);
        setSelectedTemplate(null);
        setScannedComponents([]);
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen des Kits');
      }
    } catch (e) {
      console.error('Error finalizing kit:', e);
      toast.error('Fehler beim Finalisieren des Kits');
    } finally {
      setFinalizing(false);
    }
  };

  // Test Printer Connection
  const testPrinterConnection = async () => {
    if (!printerIP) {
      toast.error('Bitte IP-Adresse eingeben');
      return;
    }
    
    setTestingPrinter(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer_ip: printerIP, printer_port: 9100 })
      });
      const data = await res.json();
      setPrinterStatus(data);
      
      if (data.success) {
        localStorage.setItem('labelPrinterIP', printerIP);
        toast.success('Drucker verbunden');
      } else {
        toast.error(data.message || 'Drucker nicht erreichbar');
      }
    } catch (e) {
      console.error('Error testing printer:', e);
      toast.error('Verbindungsfehler');
      setPrinterStatus({ success: false, status: 'error' });
    } finally {
      setTestingPrinter(false);
    }
  };

  // Print Label
  const printLabel = async () => {
    if (!printerIP) {
      setShowPrinterSettings(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_ip: printerIP,
          printer_port: 9100,
          label: kitLabelData,
          copies: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Label gedruckt');
      } else {
        toast.error(data.detail || 'Druckfehler');
      }
    } catch (e) {
      console.error('Error printing:', e);
      toast.error('Druckfehler');
    }
  };

  const progress = getProgress();

  // Template Selection View
  if (!assemblyMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
              Kit-Zusammenstellung
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Wählen Sie eine Kit-Vorlage und scannen Sie die Komponenten
            </p>
          </div>
          <div className="flex items-center gap-2">
            {reorderSuggestions.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowReorderModal(true)}
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                data-testid="reorder-suggestions-btn"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Nachbestellen ({reorderSuggestions.length})
              </Button>
            )}
            <Button 
              onClick={openNewTemplateModal}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="new-template-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Vorlage
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPrinterSettings(true)}
              className={printerStatus?.success ? 'border-green-500 text-green-500' : ''}
            >
              <Printer className="h-4 w-4 mr-2" />
              {printerIP ? `Drucker` : 'Drucker'}
            </Button>
          </div>
        </div>

        {/* Template Grid */}
        {loadingTemplates ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : templates.length === 0 ? (
          <Card className={`p-12 text-center ${cardBg}`}>
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Keine Kit-Vorlagen vorhanden
            </p>
            <Button onClick={openNewTemplateModal} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Erste Vorlage erstellen
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => {
              const possibleKits = template.possible_kits;
              const hasInventoryComponents = template.inventory_components && template.inventory_components.length > 0;
              const hasLimitingComponent = possibleKits?.limiting_component;
              
              return (
                <Card 
                  key={template.template_id} 
                  className={`p-4 transition-all hover:shadow-lg ${cardBg} hover:border-blue-500 relative group flex flex-col`}
                  data-testid={`template-card-${template.template_id}`}
                >
                  {/* Action Buttons (top right) */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); openEditTemplateModal(template); }}
                      title="Bearbeiten"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); duplicateTemplate(template); }}
                      title="Duplizieren"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); deleteTemplate(template); }}
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Clickable area for assembly - flex-1 to take available space */}
                  <div className="cursor-pointer flex flex-col flex-1" onClick={() => startAssembly(template)}>
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <Package className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : ''}`}>
                          {template.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {template.description || template.template_id}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  
                    {/* Assets mit Seriennummer */}
                    {template.components && template.components.length > 0 && (
                      <div className="mb-3">
                        <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          MIT SERIENNUMMER:
                        </p>
                        <div className="space-y-1">
                          {template.components.map((comp, i) => (
                            <div key={i} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              {comp.quantity}× {comp.label || comp.asset_type}
                            </span>
                            {comp.available_in_storage !== undefined && (
                              <Badge variant="outline" className={`text-[10px] ${
                                comp.available_in_storage === 0 ? 'text-red-500 border-red-500' :
                                comp.available_in_storage < comp.quantity ? 'text-yellow-500 border-yellow-500' :
                                'text-green-500 border-green-500'
                              }`}>
                                {comp.available_in_storage} verfügbar
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Inventory-Komponenten ohne Seriennummer */}
                  {hasInventoryComponents && (
                    <div className="mb-3">
                      <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        OHNE SERIENNUMMER (Lager):
                      </p>
                      <div className="space-y-1">
                        {template.inventory_components.map((inv, i) => (
                          <div key={i} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              {inv.quantity}× {inv.name}
                            </span>
                            <Badge variant="outline" className={`text-[10px] ${
                              inv.stock_status === 'critical' ? 'text-red-500 border-red-500' :
                              inv.stock_status === 'low' ? 'text-yellow-500 border-yellow-500' :
                              'text-green-500 border-green-500'
                            }`}>
                              {inv.quantity_in_stock || 0} Stk
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Spacer to push BAUBARE KITS to bottom */}
                  <div className="flex-1" />
                  
                  {/* Mögliche Kits Anzeige - Always at bottom with mt-auto */}
                  {possibleKits && (
                    <div className={`mt-auto pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          BAUBARE KITS:
                        </span>
                        <span className={`text-2xl font-bold px-3 py-1 rounded-md ${
                          possibleKits.count === 0 ? 'bg-red-500 text-white' :
                          possibleKits.count < 5 ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {possibleKits.count}
                        </span>
                      </div>
                      {hasLimitingComponent && possibleKits.count < 10 && (
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Limitiert durch: {possibleKits.limiting_component.name} ({possibleKits.limiting_component.available} vorhanden)
                        </p>
                      )}
                    </div>
                  )}
                  </div>{/* End clickable area */}
                </Card>
              );
            })}
          </div>
        )}

        {/* Template Editor Modal */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : ''}>
                {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Vorlagen-ID</Label>
                  <Input
                    value={templateForm.template_id}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, template_id: e.target.value.toUpperCase() }))}
                    placeholder="z.B. KIT-SP4D"
                    disabled={!!editingTemplate}
                    className={inputBg}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>Name *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Surface Pro 4 + Desko Kit"
                    className={inputBg}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Beschreibung</Label>
                <Textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung..."
                  className={inputBg}
                  rows={2}
                />
              </div>
              
              {/* Asset Components (mit Seriennummer) */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Assets mit Seriennummer</Label>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  {templateForm.components.length === 0 ? (
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Keine Assets hinzugefügt</p>
                  ) : (
                    <div className="space-y-2">
                      {templateForm.components.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className={isDark ? 'text-white' : ''}>{comp.quantity}× {comp.label || comp.asset_type}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeAssetComponent(comp.asset_type)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Asset-Typ hinzufügen:</p>
                    <div className="flex flex-wrap gap-1">
                      {assetTypes.slice(0, 10).map(type => (
                        <Button 
                          key={type.type} 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={() => addAssetComponent(type.type, type.label)}
                        >
                          + {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Inventory Components (ohne Seriennummer) */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Komponenten ohne Seriennummer (Lager)</Label>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  {templateForm.inventory_components.length === 0 ? (
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Keine Lager-Komponenten hinzugefügt</p>
                  ) : (
                    <div className="space-y-2">
                      {templateForm.inventory_components.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className={isDark ? 'text-white' : ''}>{comp.quantity}× {comp.name}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeInventoryComponent(comp.inventory_item_id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lager-Artikel hinzufügen:</p>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {inventoryItems.slice(0, 20).map(item => (
                        <Button 
                          key={item.id} 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={() => addInventoryComponent(item)}
                        >
                          + {item.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Abbrechen
              </Button>
              <Button onClick={saveTemplate} disabled={savingTemplate}>
                {savingTemplate ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingTemplate ? 'Speichern' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reorder Suggestions Modal */}
        <Dialog open={showReorderModal} onOpenChange={setShowReorderModal}>
          <DialogContent className={`max-w-2xl ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : ''}>
                <ShoppingCart className="h-5 w-5 inline-block mr-2 text-orange-500" />
                Nachbestellungsvorschläge
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Diese Komponenten sollten nachbestellt werden, um mindestens 10 Kits bauen zu können:
              </p>
              
              <div className="space-y-3">
                {reorderSuggestions.map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'} flex items-center justify-between`}>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                        {item.name}
                        {item.is_asset && <Badge className="ml-2 text-xs" variant="outline">Asset</Badge>}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Aktuell: {item.current_stock} Stück
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-500 font-semibold">
                        +{item.shortfall} nachbestellen
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        für 10 Kits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {reorderSuggestions.length === 0 && (
                <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Alle Komponenten ausreichend vorhanden!
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReorderModal(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Printer Settings Modal */}
        <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
          <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : ''}>
                Etikettendrucker einrichten
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Drucker IP-Adresse
                </label>
                <Input
                  placeholder="z.B. 192.168.1.100"
                  value={printerIP}
                  onChange={(e) => setPrinterIP(e.target.value)}
                  className={inputBg}
                  data-testid="printer-ip-input"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Brother QL-820NWB - Netzwerkdruck auf Port 9100
                </p>
              </div>

              {printerStatus && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  printerStatus.success 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {printerStatus.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className={printerStatus.success ? 'text-green-500' : 'text-red-500'}>
                    {printerStatus.message}
                  </span>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrinterSettings(false)}>
                Schließen
              </Button>
              <Button 
                onClick={testPrinterConnection}
                disabled={testingPrinter || !printerIP}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testingPrinter ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Verbindung testen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Assembly Mode View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
            Kit zusammenstellen: {selectedTemplate?.name}
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Scannen Sie die benötigten Komponenten
          </p>
        </div>
        <Button variant="outline" onClick={cancelAssembly} className="text-red-500 border-red-500">
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
      </div>

      {/* Progress */}
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : ''}>Fortschritt</span>
          <span className={`font-bold ${progress.isComplete ? 'text-green-500' : isDark ? 'text-white' : ''}`}>
            {progress.percentage}%
          </span>
        </div>
        <Progress value={progress.percentage} className="h-3" />
        
        {progress.remaining.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fehlend:</span>
            {progress.remaining.map((item, i) => (
              <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-500">
                {item.needed - item.have}x {item.label || item.type}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Scanner Input */}
      <Card className={`p-6 ${cardBg}`}>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
              Komponente scannen (Seriennummer oder Asset-ID)
            </label>
            <div className="relative">
              <Barcode className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <Input
                placeholder="Barcode scannen oder eingeben..."
                value={currentScan}
                onChange={(e) => setCurrentScan(e.target.value)}
                onKeyDown={handleScan}
                className={`pl-10 ${inputBg}`}
                data-testid="component-scan-input"
                autoFocus
                disabled={validating}
              />
              {validating && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        </div>

        {/* Scanned Components */}
        {scannedComponents.length > 0 && (
          <div className="mt-6">
            <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
              Gescannte Komponenten ({scannedComponents.length})
            </h4>
            <div className="space-y-2">
              {scannedComponents.map((comp, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <span className={`font-mono ${isDark ? 'text-white' : ''}`}>
                        {comp.asset_id || comp.manufacturer_sn}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {comp.type_label || comp.type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeComponent(idx)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Kit finalisieren - Ohne Standort-Auswahl (Lager) */}
      <Card className={`p-6 ${cardBg}`}>
        <h4 className={`font-medium mb-4 ${isDark ? 'text-white' : ''}`}>
          Kit finalisieren
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
              Techniker (optional)
            </label>
            <Input
              placeholder="Name des Technikers"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className={inputBg}
              data-testid="technician-input"
            />
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={finalizeKit}
              disabled={finalizing || scannedComponents.length === 0}
              className={`w-full ${progress.isComplete ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
              data-testid="finalize-kit-btn"
            >
              {finalizing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {progress.isComplete ? 'Kit erstellen (Lager)' : 'Unvollständiges Kit erstellen'}
            </Button>
          </div>
        </div>
        
        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <Package className="h-4 w-4 text-blue-500" />
          <span className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
            Das Kit wird im <strong>Lager</strong> erstellt. Standort-Zuweisung erfolgt im "Kits" Menüpunkt.
          </span>
        </div>
        
        {!progress.isComplete && scannedComponents.length > 0 && (
          <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              Das Kit ist noch nicht vollständig. Sie können es trotzdem erstellen.
            </span>
          </div>
        )}
      </Card>

      {/* Kit Label Modal */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className={`max-w-sm ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Kit erstellt
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {kitLabelData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={kitLabelData.qr_content || kitLabelData.asset_id}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>
              
              {/* Label Info */}
              <div className={`space-y-2 text-center ${isDark ? 'text-gray-300' : ''}`}>
                <p className="text-2xl font-bold font-mono">
                  {kitLabelData.asset_id}
                </p>
                <p className="text-sm">
                  {kitLabelData.type_label}
                </p>
                <p className="text-xs text-gray-500">
                  {kitLabelData.components} Komponenten
                </p>
                <p className="text-xs text-gray-500">
                  {kitLabelData.location_name}
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
                  data-testid="print-kit-label-btn"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KitAssemblyWorkflow;
