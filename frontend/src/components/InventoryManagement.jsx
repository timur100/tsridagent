import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Package, Plus, Search, AlertTriangle, Edit, Trash2, Barcode, ChevronDown, ChevronRight, Image as ImageIcon, X, Copy, Eye, EyeOff, ArrowUp, ArrowDown, Settings, GripVertical } from 'lucide-react';
import TableExportImport from './ui/TableExportImport';
import TableColumnSettings from './ui/TableColumnSettings';
import toast from 'react-hot-toast';

// Default column configuration for Inventory
const DEFAULT_INVENTORY_COLUMNS = [
  { id: 'select', label: '', visible: true, sortable: false },
  { id: 'image', label: 'Bild', visible: true, sortable: false },
  { id: 'name', label: 'Artikel', visible: true, sortable: true },
  { id: 'category', label: 'Kategorie', visible: true, sortable: true },
  { id: 'barcode', label: 'Barcode', visible: true, sortable: true },
  { id: 'quantity_in_stock', label: 'Bestand', visible: true, sortable: true },
  { id: 'unit', label: 'Einheit', visible: true, sortable: true },
  { id: 'min_stock_level', label: 'Min. Bestand', visible: false, sortable: true },
  { id: 'status', label: 'Status', visible: true, sortable: true },
  { id: 'description', label: 'Beschreibung', visible: false, sortable: false },
  { id: 'actions', label: 'Aktionen', visible: true, sortable: false },
];

const InventoryManagement = ({ selectedItemId = null, onItemOpened = null }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const { selectedTenantId } = useTenant();
  
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [summary, setSummary] = useState({ total: 0, low_stock: 0, out_of_stock: 0 });
  const [categories, setCategories] = useState([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Column configuration state
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('inventoryColumns');
    return saved ? JSON.parse(saved) : DEFAULT_INVENTORY_COLUMNS;
  });
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hardware',
    description: '',
    barcode: '',
    serial_numbers: [],
    quantity_in_stock: 0,
    min_stock_level: 5,
    unit: 'Stück',
    image_url: null
  });
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedParentForSubcategory, setSelectedParentForSubcategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    parent_id: null
  });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (itemId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  // Handle import
  const handleImport = async (importedData) => {
    console.log('Imported data:', importedData);
    // For now, just log - could implement actual import logic
    toast.success(`${importedData.length} Einträge bereit zum Import`);
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
    
    // Auto-refresh items every 30 seconds
    const interval = setInterval(() => {
      fetchItems();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedTenantId]); // Reload when tenant changes

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter, showLowStockOnly]);

  // Auto-open modal when selectedItemId is provided (from global search)
  useEffect(() => {
    if (selectedItemId && items.length > 0) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        handleOpenModal(item);
        if (onItemOpened) {
          onItemOpened(); // Notify parent that item was opened
        }
      }
    }
  }, [selectedItemId, items]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Build URL with tenant filter
      let url = '/api/inventory/items';
      if (selectedTenantId && selectedTenantId !== 'all') {
        url += `?tenant_id=${selectedTenantId}`;
      }
      
      const result = await apiCall(url);
      if (result.success && result.data) {
        setItems(result.data.items || []);
        setSummary(result.data.summary || { total: 0, low_stock: 0, out_of_stock: 0 });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Fehler beim Laden des Lagers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const result = await apiCall('/api/inventory/categories');
      if (result.success && result.data) {
        const categoryObjects = result.data.categories || [];
        // Extract just the names for backward compatibility
        const categoryNames = categoryObjects.map(cat => typeof cat === 'string' ? cat : cat.name);
        // But keep full objects for management
        setCategories(categoryObjects);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(search) ||
        item.barcode?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    }

    // Low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter(item => item.is_low_stock);
    }

    setFilteredItems(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        // Update existing item
        const result = await apiCall(`/api/inventory/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Artikel aktualisiert');
          fetchItems();
          handleCloseModal();
        }
      } else {
        // Create new item
        const result = await apiCall('/api/inventory/items', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Artikel erstellt');
          fetchItems();
          handleCloseModal();
        } else {
          toast.error(result.data?.detail || 'Fehler beim Erstellen');
        }
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Möchten Sie diesen Artikel wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/inventory/items/${itemId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Artikel gelöscht');
        fetchItems();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDuplicate = (item) => {
    // Create a copy of the item with modified name and reset some fields
    const duplicatedItem = {
      ...item,
      name: `${item.name} (Kopie)`,
      barcode: '', // Clear barcode for manual entry
      id: undefined // Remove ID so a new one will be generated
    };
    
    // Open modal with duplicated data
    setEditingItem(null); // Not editing, creating new
    setFormData({
      name: duplicatedItem.name,
      category: duplicatedItem.category,
      description: duplicatedItem.description || '',
      barcode: '',
      quantity_in_stock: duplicatedItem.quantity_in_stock,
      min_stock_level: duplicatedItem.min_stock_level,
      unit: duplicatedItem.unit || 'Stück',
      image_url: duplicatedItem.image_url || null
    });
    setShowModal(true);
    toast.info('Artikel zum Duplizieren vorbereitet');
  };

  const handleOpenCategoryModal = (category = null, parentCategory = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name || '',
        description: category.description || '',
        parent_id: category.parent_id || null
      });
      setSelectedParentForSubcategory(null);
    } else {
      setEditingCategory(null);
      if (parentCategory) {
        // Creating a subcategory
        setSelectedParentForSubcategory(parentCategory);
        setCategoryFormData({
          name: '',
          description: '',
          parent_id: parentCategory.id
        });
      } else {
        // Creating a main category
        setSelectedParentForSubcategory(null);
        setCategoryFormData({
          name: '',
          description: '',
          parent_id: null
        });
      }
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();

    try {
      const params = new URLSearchParams({
        name: categoryFormData.name,
        description: categoryFormData.description || ''
      });
      
      if (categoryFormData.parent_id) {
        params.append('parent_id', categoryFormData.parent_id);
      }

      if (editingCategory) {
        // Update existing category
        const result = await apiCall(`/api/inventory/categories/${editingCategory.id}?${params.toString()}`, {
          method: 'PUT'
        });

        if (result.success) {
          toast.success('Kategorie aktualisiert');
          fetchCategories();
          fetchItems(); // Refresh items in case category name changed
          handleCloseCategoryModal();
        } else {
          toast.error(result.data?.detail || 'Fehler beim Aktualisieren');
        }
      } else {
        // Create new category
        const result = await apiCall(`/api/inventory/categories?${params.toString()}`, {
          method: 'POST'
        });

        if (result.success) {
          toast.success(categoryFormData.parent_id ? 'Unterkategorie erstellt' : 'Kategorie erstellt');
          fetchCategories();
          handleCloseCategoryModal();
        } else {
          toast.error(result.data?.detail || 'Fehler beim Erstellen');
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleToggleCategoryVisibility = async (categoryId, currentVisibility) => {
    try {
      const result = await apiCall(`/api/inventory/categories/${categoryId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          visible_in_shop: !currentVisibility 
        })
      });

      if (result.success) {
        toast.success(!currentVisibility ? 'Kategorie im Shop sichtbar' : 'Kategorie im Shop versteckt');
        fetchCategories();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };


  const handleReorderCategory = async (categoryId, direction) => {
    try {
      const result = await apiCall(`/api/inventory/categories/${categoryId}/reorder?direction=${direction}`, {
        method: 'PUT'
      });

      if (result.success) {
        toast.success(result.data?.message || 'Kategorie verschoben');
        fetchCategories();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Verschieben');
      }
    } catch (error) {
      console.error('Error reordering category:', error);
      toast.error('Fehler beim Verschieben');
    }
  };


  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Möchten Sie diese Kategorie wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/inventory/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Kategorie gelöscht');
        fetchCategories();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        category: item.category || 'Hardware',
        description: item.description || '',
        barcode: item.barcode || '',
        serial_numbers: item.serial_numbers || [],
        quantity_in_stock: item.quantity_in_stock || 0,
        min_stock_level: item.min_stock_level || 5,
        unit: item.unit || 'Stück',
        image_url: item.image_url || null
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'Hardware',
        description: '',
        barcode: '',
        serial_numbers: [],
        quantity_in_stock: 0,
        min_stock_level: 5,
        unit: 'Stück',
        image_url: null
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Nur JPG und PNG Dateien sind erlaubt');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 10MB)');
      return;
    }

    setUploadingImage(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        
        if (editingItem) {
          // Upload to existing item
          const result = await apiCall(`/api/inventory/items/${editingItem.id}/image`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: base64Image })
          });

          if (result.success) {
            toast.success('Bild erfolgreich hochgeladen');
            setFormData({ ...formData, image_url: base64Image });
            fetchItems(); // Refresh list
          } else {
            toast.error('Fehler beim Hochladen');
          }
        } else {
          // New item - just update form data
          setFormData({ ...formData, image_url: base64Image });
          toast.success('Bild hinzugefügt');
        }
        
        setUploadingImage(false);
      };

      reader.onerror = () => {
        toast.error('Fehler beim Lesen der Datei');
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Fehler beim Hochladen');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: null });
    toast.success('Bild entfernt');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamt Artikel
              </p>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {summary.total}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Niedriger Bestand
              </p>
              <p className={`text-3xl font-bold text-yellow-500`}>
                {summary.low_stock}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Nicht verfügbar
              </p>
              <p className={`text-3xl font-bold text-red-500`}>
                {summary.out_of_stock}
              </p>
            </div>
            <Package className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Categories Management */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className={`p-1 rounded hover:bg-gray-700 transition-colors`}
            >
              {categoriesExpanded ? (
                <ChevronDown className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
              ) : (
                <ChevronRight className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
              )}
            </button>
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kategorien-Hierarchie
            </h3>
          </div>
          <button
            onClick={() => handleOpenCategoryModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neue Kategorie
          </button>
        </div>
        
        {categoriesExpanded && (
          <div className="space-y-3 mt-3">
          {categories.map((cat) => {
            const categoryObj = typeof cat === 'string' ? { name: cat } : cat;
            const subcategories = categoryObj.subcategories || [];
            
            return (
              <div key={categoryObj.id || categoryObj.name} className="space-y-2">
                {/* Main Category */}
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 ${
                    theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-[#c00000]" />
                    <div>
                      <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {categoryObj.name}
                      </div>
                      {categoryObj.description && (
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {categoryObj.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {categoryObj.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReorderCategory(categoryObj.id, 'up')}
                        className={`p-2 rounded transition-colors ${
                          theme === 'dark' 
                            ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Nach oben verschieben"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReorderCategory(categoryObj.id, 'down')}
                        className={`p-2 rounded transition-colors ${
                          theme === 'dark' 
                            ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Nach unten verschieben"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleCategoryVisibility(categoryObj.id, categoryObj.visible_in_shop)}
                        className={`p-2 rounded transition-colors ${
                          categoryObj.visible_in_shop
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={categoryObj.visible_in_shop ? 'Im Shop sichtbar (click zum Verstecken)' : 'Im Shop versteckt (click zum Anzeigen)'}
                      >
                        {categoryObj.visible_in_shop ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenCategoryModal(null, categoryObj)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                        title="Unterkategorie hinzufügen"
                      >
                        <Plus className="h-3 w-3" />
                        Unterkategorie
                      </button>
                      <button
                        onClick={() => handleOpenCategoryModal(categoryObj)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(categoryObj.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subcategories */}
                {subcategories.length > 0 && (
                  <div className="ml-8 space-y-2">
                    {subcategories.map((subcat) => (
                      <div
                        key={subcat.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                          theme === 'dark' ? 'bg-[#0a0a0a] border-gray-600' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-400`}>└─</span>
                          <div>
                            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {subcat.name}
                            </div>
                            {subcat.description && (
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                {subcat.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReorderCategory(subcat.id, 'up')}
                            className={`p-1 rounded transition-colors ${
                              theme === 'dark' 
                                ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Nach oben"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleReorderCategory(subcat.id, 'down')}
                            className={`p-1 rounded transition-colors ${
                              theme === 'dark' 
                                ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Nach unten"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleToggleCategoryVisibility(subcat.id, subcat.visible_in_shop)}
                            className={`p-1 rounded transition-colors ${
                              subcat.visible_in_shop
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={subcat.visible_in_shop ? 'Im Shop sichtbar' : 'Im Shop versteckt'}
                          >
                            {subcat.visible_in_shop ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenCategoryModal(subcat)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Bearbeiten"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(subcat.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </Card>

      {/* Filters and Actions */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-4 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Alle Kategorien</option>
              {categories.map(cat => {
                const categoryName = typeof cat === 'string' ? cat : cat.name;
                return (
                  <option key={categoryName} value={categoryName}>{categoryName}</option>
                );
              })}
            </select>

            {/* Low Stock Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                Nur niedriger Bestand
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Artikel
            </Button>
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
            <tr>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Bild
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Artikel
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Kategorie
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Barcode
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Bestand
                </th>
                <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-right text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => handleOpenModal(item)}
                  className={`border-t cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className={`h-12 w-12 rounded flex items-center justify-center ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                    {item.category}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Barcode className="h-4 w-4 text-gray-400" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}>
                        {item.barcode}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                    {item.quantity_in_stock} {item.unit}
                  </td>
                  <td className="px-6 py-4">
                    {item.quantity_in_stock === 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Nicht verfügbar
                      </span>
                    ) : item.is_low_stock ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Niedriger Bestand
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Verfügbar
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(item);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(item);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Duplizieren"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Keine Artikel gefunden
            </p>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingCategory 
                  ? 'Kategorie bearbeiten' 
                  : selectedParentForSubcategory 
                    ? `Unterkategorie für "${selectedParentForSubcategory.name}"`
                    : 'Neue Hauptkategorie'}
              </h2>
              {selectedParentForSubcategory && !editingCategory && (
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Wird erstellt unter: {selectedParentForSubcategory.name}
                </p>
              )}

              <form onSubmit={handleSubmitCategory} className="space-y-4">
                {/* Parent Category Selector (only when editing and not creating subcategory) */}
                {editingCategory && !selectedParentForSubcategory && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Übergeordnete Kategorie
                    </label>
                    <select
                      value={categoryFormData.parent_id || ''}
                      onChange={(e) => setCategoryFormData({...categoryFormData, parent_id: e.target.value || null})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Keine (Hauptkategorie)</option>
                      {categories.filter(c => c.id !== editingCategory?.id && !c.parent_id).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder={selectedParentForSubcategory ? "z.B. Tablets" : "z.B. Hardware"}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Beschreibung
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Optionale Beschreibung..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    onClick={handleCloseCategoryModal}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    {editingCategory ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Kategorie *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {categories.map(cat => {
                        const categoryName = typeof cat === 'string' ? cat : cat.name;
                        const subcategories = cat.subcategories || [];
                        return (
                          <React.Fragment key={categoryName}>
                            <option value={categoryName}>{categoryName}</option>
                            {subcategories.map(subcat => (
                              <option key={subcat.id} value={subcat.name}>
                                └─ {subcat.name}
                              </option>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Barcode *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Einheit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Bestand *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.quantity_in_stock}
                      onChange={(e) => setFormData({...formData, quantity_in_stock: parseInt(e.target.value)})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Mindestbestand
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value)})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Product Image Upload */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Produktbild (JPG, PNG - max. 10MB)
                  </label>
                  
                  {formData.image_url ? (
                    <div className="relative">
                      <img 
                        src={formData.image_url} 
                        alt="Produkt" 
                        className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                        title="Bild entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      theme === 'dark' 
                        ? 'border-gray-700 bg-[#1a1a1a]' 
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={uploadingImage}
                      />
                      <label 
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <ImageIcon className={`h-12 w-12 mb-2 ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {uploadingImage ? 'Hochladen...' : 'Klicken Sie zum Hochladen'}
                        </span>
                        <span className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          JPG oder PNG (max. 10MB)
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    onClick={handleCloseModal}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    {editingItem ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
