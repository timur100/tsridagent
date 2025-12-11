import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Plus, Search, Filter, Download, Upload, 
  Edit2, Trash2, Package, Monitor, Laptop,
  Zap, RefreshCw, QrCode, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssetManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetForm, setAssetForm] = useState({
    asset_id: '',
    name: '',
    category_id: '',
    description: '',
    serial_number: '',
    purchase_date: '',
    warranty_end: '',
    status: 'active',
    location: ''
  });
  
  // Asset-ID generation state
  const [generatingId, setGeneratingId] = useState(false);
  const [idPreview, setIdPreview] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadCategories();
      loadAssets();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (assetForm.category_id && selectedTenantId) {
      loadIdPreview();
    }
  }, [assetForm.category_id]);

  const loadTenants = async () => {
    try {
      const result = await apiCall('/api/tenants');
      if (result.success) {
        const tenantsList = result.data?.data || result.data || [];
        setTenants(tenantsList);
        if (tenantsList.length > 0 && !selectedTenantId) {
          setSelectedTenantId(tenantsList[0].tenant_id);
        }
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Fehler beim Laden der Tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/categories`);
      if (result.success) {
        const data = result.data?.data || result.data || [];
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      const result = await apiCall(`/api/assets/${selectedTenantId}/assets`);
      if (result.success) {
        const data = result.data?.data || result.data || [];
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Fehler beim Laden der Assets');
    } finally {
      setLoading(false);
    }
  };


  // Function to show specific asset details (called from global search)
  const showAssetDetails = async (assetId, tenantId = null) => {
    try {
      // Use provided tenant ID or current selected tenant
      const targetTenantId = tenantId || selectedTenantId;
      
      // If tenant ID provided and different from current, switch tenant
      if (tenantId && tenantId !== selectedTenantId) {
        setSelectedTenantId(tenantId);
        // Wait for assets to load
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Find asset in current list
      let asset = assets.find(a => a.asset_id === assetId);
      
      // If not in current list, fetch from API
      if (!asset && targetTenantId) {
        const result = await apiCall(`/api/assets/${targetTenantId}/assets/${assetId}`);
        if (result.success) {
          asset = result.data?.data || result.data;
        }
      }
      
      if (asset) {
        setSelectedAsset(asset);
        setShowDetailModal(true);
        toast.success(`Asset Details: ${asset.asset_id}`);
      } else {
        toast.error(`Asset ${assetId} nicht gefunden`);
      }
    } catch (error) {
      console.error('Error loading asset details:', error);
      toast.error('Fehler beim Laden der Asset-Details');
    }
  };

  // Expose function to parent via ref or global
  React.useEffect(() => {
    // Store function globally so AdminPortal can call it
    window.showAssetDetails = showAssetDetails;
    return () => {
      delete window.showAssetDetails;
    };
  }, [assets, selectedTenantId]);

  const loadIdPreview = async () => {
    try {
      const result = await apiCall(
        `/api/assets/${selectedTenantId}/preview-id?category_id=${assetForm.category_id}`
      );
      if (result.success && result.data) {
        setIdPreview(result.data.preview);
      }
    } catch (error) {
      console.error('Error loading ID preview:', error);
    }
  };

  const generateAssetId = async () => {
    if (!assetForm.category_id) {
      toast.error('Bitte wählen Sie zuerst eine Kategorie');
      return;
    }

    setGeneratingId(true);
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/generate-id`, {
        method: 'POST',
        body: {
          category_id: assetForm.category_id,
          location_id: assetForm.location
        }
      });

      if (result.success && result.data) {
        const newId = result.data.asset_id;
        setAssetForm({ ...assetForm, asset_id: newId });
        toast.success(`Asset-ID generiert: ${newId}`);
      } else {
        toast.error('Fehler beim Generieren der Asset-ID');
      }
    } catch (error) {
      console.error('Error generating asset ID:', error);
      toast.error('Fehler beim Generieren der Asset-ID');
    } finally {
      setGeneratingId(false);
    }
  };

  const openModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setAssetForm(asset);
    } else {
      setEditingAsset(null);
      setAssetForm({
        asset_id: '',
        name: '',
        category_id: '',
        description: '',
        serial_number: '',
        purchase_date: '',
        warranty_end: '',
        status: 'active',
        location: ''
      });
    }
    setShowModal(true);
  };

  const saveAsset = async () => {
    try {
      if (editingAsset) {
        // Update existing asset
        const result = await apiCall(`/api/assets/${selectedTenantId}/assets/${editingAsset.asset_id}`, {
          method: 'PUT',
          body: assetForm
        });
        
        if (result.success) {
          toast.success('Asset aktualisiert');
          setShowModal(false);
          loadAssets();
        } else {
          toast.error('Fehler beim Aktualisieren');
        }
      } else {
        // Create new asset
        const result = await apiCall(`/api/assets/${selectedTenantId}/assets`, {
          method: 'POST',
          body: assetForm
        });
        
        if (result.success) {
          toast.success('Asset erstellt');
          setShowModal(false);
          loadAssets();
        } else {
          toast.error(result.data?.detail || 'Fehler beim Erstellen');
        }
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error('Fehler beim Speichern: ' + error.message);
    }
  };

  const deleteAsset = async (assetId) => {
    if (!window.confirm('Asset wirklich löschen?')) return;
    
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/assets/${assetId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Asset gelöscht');
        loadAssets();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };


  const downloadQRCode = async (assetId) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('portal_token');
      
      const response = await fetch(
        `${backendUrl}/api/assets/${selectedTenantId}/assets/${assetId}/qr-code`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assetId}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`QR-Code für ${assetId} heruntergeladen`);
      } else {
        toast.error('Fehler beim Laden des QR-Codes');
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Fehler beim Download');
    }
  };

  const downloadAllQRCodes = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('portal_token');
      
      toast.loading('Generiere alle QR-Codes...', { id: 'qr-bulk' });
      
      let url = `${backendUrl}/api/assets/${selectedTenantId}/assets/qr-codes/bulk`;
      if (filterCategory !== 'all') {
        url += `?category_id=${filterCategory}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `asset_qr_codes_${selectedTenantId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        toast.success('Alle QR-Codes heruntergeladen', { id: 'qr-bulk' });
      } else {
        toast.error('Fehler beim Generieren', { id: 'qr-bulk' });
      }
    } catch (error) {
      console.error('Error downloading bulk QR codes:', error);
      toast.error('Fehler beim Download', { id: 'qr-bulk' });
    }
  };

  // Print QR Code Label to Brother QL Printer
  const printQRCodeLabel = async (asset) => {
    try {
      // Check if running in Electron desktop app
      if (!window.printerAPI || !window.printerAPI.getSystemPrinters) {
        toast.error('Druck-Funktion nur in Desktop-App verfügbar!');
        return;
      }

      toast.loading('Bereite Druck vor...', { id: 'print-qr' });

      // Get available printers
      const printers = await window.printerAPI.getSystemPrinters();
      
      if (printers.length === 0) {
        toast.error('Keine Drucker gefunden!', { id: 'print-qr' });
        return;
      }

      // Find Brother QL printer
      let brotherPrinter = printers.find(p => p.name.includes('Brother QL'));
      
      // Fallback: Use first printer if Brother not found
      if (!brotherPrinter) {
        brotherPrinter = printers[0];
        console.warn('[PRINT] Brother QL not found, using:', brotherPrinter.name);
      }

      console.log('[PRINT] Selected printer:', brotherPrinter.name);
      console.log('[PRINT] Asset:', asset.asset_id);

      // Create label text (Brother QL will print this as text)
      // For better results, we'd need to generate an actual label image
      const labelText = [
        '',
        '================================',
        '    TSRID ASSET MANAGEMENT',
        '================================',
        '',
        'Asset-ID:',
        asset.asset_id,
        '',
        'Name:',
        asset.name,
        '',
        'Status: ' + (asset.status || 'Active'),
        'Standort: ' + (asset.location || 'N/A'),
        '',
        '================================',
        'Scannen Sie den QR-Code mit',
        'der TSRID App fuer Details',
        '================================',
        ''
      ].join('\n');

      toast.loading(`Drucke auf ${brotherPrinter.name}...`, { id: 'print-qr' });

      // Print to Windows printer
      const result = await window.printerAPI.printToWindows(
        brotherPrinter.name,
        labelText,
        'TEXT'
      );

      if (result.success) {
        toast.success(`Label fuer ${asset.asset_id} gedruckt!`, { id: 'print-qr' });
      } else {
        toast.error('Druckfehler: ' + (result.error || 'Unbekannt'), { id: 'print-qr' });
      }

    } catch (error) {
      console.error('[PRINT] Error:', error);
      toast.error('Fehler beim Drucken: ' + error.message, { id: 'print-qr' });
    }
  };


  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : 'Unbekannt';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'retired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'maintenance': return 'Wartung';
      case 'retired': return 'Ausgemustert';
      default: return status;
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || asset.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Asset Management
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie alle Hardware- und Software-Assets
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={downloadAllQRCodes}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!selectedTenantId || assets.length === 0}
          >
            <QrCode className="h-4 w-4" />
            Alle QR-Codes
          </Button>
          <Button
            onClick={() => toast.info('Import-Funktion kommt bald')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={() => openModal()}
            className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neues Asset
          </Button>
        </div>
      </div>

      {/* Tenant Selection */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Tenant:
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className={`flex-1 px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1f1f1f] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">-- Tenant wählen --</option>
            {tenants.map((tenant) => (
              <option key={tenant.tenant_id} value={tenant.tenant_id}>
                {tenant.display_name || tenant.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selectedTenantId && (
        <>
          {/* Filters & Search */}
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="flex gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Suche nach Name oder Asset-ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1f1f1f] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Category Filter */}
              <div className="w-64">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1f1f1f] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">Alle Kategorien</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Assets Table */}
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="space-y-4">
              {filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                  <Package className={`h-16 w-16 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <h3 className={`text-lg font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Keine Assets gefunden
                  </h3>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Erstellen Sie Ihr erstes Asset mit dem &quot;Neues Asset&quot; Button
                  </p>
                  <Button
                    onClick={() => openModal()}
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neues Asset erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssets.map((asset) => (
                    <Card key={asset.id} className={`p-4 ${
                      theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
                          }`}>
                            <Package className="h-6 w-6 text-[#c00000]" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className={`font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {asset.name}
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(asset.status)}`}>
                                {getStatusText(asset.status)}
                              </span>
                            </div>
                            <div className={`flex items-center gap-4 mt-1 text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <span className="font-mono">{asset.asset_id}</span>
                              <span>•</span>
                              <span>{getCategoryName(asset.category_id)}</span>
                              {asset.serial_number && (
                                <>
                                  <span>•</span>
                                  <span>SN: {asset.serial_number}</span>
                                </>
                              )}
                              {asset.location && (
                                <>
                                  <span>•</span>
                                  <span>📍 {asset.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadQRCode(asset.asset_id)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-blue-900 text-blue-400'
                                : 'hover:bg-blue-100 text-blue-600'
                            }`}
                            title="QR-Code herunterladen"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => printQRCodeLabel(asset)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-green-900 text-green-400'
                                : 'hover:bg-green-100 text-green-600'
                            }`}
                            title="Label drucken (Brother QL)"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(asset)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-400'
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAsset(asset.asset_id)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-red-900 text-red-400'
                                : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {editingAsset ? 'Asset bearbeiten' : 'Neues Asset erstellen'}
              </h3>

              <div className="space-y-4">
                {/* Asset-ID with Generator */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Asset-ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assetForm.asset_id}
                      onChange={(e) => setAssetForm({ ...assetForm, asset_id: e.target.value })}
                      placeholder="Wird automatisch generiert"
                      className={`flex-1 px-4 py-2 rounded-lg border font-mono ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      readOnly={!editingAsset}
                    />
                    {!editingAsset && (
                      <Button
                        onClick={generateAssetId}
                        disabled={!assetForm.category_id || generatingId}
                        className="bg-[#c00000] hover:bg-[#a00000] text-white whitespace-nowrap"
                      >
                        {generatingId ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generiere...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            ID Generieren
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {idPreview && !assetForm.asset_id && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Vorschau: {idPreview}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Kategorie *
                  </label>
                  <select
                    value={assetForm.category_id}
                    onChange={(e) => setAssetForm({ ...assetForm, category_id: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  >
                    <option value="">-- Kategorie wählen --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    placeholder="z.B. Dell Laptop XPS 13"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Seriennummer
                  </label>
                  <input
                    type="text"
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    placeholder="z.B. SN123456789"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Standort
                  </label>
                  <input
                    type="text"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    placeholder="z.B. Berlin Office"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Beschreibung
                  </label>
                  <textarea
                    value={assetForm.description}
                    onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                    placeholder="Zusätzliche Informationen..."
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Status
                  </label>
                  <select
                    value={assetForm.status}
                    onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="active">Aktiv</option>
                    <option value="maintenance">Wartung</option>
                    <option value="retired">Ausgemustert</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={saveAsset}
                  className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
                  disabled={!assetForm.name || !assetForm.category_id || !assetForm.asset_id}
                >
                  {editingAsset ? 'Änderungen speichern' : 'Asset erstellen'}
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Asset Detail Modal */}
      {showDetailModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-100'
                  }`}>
                    <Package className="h-8 w-8 text-[#c00000]" />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold font-mono ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedAsset.asset_id}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedAsset.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-400'
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  selectedAsset.status === 'active' ? 'bg-green-500/20 text-green-600' :
                  selectedAsset.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-600' :
                  'bg-gray-500/20 text-gray-600'
                }`}>
                  {selectedAsset.status === 'active' ? 'Aktiv' :
                   selectedAsset.status === 'maintenance' ? 'Wartung' :
                   'Ausgemustert'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Category */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Kategorie</label>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getCategoryName(selectedAsset.category_id)}
                  </p>
                </div>

                {/* Serial Number */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Seriennummer</label>
                  <p className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAsset.serial_number || '-'}
                  </p>
                </div>

                {/* Device ID */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Device-ID</label>
                  <p className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAsset.device_id || '-'}
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Standort</label>
                  <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAsset.location || '-'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedAsset.description && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Beschreibung</label>
                  <p className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-[#1f1f1f] text-white' : 'bg-gray-50 text-gray-900'
                  }`}>
                    {selectedAsset.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => downloadQRCode(selectedAsset.asset_id)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  QR-Code
                </Button>
                <Button
                  onClick={() => printQRCodeLabel(selectedAsset)}
                  variant="outline"
                  className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-300 dark:border-green-700"
                  title="Label auf Brother QL drucken"
                >
                  <Printer className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">Drucken</span>
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailModal(false);
                    openModal(selectedAsset);
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Bearbeiten
                </Button>
                <Button
                  onClick={() => setShowDetailModal(false)}
                  className="ml-auto bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  Schließen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};


export default AssetManagement;
