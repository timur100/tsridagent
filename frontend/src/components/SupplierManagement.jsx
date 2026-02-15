import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { toast } from 'sonner';
import { 
  Truck, Plus, Search, Edit, Trash2, Package, Building2, Phone, Mail, 
  Globe, FileText, User, RefreshCw, ChevronRight, Tag, Euro, X,
  MapPin, Hash, AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Asset type labels mapping
const ASSET_TYPE_LABELS = {
  'tab_sp4': 'Surface Pro 4',
  'tab_sp6': 'Surface Pro 6',
  'tab_tsr_i5': 'TSRID Tablet i5',
  'tab_tsr_i7': 'TSRID Tablet i7',
  'sca_tsr': 'TSRID Scanner',
  'sca_dsk': 'Desko Scanner',
  'dock_tab_tsr': 'TSRID Tablet Dock',
  'dock_sca_tsr': 'TSRID Scanner Dock',
  'psu_tab_tsr': 'TSRID Tablet Netzteil',
  'psu_sca_tsr': 'TSRID Scanner Netzteil',
  'cab_usbc': 'USB-C Kabel (mit SN)',
  'cab_hdmi': 'HDMI Adapter',
  'other': 'Sonstiges'
};

const PRODUCT_CATEGORIES = [
  'Tablets',
  'Scanner',
  'Docking Stations',
  'Netzteile',
  'Kabel & Adapter',
  'Drucker',
  'Zubehör',
  'Software',
  'Sonstiges'
];

const SupplierManagement = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('suppliers');
  const [loading, setLoading] = useState(false);
  
  // Suppliers State
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersTotal, setSuppliersTotal] = useState(0);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Products State
  const [products, setProducts] = useState([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  
  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    street: '',
    zip_code: '',
    city: '',
    country: 'Deutschland',
    phone: '',
    email: '',
    website: '',
    customer_number: '',
    tax_id: '',
    notes: '',
    supplier_type: 'supplier',
    contacts: []
  });
  
  const [productForm, setProductForm] = useState({
    supplier_id: '',
    name: '',
    sku: '',
    manufacturer_sku: '',
    asset_type: '',
    category: '',
    description: '',
    unit_price: '',
    currency: 'EUR',
    notes: ''
  });

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (supplierSearch) params.append('search', supplierSearch);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/suppliers/all?${params}`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.suppliers || []);
        setSuppliersTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Error fetching suppliers:', e);
      toast.error('Fehler beim Laden der Lieferanten');
    } finally {
      setLoading(false);
    }
  }, [supplierSearch]);

  // Fetch products
  const fetchProducts = useCallback(async (supplierId = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (supplierId) params.append('supplier_id', supplierId);
      if (productSearch) params.append('search', productSearch);
      if (productCategory) params.append('category', productCategory);
      
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setProductsTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
      toast.error('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  }, [productSearch, productCategory]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (selectedSupplier) {
      fetchProducts(selectedSupplier.supplier_id);
    } else {
      fetchProducts();
    }
  }, [selectedSupplier, fetchProducts]);

  // Reset supplier form
  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      street: '',
      zip_code: '',
      city: '',
      country: 'Deutschland',
      phone: '',
      email: '',
      website: '',
      customer_number: '',
      tax_id: '',
      notes: '',
      supplier_type: 'supplier',
      contacts: []
    });
    setEditingSupplier(null);
  };

  // Reset product form
  const resetProductForm = () => {
    setProductForm({
      supplier_id: selectedSupplier?.supplier_id || '',
      name: '',
      sku: '',
      manufacturer_sku: '',
      asset_type: '',
      category: '',
      description: '',
      unit_price: '',
      currency: 'EUR',
      notes: ''
    });
    setEditingProduct(null);
  };

  // Open supplier modal for editing
  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      street: supplier.street || '',
      zip_code: supplier.zip_code || '',
      city: supplier.city || '',
      country: supplier.country || 'Deutschland',
      phone: supplier.phone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      customer_number: supplier.customer_number || '',
      tax_id: supplier.tax_id || '',
      notes: supplier.notes || '',
      supplier_type: supplier.supplier_type || 'supplier',
      contacts: supplier.contacts || []
    });
    setShowSupplierModal(true);
  };

  // Open product modal for editing
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      supplier_id: product.supplier_id || '',
      name: product.name || '',
      sku: product.sku || '',
      manufacturer_sku: product.manufacturer_sku || '',
      asset_type: product.asset_type || '',
      category: product.category || '',
      description: product.description || '',
      unit_price: product.unit_price?.toString() || '',
      currency: product.currency || 'EUR',
      notes: product.notes || ''
    });
    setShowProductModal(true);
  };

  // Save supplier
  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    
    setLoading(true);
    try {
      const url = editingSupplier 
        ? `${BACKEND_URL}/api/asset-mgmt/suppliers/${editingSupplier.supplier_id}`
        : `${BACKEND_URL}/api/asset-mgmt/suppliers`;
      
      const res = await fetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editingSupplier ? 'Lieferant aktualisiert' : 'Lieferant angelegt');
        setShowSupplierModal(false);
        resetSupplierForm();
        fetchSuppliers();
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      console.error('Error saving supplier:', e);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Save product
  const saveProduct = async () => {
    if (!productForm.name.trim()) {
      toast.error('Produktname ist erforderlich');
      return;
    }
    if (!productForm.supplier_id && !selectedSupplier) {
      toast.error('Lieferant ist erforderlich');
      return;
    }
    
    setLoading(true);
    try {
      const formData = {
        ...productForm,
        supplier_id: productForm.supplier_id || selectedSupplier?.supplier_id,
        unit_price: productForm.unit_price ? parseFloat(productForm.unit_price) : null
      };
      
      const url = editingProduct 
        ? `${BACKEND_URL}/api/asset-mgmt/products/${editingProduct.product_id}`
        : `${BACKEND_URL}/api/asset-mgmt/products`;
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editingProduct ? 'Produkt aktualisiert' : 'Produkt angelegt');
        setShowProductModal(false);
        resetProductForm();
        fetchProducts(selectedSupplier?.supplier_id);
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      console.error('Error saving product:', e);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Delete supplier or product
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setLoading(true);
    try {
      const url = deleteTarget.type === 'supplier'
        ? `${BACKEND_URL}/api/asset-mgmt/suppliers/${deleteTarget.id}`
        : `${BACKEND_URL}/api/asset-mgmt/products/${deleteTarget.id}`;
      
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast.success(deleteTarget.type === 'supplier' ? 'Lieferant gelöscht' : 'Produkt gelöscht');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        if (deleteTarget.type === 'supplier') {
          if (selectedSupplier?.supplier_id === deleteTarget.id) {
            setSelectedSupplier(null);
          }
          fetchSuppliers();
        } else {
          fetchProducts(selectedSupplier?.supplier_id);
        }
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (e) {
      console.error('Error deleting:', e);
      toast.error('Fehler beim Löschen');
    } finally {
      setLoading(false);
    }
  };

  // Add contact to supplier form
  const addContact = () => {
    setSupplierForm(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', position: '', phone: '', email: '', is_primary: false }]
    }));
  };

  // Update contact in supplier form
  const updateContact = (index, field, value) => {
    setSupplierForm(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  // Remove contact from supplier form
  const removeContact = (index) => {
    setSupplierForm(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>
            Lieferanten & Hersteller
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Verwalten Sie Ihre Lieferanten, Hersteller und deren Produkte
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { resetSupplierForm(); setShowSupplierModal(true); }}
            className="bg-[#c00000] hover:bg-[#a00000]"
            data-testid="add-supplier-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Lieferant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${cardBg} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lieferanten</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{suppliersTotal}</p>
            </div>
          </div>
        </Card>
        <Card className={`${cardBg} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Package className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Produkte</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{productsTotal}</p>
            </div>
          </div>
        </Card>
        <Card className={`${cardBg} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Truck className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ausgewählt</p>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : ''}`}>
                {selectedSupplier?.name || 'Alle'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <Card className={`${cardBg} lg:col-span-1`}>
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Lieferant suchen..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className={`${inputBg} flex-1`}
                data-testid="supplier-search"
              />
              <Button variant="ghost" size="sm" onClick={fetchSuppliers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto">
            {/* All Suppliers Option */}
            <div
              onClick={() => setSelectedSupplier(null)}
              className={`p-3 cursor-pointer border-b transition-colors ${
                !selectedSupplier 
                  ? 'bg-[#c00000]/10 border-[#c00000]' 
                  : isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className={`h-4 w-4 ${!selectedSupplier ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isDark ? 'text-white' : ''}`}>Alle Lieferanten</span>
                </div>
                <Badge variant="outline">{suppliersTotal}</Badge>
              </div>
            </div>
            
            {suppliers.map(supplier => (
              <div
                key={supplier.supplier_id}
                onClick={() => setSelectedSupplier(supplier)}
                className={`p-3 cursor-pointer border-b transition-colors ${
                  selectedSupplier?.supplier_id === supplier.supplier_id
                    ? 'bg-[#c00000]/10 border-[#c00000]'
                    : isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
                data-testid={`supplier-item-${supplier.supplier_id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${isDark ? 'text-white' : ''}`}>{supplier.name}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {supplier.city && <span>{supplier.city}</span>}
                  {supplier.customer_number && (
                    <Badge variant="outline" className="text-xs">#{supplier.customer_number}</Badge>
                  )}
                </div>
              </div>
            ))}
            
            {suppliers.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keine Lieferanten gefunden</p>
              </div>
            )}
          </div>
        </Card>

        {/* Products / Details */}
        <Card className={`${cardBg} lg:col-span-2`}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b border-gray-700">
              <TabsList className={isDark ? 'bg-[#1a1a1a]' : ''}>
                <TabsTrigger value="suppliers" data-testid="tab-details">
                  {selectedSupplier ? 'Details' : 'Übersicht'}
                </TabsTrigger>
                <TabsTrigger value="products" data-testid="tab-products">
                  Produkte
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Supplier Details Tab */}
            <TabsContent value="suppliers" className="p-4">
              {selectedSupplier ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>
                      {selectedSupplier.name}
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSupplier(selectedSupplier)}
                        data-testid="edit-supplier-btn"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setDeleteTarget({ type: 'supplier', id: selectedSupplier.supplier_id, name: selectedSupplier.name });
                          setShowDeleteModal(true);
                        }}
                        data-testid="delete-supplier-btn"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
                        <MapPin className="h-4 w-4 inline mr-2" />
                        Adresse
                      </h3>
                      <div className={`space-y-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedSupplier.street && <p>{selectedSupplier.street}</p>}
                        <p>{selectedSupplier.zip_code} {selectedSupplier.city}</p>
                        <p>{selectedSupplier.country}</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
                        <Phone className="h-4 w-4 inline mr-2" />
                        Kontakt
                      </h3>
                      <div className={`space-y-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedSupplier.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3 w-3" /> {selectedSupplier.phone}
                          </p>
                        )}
                        {selectedSupplier.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="h-3 w-3" /> {selectedSupplier.email}
                          </p>
                        )}
                        {selectedSupplier.website && (
                          <p className="flex items-center gap-2">
                            <Globe className="h-3 w-3" /> {selectedSupplier.website}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
                        <Hash className="h-4 w-4 inline mr-2" />
                        Geschäftsdaten
                      </h3>
                      <div className={`space-y-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedSupplier.customer_number && (
                          <p>Kundennr.: <span className="font-mono">{selectedSupplier.customer_number}</span></p>
                        )}
                        {selectedSupplier.tax_id && (
                          <p>USt-IdNr.: <span className="font-mono">{selectedSupplier.tax_id}</span></p>
                        )}
                        <p>Typ: <Badge variant="outline">{selectedSupplier.supplier_type}</Badge></p>
                      </div>
                    </div>

                    {selectedSupplier.notes && (
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                        <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
                          <FileText className="h-4 w-4 inline mr-2" />
                          Notizen
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {selectedSupplier.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contacts */}
                  {selectedSupplier.contacts?.length > 0 && (
                    <div>
                      <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
                        <User className="h-4 w-4 inline mr-2" />
                        Ansprechpartner
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedSupplier.contacts.map((contact, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>{contact.name}</p>
                            {contact.position && <p className="text-sm text-gray-400">{contact.position}</p>}
                            <div className="mt-2 space-y-1 text-sm">
                              {contact.phone && <p><Phone className="h-3 w-3 inline mr-1" />{contact.phone}</p>}
                              {contact.email && <p><Mail className="h-3 w-3 inline mr-1" />{contact.email}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Wählen Sie einen Lieferanten aus der Liste
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Produkt suchen..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className={`${inputBg} pl-9`}
                      data-testid="product-search"
                    />
                  </div>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger className={`${inputBg} w-40`}>
                      <SelectValue placeholder="Kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle</SelectItem>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => { resetProductForm(); setShowProductModal(true); }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedSupplier}
                  data-testid="add-product-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Produkt
                </Button>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Produkt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Kategorie</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Asset-Typ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Preis</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr 
                        key={product.product_id}
                        className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <td className={`px-4 py-3 ${isDark ? 'text-white' : ''}`}>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {!selectedSupplier && (
                              <p className="text-xs text-gray-400">{product.supplier_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{product.sku || '-'}</td>
                        <td className="px-4 py-3">
                          {product.category && <Badge variant="outline">{product.category}</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {product.asset_type && (
                            <Badge className="bg-blue-500/10 text-blue-500">
                              {ASSET_TYPE_LABELS[product.asset_type] || product.asset_type}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.unit_price ? (
                            <span className="font-mono">
                              {product.unit_price.toFixed(2)} {product.currency}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProduct(product)}
                              data-testid={`edit-product-${product.product_id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => {
                                setDeleteTarget({ type: 'product', id: product.product_id, name: product.name });
                                setShowDeleteModal(true);
                              }}
                              data-testid={`delete-product-${product.product_id}`}
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

              {products.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    {selectedSupplier 
                      ? 'Keine Produkte für diesen Lieferanten'
                      : 'Wählen Sie einen Lieferanten um Produkte anzuzeigen'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Supplier Modal */}
      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              {editingSupplier ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Name *
                </label>
                <Input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputBg}
                  placeholder="Firmenname"
                  data-testid="supplier-name-input"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Typ
                </label>
                <Select 
                  value={supplierForm.supplier_type} 
                  onValueChange={(v) => setSupplierForm(prev => ({ ...prev, supplier_type: v }))}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Lieferant</SelectItem>
                    <SelectItem value="manufacturer">Hersteller</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Kundennummer
                </label>
                <Input
                  value={supplierForm.customer_number}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, customer_number: e.target.value }))}
                  className={inputBg}
                  placeholder="Ihre Kundennummer"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Straße
                </label>
                <Input
                  value={supplierForm.street}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, street: e.target.value }))}
                  className={inputBg}
                  placeholder="Straße und Hausnummer"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  PLZ
                </label>
                <Input
                  value={supplierForm.zip_code}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, zip_code: e.target.value }))}
                  className={inputBg}
                  placeholder="12345"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Stadt
                </label>
                <Input
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, city: e.target.value }))}
                  className={inputBg}
                  placeholder="Stadt"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Telefon
                </label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                  className={inputBg}
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  E-Mail
                </label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                  className={inputBg}
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Website
                </label>
                <Input
                  value={supplierForm.website}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, website: e.target.value }))}
                  className={inputBg}
                  placeholder="https://www.example.com"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  USt-IdNr.
                </label>
                <Input
                  value={supplierForm.tax_id}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, tax_id: e.target.value }))}
                  className={inputBg}
                  placeholder="DE123456789"
                />
              </div>
            </div>

            {/* Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>
                  Ansprechpartner
                </label>
                <Button variant="outline" size="sm" onClick={addContact}>
                  <Plus className="h-3 w-3 mr-1" />
                  Hinzufügen
                </Button>
              </div>
              {supplierForm.contacts.map((contact, idx) => (
                <div key={idx} className={`p-3 rounded-lg border mb-2 ${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Kontakt {idx + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeContact(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => updateContact(idx, 'name', e.target.value)}
                      className={inputBg}
                    />
                    <Input
                      placeholder="Position"
                      value={contact.position}
                      onChange={(e) => updateContact(idx, 'position', e.target.value)}
                      className={inputBg}
                    />
                    <Input
                      placeholder="Telefon"
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className={inputBg}
                    />
                    <Input
                      placeholder="E-Mail"
                      value={contact.email}
                      onChange={(e) => updateContact(idx, 'email', e.target.value)}
                      className={inputBg}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Notizen
              </label>
              <textarea
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
                className={`w-full rounded-md border p-2 ${inputBg}`}
                rows={3}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveSupplier} disabled={loading} className="bg-[#c00000] hover:bg-[#a00000]">
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {editingSupplier ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className={`max-w-xl ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Produktname *
              </label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                className={inputBg}
                placeholder="z.B. Surface Pro 4"
                data-testid="product-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  SKU / Artikelnummer
                </label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  className={inputBg}
                  placeholder="ART-12345"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Hersteller-SKU
                </label>
                <Input
                  value={productForm.manufacturer_sku}
                  onChange={(e) => setProductForm(prev => ({ ...prev, manufacturer_sku: e.target.value }))}
                  className={inputBg}
                  placeholder="MFR-12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Kategorie
                </label>
                <Select 
                  value={productForm.category} 
                  onValueChange={(v) => setProductForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Asset-Typ verknüpfen
                </label>
                <Select 
                  value={productForm.asset_type} 
                  onValueChange={(v) => setProductForm(prev => ({ ...prev, asset_type: v }))}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Verknüpfung</SelectItem>
                    {Object.entries(ASSET_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Preis (Netto)
                </label>
                <div className="relative">
                  <Euro className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.unit_price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit_price: e.target.value }))}
                    className={`${inputBg} pl-9`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Währung
                </label>
                <Select 
                  value={productForm.currency} 
                  onValueChange={(v) => setProductForm(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className={inputBg}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                Beschreibung
              </label>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full rounded-md border p-2 ${inputBg}`}
                rows={2}
                placeholder="Produktbeschreibung..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveProduct} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`${isDark ? 'text-white' : ''} flex items-center gap-2`}>
              <AlertCircle className="h-5 w-5 text-red-500" />
              {deleteTarget?.type === 'supplier' ? 'Lieferant löschen' : 'Produkt löschen'}
            </DialogTitle>
          </DialogHeader>
          
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            Möchten Sie <span className="font-bold">{deleteTarget?.name}</span> wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={confirmDelete} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;
