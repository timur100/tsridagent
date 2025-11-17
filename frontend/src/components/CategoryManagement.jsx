import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, MapPin, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { resetCategoriesCache } from '../utils/geoFilters';

const CategoryManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    keywords: [],
    icon: '📍',
    color: '#3b82f6',
    active: true,
    description: ''
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const result = await apiCall('/api/categories/list');
      console.log('Categories fetch result:', result);
      
      // Handle wrapped response (result.data.categories) or direct response (result.categories)
      let categoriesData = [];
      if (result && result.data && result.data.categories) {
        categoriesData = result.data.categories;
      } else if (result && result.categories) {
        categoriesData = result.categories;
      }
      
      console.log('Categories data:', categoriesData);
      setCategories(categoriesData);
      setInitialized(categoriesData && categoriesData.length > 0);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Fehler beim Laden der Kategorien');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultCategories = async () => {
    try {
      const result = await apiCall('/api/categories/initialize', { method: 'POST' });
      console.log('Initialize result:', result);
      
      const responseData = result?.data || result;
      if (responseData && responseData.success) {
        toast.success(responseData.message);
        resetCategoriesCache(); // Cache zurücksetzen
        fetchCategories();
      } else {
        toast.error(responseData?.message || 'Fehler bei der Initialisierung');
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
      toast.error('Fehler bei der Initialisierung');
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      id: '',
      name: '',
      keywords: [],
      icon: '📍',
      color: '#3b82f6',
      active: true,
      description: ''
    });
    setKeywordInput('');
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      keywords: category.keywords || [],
      icon: category.icon || '📍',
      color: category.color || '#3b82f6',
      active: category.active !== undefined ? category.active : true,
      description: category.description || ''
    });
    setKeywordInput('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id || !formData.name) {
      toast.error('Bitte ID und Name ausfüllen');
      return;
    }

    try {
      const endpoint = editingCategory 
        ? `/api/categories/update/${editingCategory.id}`
        : '/api/categories/create';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const result = await apiCall(endpoint, {
        method,
        body: JSON.stringify(formData)
      });

      const responseData = result?.data || result;
      if (responseData && responseData.success) {
        toast.success(responseData.message);
        setShowModal(false);
        resetCategoriesCache(); // Cache zurücksetzen für neue Kategorien
        fetchCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Kategorie "${category.name}" wirklich löschen?`)) {
      return;
    }

    try {
      const result = await apiCall(`/api/categories/delete/${category.id}`, {
        method: 'DELETE'
      });

      const responseData = result?.data || result;
      if (responseData && responseData.success) {
        toast.success('Kategorie gelöscht');
        resetCategoriesCache(); // Cache zurücksetzen
        fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Fehler beim Löschen');
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    
    const newKeyword = keywordInput.trim().toUpperCase();
    if (!formData.keywords.includes(newKeyword)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, newKeyword]
      });
    }
    setKeywordInput('');
  };

  const removeKeyword = (keyword) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[#c00000]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Standort-Kategorien
          </h2>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Kategorien für besondere Standorte (z.B. Flughäfen, Bahnhöfe)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Kategorie
        </button>
      </div>

      {/* Info Box */}
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className={`font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
              Automatische Erkennung
            </p>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>
              Kategorien werden automatisch anhand von Keywords im Standortnamen erkannt. 
              Beispiel: Ein Standort mit "FLUGHAFEN" im Namen wird automatisch als "Airport" kategorisiert.
            </p>
          </div>
        </div>
      </div>

      {/* Initialize Button (if no categories) */}
      {!initialized && categories.length === 0 && (
        <div className={`p-6 rounded-lg text-center ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-gray-50'}`}>
          <MapPin className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Kategorien vorhanden
          </p>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Initialisieren Sie die Standard-Kategorien oder erstellen Sie eigene
          </p>
          <button
            onClick={initializeDefaultCategories}
            className="px-6 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
          >
            Standard-Kategorien laden
          </button>
        </div>
      )}

      {/* Categories Grid */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`rounded-xl p-6 border-2 transition-all ${
                category.active
                  ? theme === 'dark'
                    ? 'bg-[#2d2d2d] border-gray-700'
                    : 'bg-white border-gray-200'
                  : 'opacity-50'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div>
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {category.name}
                    </h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      ID: {category.id}
                    </p>
                  </div>
                </div>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
              </div>

              {/* Description */}
              {category.description && (
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {category.description}
                </p>
              )}

              {/* Keywords */}
              <div className="mb-4">
                <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Keywords:
                </p>
                <div className="flex flex-wrap gap-1">
                  {category.keywords && category.keywords.length > 0 ? (
                    category.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{ 
                          backgroundColor: `${category.color}20`,
                          color: category.color
                        }}
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Keine Keywords
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                {category.active ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      Aktiv
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                      Inaktiv
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div 
            className={`rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingCategory ? 'Kategorie Bearbeiten' : 'Neue Kategorie'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ID */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kategorie-ID * {editingCategory && '(nicht änderbar)'}
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  disabled={!!editingCategory}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${editingCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="z.B. airport, mainstation"
                  required
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Nur Kleinbuchstaben, Zahlen und Unterstriche
                </p>
              </div>

              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Anzeige-Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Airport / Wichtige Standorte"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={2}
                  placeholder="Optionale Beschreibung"
                />
              </div>

              {/* Icon & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="📍"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Farbe (Hex)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className={`flex-1 px-4 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Keywords (für automatische Erkennung)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    className={`flex-1 px-4 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. FLUGHAFEN, AIRPORT"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 text-[#c00000] rounded"
                />
                <label htmlFor="active" className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kategorie aktiv
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000]"
                >
                  <Save className="h-5 w-5" />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
