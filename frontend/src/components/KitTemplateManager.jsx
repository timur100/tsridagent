import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Boxes, Plus, Search, RefreshCw, Edit2, Trash2, Check, Package, 
  Monitor, Printer, Box, Tablet, HardDrive, AlertCircle, Copy,
  ChevronDown, ChevronRight, Warehouse
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import TablePagination from './ui/TablePagination';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin || 'http://localhost:8001';

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
  cable: 'Kabel/Adapter',
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
  cable: Box,
  other: Box
};

/**
 * KitTemplateManager - Verwaltet Kit-Vorlagen
 * Definiert welche Gerätetypen und Mengen zu einem Kit gehören
 */
const KitTemplateManager = ({ theme, tenants = [] }) => {
  const isDark = theme === 'dark';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [storageStats, setStorageStats] = useState(null);
  
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
    components: [] // { device_type: 'tablet', quantity: 1 }
  });
  
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

  // Fetch storage stats for availability calculation
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

  useEffect(() => {
    fetchTemplates();
    fetchStorageStats();
  }, [fetchTemplates, fetchStorageStats]);

  // Calculate how many kits can be created with current stock
  const calculatePossibleKits = (template) => {
    if (!storageStats || !template.components) return 0;
    
    const byType = storageStats.by_type || {};
    let minKits = Infinity;
    
    for (const component of template.components) {
      const available = byType[component.device_type]?.available_for_kits || 0;
      const possibleFromType = Math.floor(available / component.quantity);
      minKits = Math.min(minKits, possibleFromType);
    }
    
    return minKits === Infinity ? 0 : minKits;
  };

  // Get stock for a device type
  const getStockForType = (deviceType) => {
    if (!storageStats) return { total: 0, available: 0 };
    const typeData = storageStats.by_type?.[deviceType];
    return {
      total: typeData?.total || 0,
      available: typeData?.available_for_kits || 0
    };
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

  // Add component to form
  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { device_type: 'tablet', quantity: 1 }]
    }));
  };

  // Update component in form
  const updateComponent = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      )
    }));
  };

  // Remove component from form
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

  // Get device icon
  const getDeviceIcon = (type) => {
    const Icon = DEVICE_TYPE_ICONS[type] || Box;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>Kit-Vorlagen</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Definieren Sie, aus welchen Komponenten ein Kit besteht
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchTemplates(); fetchStorageStats(); }} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={openCreateModal} className="bg-[#c00000] hover:bg-[#a00000] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>
      </div>

      {/* Storage Summary */}
      {storageStats && (
        <Card className={`p-4 ${cardBg}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-500" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                Gesamt im Lager: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{storageStats.total_in_storage}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                Verfügbar für Kits: <strong className="text-green-500">{storageStats.available_for_kits}</strong>
              </span>
            </div>
          </div>
        </Card>
      )}

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

                  {/* Components Summary */}
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Komponenten ({template.components?.length || 0}):
                    </p>
                    <div className="space-y-1">
                      {template.components?.slice(0, 4).map((comp, i) => {
                        const stock = getStockForType(comp.device_type);
                        const hasEnough = stock.available >= comp.quantity;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(comp.device_type)}
                              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                {comp.quantity}x {DEVICE_TYPE_LABELS[comp.device_type] || comp.device_type}
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
        <DialogContent className={`max-w-2xl ${isDark ? 'bg-[#1a1a1a] text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              {editMode ? 'Vorlage bearbeiten' : 'Neue Kit-Vorlage'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Standard-Scanner-Kit"
                className={inputBg}
              />
            </div>

            {/* Tenant */}
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

            {/* Components */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Komponenten *</label>
                <Button size="sm" variant="outline" onClick={addComponent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Komponente
                </Button>
              </div>

              {formData.components.length === 0 ? (
                <div className={`p-4 rounded-lg border-2 border-dashed text-center ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Noch keine Komponenten hinzugefügt
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.components.map((comp, index) => {
                    const stock = getStockForType(comp.device_type);
                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Select 
                              value={comp.device_type}
                              onValueChange={(v) => updateComponent(index, 'device_type', v)}
                            >
                              <SelectTrigger className={`${inputBg}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DEVICE_TYPE_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min="1"
                              value={comp.quantity}
                              onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)}
                              className={inputBg}
                            />
                          </div>
                          <div className={`text-xs w-20 text-right ${stock.available >= comp.quantity ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.available} verf.
                          </div>
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
            </div>

            {/* Possible Kits Preview */}
            {formData.components.length > 0 && storageStats && (
              <Card className={`p-4 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-500" />
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
                      const stock = getStockForType(comp.device_type);
                      const hasEnough = stock.available >= comp.quantity;
                      return (
                        <div 
                          key={i}
                          className={`p-3 rounded-lg flex items-center justify-between ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            {getDeviceIcon(comp.device_type)}
                            <span className={isDark ? 'text-white' : ''}>
                              {comp.quantity}x {DEVICE_TYPE_LABELS[comp.device_type] || comp.device_type}
                            </span>
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
