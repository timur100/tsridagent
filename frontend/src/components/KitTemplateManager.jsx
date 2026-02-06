import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Boxes, Plus, Search, RefreshCw, Edit2, Trash2, Check, Package, 
  Monitor, Printer, Box, Tablet, HardDrive, AlertCircle, Cable,
  ChevronDown, ChevronRight, Warehouse, Layers
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

// Gerätetypen (mit Seriennummer)
const DEVICE_TYPE_LABELS = {
  scanner_regula: 'Scanner (Regula)',
  scanner_desko: 'Scanner (Desko)',
  tablet: 'Tablet/PC',
  printer: 'Drucker',
  docking_type1: 'Docking Station Typ 1',
  docking_type2: 'Docking Station Typ 2',
  docking_type3: 'Docking Station Typ 3',
  docking_type4: 'Docking Station Typ 4',
  switch: 'Netzwerk-Switch',
  router: 'Router',
  access_point: 'Access Point',
  other: 'Sonstiges'
};

const DEVICE_TYPE_ICONS = {
  scanner_regula: Monitor,
  scanner_desko: Monitor,
  tablet: Tablet,
  printer: Printer,
  docking_type1: HardDrive,
  docking_type2: HardDrive,
  docking_type3: HardDrive,
  docking_type4: HardDrive,
  switch: Box,
  router: Box,
  access_point: Box,
  other: Box
};

/**
 * KitTemplateManager - Verwaltet Kit-Vorlagen
 * Unterstützt zwei Arten von Komponenten:
 * 1. Geräte (mit Seriennummer) aus dem Geräte-Lager
 * 2. Inventar-Artikel (ohne Seriennummer) aus dem Inventar
 */
const KitTemplateManager = ({ theme, tenants = [] }) => {
  const isDark = theme === 'dark';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [storageStats, setStorageStats] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tenant_id: '',
    components: []
  });
  
  // Which tab is active in add component
  const [addComponentTab, setAddComponentTab] = useState('device');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/kit-templates/list`;
      if (selectedTenant && selectedTenant !== 'all') {
        url += `?tenant_id=${selectedTenant}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  // Fetch storage stats for device availability
  const fetchStorageStats = useCallback(async () => {
    try {
      let url = `${BACKEND_URL}/api/device-lifecycle/storage/overview`;
      if (selectedTenant && selectedTenant !== 'all') {
        url += `?tenant_id=${selectedTenant}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStorageStats(data.storage);
      }
    } catch (e) {
      console.error('Error fetching storage stats:', e);
    }
  }, [selectedTenant]);

  // Fetch inventory items
  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory/items?limit=500`);
      const data = await res.json();
      if (data.success) {
        setInventoryItems(data.items || []);
      }
    } catch (e) {
      console.error('Error fetching inventory items:', e);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchStorageStats();
    fetchInventoryItems();
  }, [fetchTemplates, fetchStorageStats, fetchInventoryItems]);

  // Calculate how many kits can be created with current stock
  const calculatePossibleKits = (template) => {
    if (!template.components) return 0;
    
    const byType = storageStats?.by_type || {};
    let minKits = Infinity;
    
    for (const component of template.components) {
      const source = component.source || 'device';
      const required = component.quantity || 1;
      let available = 0;
      
      if (source === 'device') {
        available = byType[component.device_type]?.available_for_kits || 0;
      } else {
        // Inventory item
        const item = inventoryItems.find(i => i.id === component.inventory_item_id);
        available = item?.quantity_in_stock || 0;
      }
      
      const possibleFromType = Math.floor(available / required);
      minKits = Math.min(minKits, possibleFromType);
    }
    
    return minKits === Infinity ? 0 : minKits;
  };

  // Get stock for a component
  const getStockForComponent = (component) => {
    const source = component.source || 'device';
    
    if (source === 'device') {
      const typeData = storageStats?.by_type?.[component.device_type];
      return {
        total: typeData?.total || 0,
        available: typeData?.available_for_kits || 0
      };
    } else {
      const item = inventoryItems.find(i => i.id === component.inventory_item_id);
      return {
        total: item?.quantity_in_stock || 0,
        available: item?.quantity_in_stock || 0
      };
    }
  };

  // Get component display name
  const getComponentName = (component) => {
    const source = component.source || 'device';
    if (source === 'device') {
      return DEVICE_TYPE_LABELS[component.device_type] || component.device_type;
    } else {
      return component.inventory_item_name || 'Inventar-Artikel';
    }
  };

  // Get component icon
  const getComponentIcon = (component) => {
    const source = component.source || 'device';
    if (source === 'device') {
      const Icon = DEVICE_TYPE_ICONS[component.device_type] || Box;
      return <Icon className="h-4 w-4" />;
    } else {
      return <Package className="h-4 w-4" />;
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditMode(false);
    setFormData({
      name: '',
      description: '',
      tenant_id: selectedTenant !== 'all' ? selectedTenant : (tenants[0]?.tenant_id || ''),
      components: []
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (template) => {
    setEditMode(true);
    setFormData({
      id: template.id,
      name: template.name,
      description: template.description || '',
      tenant_id: template.tenant_id,
      components: template.components || []
    });
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  // Add device component
  const addDeviceComponent = (deviceType) => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { 
        source: 'device', 
        device_type: deviceType, 
        quantity: 1 
      }]
    }));
  };

  // Add inventory component
  const addInventoryComponent = (item) => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { 
        source: 'inventory', 
        inventory_item_id: item.id,
        inventory_item_name: item.name,
        quantity: 1 
      }]
    }));
  };

  // Update component quantity
  const updateComponentQuantity = (index, quantity) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((c, i) => 
        i === index ? { ...c, quantity: parseInt(quantity) || 1 } : c
      )
    }));
  };

  // Remove component
  const removeComponent = (index) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!formData.name) {
      toast.error('Name erforderlich');
      return;
    }
    if (!formData.tenant_id) {
      toast.error('Tenant erforderlich');
      return;
    }
    if (formData.components.length === 0) {
      toast.error('Mindestens eine Komponente erforderlich');
      return;
    }

    try {
      const url = editMode 
        ? `${BACKEND_URL}/api/kit-templates/${formData.id}`
        : `${BACKEND_URL}/api/kit-templates/create`;
      
      const res = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editMode ? 'Vorlage aktualisiert' : 'Vorlage erstellt');
        setShowCreateModal(false);
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (e) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`Vorlage "${template.name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/kit-templates/${template.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vorlage gelöscht');
        setShowDetailModal(false);
        fetchTemplates();
      } else {
        toast.error(data.detail || 'Fehler');
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !searchTerm || 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTenant = selectedTenant === 'all' || t.tenant_id === selectedTenant;
      return matchesSearch && matchesTenant;
    });
  }, [templates, searchTerm, selectedTenant]);

  // Paginated templates
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTemplates.length / pageSize);

  // Get tenant name
  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.tenant_id === tenantId);
    return tenant?.display_name || tenant?.name || tenantId;
  };

  // Count device and inventory components
  const countComponentTypes = (components) => {
    const devices = components?.filter(c => (c.source || 'device') === 'device').length || 0;
    const inventory = components?.filter(c => c.source === 'inventory').length || 0;
    return { devices, inventory };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>Kit-Vorlagen</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Definieren Sie, aus welchen Geräten und Artikeln ein Kit besteht
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchTemplates(); fetchStorageStats(); fetchInventoryItems(); }} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={openCreateModal} className="bg-[#c00000] hover:bg-[#a00000] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Geräte im Lager</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                {storageStats?.total_in_storage || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <Package className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Inventar-Artikel</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                {inventoryItems.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <Boxes className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Kit-Vorlagen</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                {templates.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              placeholder="Vorlage suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${inputBg}`}
            />
          </div>
        </div>
        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
          <SelectTrigger className={`w-[200px] ${inputBg}`}>
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
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className={`p-12 text-center ${cardBg}`}>
          <Boxes className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {searchTerm ? 'Keine Vorlagen gefunden' : 'Noch keine Kit-Vorlagen erstellt'}
          </p>
          <Button onClick={openCreateModal} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Erste Vorlage erstellen
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTemplates.map(template => {
              const possibleKits = calculatePossibleKits(template);
              const { devices, inventory } = countComponentTypes(template.components);
              return (
                <Card 
                  key={template.id}
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all ${cardBg} hover:border-primary/50`}
                  onClick={() => { setSelectedTemplate(template); setShowDetailModal(true); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : ''}`}>
                        {template.name}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getTenantName(template.tenant_id)}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={possibleKits > 0 
                        ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                        : 'bg-red-500/20 text-red-500 border-red-500/30'
                      }
                    >
                      {possibleKits} möglich
                    </Badge>
                  </div>

                  {template.description && (
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {template.description}
                    </p>
                  )}

                  {/* Component Type Badges */}
                  <div className="flex gap-2 mb-3">
                    {devices > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Monitor className="h-3 w-3 mr-1" />
                        {devices} Geräte
                      </Badge>
                    )}
                    {inventory > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {inventory} Artikel
                      </Badge>
                    )}
                  </div>

                  {/* Components Summary */}
                  <div className="space-y-1">
                    {template.components?.slice(0, 4).map((comp, i) => {
                      const stock = getStockForComponent(comp);
                      const hasEnough = stock.available >= comp.quantity;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {getComponentIcon(comp)}
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                              {comp.quantity}x {getComponentName(comp)}
                            </span>
                          </div>
                          <span className={hasEnough ? 'text-green-500' : 'text-red-500'}>
                            ({stock.available} verf.)
                          </span>
                        </div>
                      );
                    })}
                    {template.components?.length > 4 && (
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        +{template.components.length - 4} weitere...
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredTemplates.length > pageSize && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTemplates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              theme={theme}
            />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={`max-w-3xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              {editMode ? 'Vorlage bearbeiten' : 'Neue Kit-Vorlage'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto py-4">
            {/* Name & Tenant */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Standard-Scanner-Kit"
                  className={inputBg}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenant (Kunde) *</label>
                <Select 
                  value={formData.tenant_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tenant_id: v }))}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Tenant wählen..." />
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
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung..."
                className={inputBg}
              />
            </div>

            {/* Components List */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Komponenten ({formData.components.length})</label>
              
              {formData.components.length > 0 && (
                <div className="space-y-2">
                  {formData.components.map((comp, index) => {
                    const stock = getStockForComponent(comp);
                    const hasEnough = stock.available >= comp.quantity;
                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border flex items-center gap-3 ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {getComponentIcon(comp)}
                          <span className={isDark ? 'text-white' : ''}>
                            {getComponentName(comp)}
                          </span>
                          {comp.source === 'inventory' && (
                            <Badge variant="outline" className="text-xs ml-2">Artikel</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={comp.quantity}
                            onChange={(e) => updateComponentQuantity(index, e.target.value)}
                            className={`w-20 text-center ${inputBg}`}
                          />
                          <span className={`text-xs w-16 ${hasEnough ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.available} verf.
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeComponent(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Component Tabs */}
              <Card className={`p-4 ${cardBg}`}>
                <Tabs value={addComponentTab} onValueChange={setAddComponentTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="device" className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Geräte (mit SN)
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Inventar-Artikel
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="device">
                    <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Geräte werden mit Seriennummer verfolgt
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(DEVICE_TYPE_LABELS).map(([key, label]) => {
                        const typeData = storageStats?.by_type?.[key];
                        const available = typeData?.available_for_kits || 0;
                        return (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            onClick={() => addDeviceComponent(key)}
                            className="justify-start text-left h-auto py-2"
                          >
                            <div className="flex items-center gap-2 w-full">
                              {React.createElement(DEVICE_TYPE_ICONS[key] || Box, { className: "h-4 w-4 flex-shrink-0" })}
                              <span className="flex-1 truncate text-xs">{label}</span>
                              <Badge variant="outline" className={`text-xs ${available > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                {available}
                              </Badge>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="inventory">
                    <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Artikel ohne Seriennummer (Kabel, Adapter, Zubehör)
                    </p>
                    {inventoryItems.length === 0 ? (
                      <div className={`p-4 text-center rounded-lg border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Keine Inventar-Artikel vorhanden
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Erstellen Sie Artikel im Tab "Inventar"
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                        {inventoryItems.map(item => (
                          <Button
                            key={item.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addInventoryComponent(item)}
                            className="justify-start text-left h-auto py-2"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Package className="h-4 w-4 flex-shrink-0" />
                              <span className="flex-1 truncate text-xs">{item.name}</span>
                              <Badge variant="outline" className={`text-xs ${item.quantity_in_stock > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                {item.quantity_in_stock}
                              </Badge>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            {/* Possible Kits Preview */}
            {formData.components.length > 0 && (
              <Card className={`p-4 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Mögliche Kits: {calculatePossibleKits({ components: formData.components })}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Basierend auf aktuellen Lagerbeständen
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveTemplate} className="bg-[#c00000] hover:bg-[#a00000] text-white">
              {editMode ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-primary" />
                    {selectedTemplate.name}
                  </span>
                  <Badge 
                    variant="outline"
                    className={calculatePossibleKits(selectedTemplate) > 0 
                      ? 'bg-green-500/20 text-green-500 border-green-500/30'
                      : 'bg-red-500/20 text-red-500 border-red-500/30'
                    }
                  >
                    {calculatePossibleKits(selectedTemplate)} Kits möglich
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tenant</p>
                    <p className="font-medium">{getTenantName(selectedTemplate.tenant_id)}</p>
                  </div>
                  {selectedTemplate.description && (
                    <div className="col-span-2">
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Beschreibung</p>
                      <p>{selectedTemplate.description}</p>
                    </div>
                  )}
                </div>

                {/* Components */}
                <div>
                  <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : ''}`}>
                    Komponenten ({selectedTemplate.components?.length || 0})
                  </p>
                  <div className="space-y-2">
                    {selectedTemplate.components?.map((comp, i) => {
                      const stock = getStockForComponent(comp);
                      const hasEnough = stock.available >= comp.quantity;
                      return (
                        <div 
                          key={i}
                          className={`p-3 rounded-lg flex items-center justify-between ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            {getComponentIcon(comp)}
                            <span className={isDark ? 'text-white' : ''}>
                              {comp.quantity}x {getComponentName(comp)}
                            </span>
                            {comp.source === 'inventory' && (
                              <Badge variant="outline" className="text-xs">Artikel</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasEnough ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={hasEnough ? 'text-green-500' : 'text-red-500'}>
                              {stock.available} von {comp.quantity} verf.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => openEditModal(selectedTemplate)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteTemplate(selectedTemplate)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KitTemplateManager;
