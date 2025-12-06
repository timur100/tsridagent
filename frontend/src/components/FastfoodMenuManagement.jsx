import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Plus, Edit, Trash2, Save, X, Upload, Image as ImageIcon,
  UtensilsCrossed, Tag, DollarSign, Clock, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const FastfoodMenuManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const { selectedTenant } = useTenant();
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    name_en: '',
    description: '',
    icon: '🍔',
    display_order: 0
  });
  
  const [productForm, setProductForm] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    category_id: '',
    price: 0,
    image_url: '',
    allergens: [],
    preparation_time: 5
  });

  useEffect(() => {
    if (selectedTenant) {
      loadCategories();
      loadProducts();
    }
  }, [selectedTenant]);

  const loadCategories = async () => {
    try {
      const result = await apiCall(`/api/fastfood/categories?tenant_id=${selectedTenant.id}`);
      if (result.success) {
        setCategories(result.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const result = await apiCall(`/api/fastfood/products?tenant_id=${selectedTenant.id}&available_only=false`);
      if (result.success) {
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name) {
        toast.error('Bitte geben Sie einen Namen ein');
        return;
      }

      if (editingCategory) {
        await apiCall(`/api/fastfood/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(categoryForm)
        });
        toast.success('Kategorie aktualisiert');
      } else {
        await apiCall(`/api/fastfood/categories?tenant_id=${selectedTenant.id}`, {
          method: 'POST',
          body: JSON.stringify(categoryForm)
        });
        toast.success('Kategorie erstellt');
      }

      setShowCategoryModal(false);
      setCategoryForm({ name: '', name_en: '', description: '', icon: '🍔', display_order: 0 });
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (!productForm.name || !productForm.category_id || productForm.price <= 0) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        preparation_time: parseInt(productForm.preparation_time),
        available: true
      };

      if (editingProduct) {
        await apiCall(`/api/fastfood/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productData)
        });
        toast.success('Produkt aktualisiert');
      } else {
        await apiCall(`/api/fastfood/products?tenant_id=${selectedTenant.id}`, {
          method: 'POST',
          body: JSON.stringify(productData)
        });
        toast.success('Produkt erstellt');
      }

      setShowProductModal(false);
      resetProductForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Kategorie wirklich löschen?')) return;
    
    try {
      await apiCall(`/api/fastfood/categories/${categoryId}`, { method: 'DELETE' });
      toast.success('Kategorie gelöscht');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Produkt wirklich löschen?')) return;
    
    try {
      await apiCall(`/api/fastfood/products/${productId}`, { method: 'DELETE' });
      toast.success('Produkt gelöscht');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleToggleProductAvailability = async (product) => {
    try {
      await apiCall(`/api/fastfood/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...product,
          available: !product.available
        })
      });
      toast.success(product.available ? 'Produkt deaktiviert' : 'Produkt aktiviert');
      loadProducts();
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      name_en: '',
      description: '',
      description_en: '',
      category_id: '',
      price: 0,
      image_url: '',
      allergens: [],
      preparation_time: 5
    });
    setEditingProduct(null);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const commonAllergens = [
    'Gluten', 'Milch', 'Eier', 'Nüsse', 'Erdnüsse', 
    'Soja', 'Fisch', 'Meeresfrüchte', 'Sellerie', 'Senf'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Menü-Verwaltung
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Kategorien und Produkte für {selectedTenant?.display_name || 'Restaurant'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', name_en: '', description: '', icon: '🍔', display_order: 0 });
              setShowCategoryModal(true);
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Kategorie
          </Button>
          <Button
            onClick={() => {
              resetProductForm();
              setShowProductModal(true);
            }}
            className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Plus className="h-4 w-4" />
            Produkt
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setSelectedCategory(null)}
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
        >
          Alle Produkte ({products.length})
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
          >
            {cat.icon} {cat.name} ({products.filter(p => p.category_id === cat.id).length})
          </Button>
        ))}
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Kategorien ({categories.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(category => (
            <Card
              key={category.id}
              className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryForm({
                        name: category.name,
                        name_en: category.name_en || '',
                        description: category.description || '',
                        icon: category.icon || '🍔',
                        display_order: category.display_order || 0
                      });
                      setShowCategoryModal(true);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteCategory(category.id)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Produkte ({filteredProducts.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className={`overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} ${
                !product.available ? 'opacity-60' : ''
              }`}
            >
              {/* Product Image */}
              <div className={`h-40 flex items-center justify-center ${
                theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
              }`}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className={`h-16 w-16 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {product.description}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleToggleProductAvailability(product)}
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                  >
                    {product.available ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      €{product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {product.preparation_time} min
                    </span>
                  </div>
                </div>

                {product.allergens && product.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.allergens.map((allergen, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditingProduct(product);
                      setProductForm({
                        name: product.name,
                        name_en: product.name_en || '',
                        description: product.description || '',
                        description_en: product.description_en || '',
                        category_id: product.category_id,
                        price: product.price,
                        image_url: product.image_url || '',
                        allergens: product.allergens || [],
                        preparation_time: product.preparation_time || 5
                      });
                      setShowProductModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                  <Button
                    onClick={() => handleDeleteProduct(product.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className={`w-full max-w-md p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name (DE) *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name (EN)
                </label>
                <input
                  type="text"
                  value={categoryForm.name_en}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-2xl ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beschreibung
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveCategory}
                  className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <Card className={`w-full max-w-2xl p-6 m-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name (DE) *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name (EN)
                </label>
                <input
                  type="text"
                  value={productForm.name_en}
                  onChange={(e) => setProductForm({ ...productForm, name_en: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beschreibung (DE)
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kategorie *
                </label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">-- Kategorie wählen --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Preis (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zubereitungszeit (Min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={productForm.preparation_time}
                  onChange={(e) => setProductForm({ ...productForm, preparation_time: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bild URL
                </label>
                <input
                  type="url"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="https://..."
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Allergene
                </label>
                <div className="flex flex-wrap gap-2">
                  {commonAllergens.map(allergen => (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => {
                        const current = productForm.allergens || [];
                        if (current.includes(allergen)) {
                          setProductForm({
                            ...productForm,
                            allergens: current.filter(a => a !== allergen)
                          });
                        } else {
                          setProductForm({
                            ...productForm,
                            allergens: [...current, allergen]
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        (productForm.allergens || []).includes(allergen)
                          ? 'bg-orange-600 text-white'
                          : theme === 'dark'
                          ? 'bg-[#1a1a1a] text-gray-400 border border-gray-700'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {allergen}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                onClick={handleSaveProduct}
                className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button
                onClick={() => {
                  setShowProductModal(false);
                  resetProductForm();
                }}
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FastfoodMenuManagement;
