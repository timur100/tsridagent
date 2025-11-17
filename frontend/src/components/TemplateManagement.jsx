import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Edit2, Trash2, FileText, X, Save, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const TemplateManagement = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    article_number: '',
    description: '',
    customer_type: '',
    components: [],
    shop_enabled: false,
    shop_category: '',
    shop_display_name: '',
    shop_description: '',
    shop_priority: 0
  });

  useEffect(() => {
    fetchTemplates();
    fetchComponents();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/components/templates/list');
      if (result.success && result.data) {
        setTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setLoading(false);
    }
  };

  const fetchComponents = async () => {
    try {
      const result = await apiCall('/api/components/list');
      if (result.success && result.data) {
        setComponents(result.data.components || []);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        template_name: template.template_name,
        article_number: template.article_number || '',
        description: template.description || '',
        customer_type: template.customer_type || '',
        components: template.components || [],
        shop_enabled: template.shop_enabled || false,
        shop_category: template.shop_category || '',
        shop_display_name: template.shop_display_name || '',
        shop_description: template.shop_description || '',
        shop_priority: template.shop_priority || 0
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        template_name: '',
        article_number: '',
        description: '',
        customer_type: '',
        components: [],
        shop_enabled: false,
        shop_category: '',
        shop_display_name: '',
        shop_description: '',
        shop_priority: 0
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      article_number: '',
      description: '',
      customer_type: '',
      components: [],
      shop_enabled: false,
      shop_category: '',
      shop_display_name: '',
      shop_description: '',
      shop_priority: 0
    });
  };

  const handleAddComponent = () => {
    if (components.length === 0) {
      toast.error('Keine Komponenten verfügbar');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      components: [
        ...prev.components,
        { component_id: components[0].id, quantity: 1 }
      ]
    }));
  };

  const handleRemoveComponent = (index) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleComponentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: field === 'quantity' ? parseInt(value) || 1 : value } : comp
      )
    }));
  };

  const handleSubmit = async () => {
    if (!formData.template_name.trim()) {
      toast.error('Bitte geben Sie einen Vorlagennamen ein');
      return;
    }

    if (formData.components.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Komponente hinzu');
      return;
    }

    try {
      let result;
      if (editingTemplate) {
        result = await apiCall(`/api/components/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        result = await apiCall('/api/components/templates/create', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (result.success) {
        toast.success(editingTemplate ? 'Vorlage aktualisiert' : 'Vorlage erstellt');
        handleCloseModal();
        fetchTemplates();
      } else {
        toast.error(result.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Fehler beim Speichern der Vorlage');
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;

    try {
      const result = await apiCall(`/api/components/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Vorlage gelöscht');
        fetchTemplates();
      } else {
        toast.error(result.message || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Fehler beim Löschen der Vorlage');
    }
  };

  const getComponentName = (componentId) => {
    const component = components.find(c => c.id === componentId);
    return component ? component.name : 'Unbekannt';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Vorlagen-Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen und verwalten Sie Vorlagen für Standard-Komponenten-Sets
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center p-8">
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lädt...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
          <FileText className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Vorlagen vorhanden
          </p>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen Sie Ihre erste Vorlage, um Standard-Sets zu definieren
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Erste Vorlage erstellen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {template.template_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {template.customer_type && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {template.customer_type}
                      </span>
                    )}
                    {template.shop_enabled && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                      }`}>
                        🛒 Im Shop
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(template)}
                    className={`p-2 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {template.description && (
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {template.description}
                </p>
              )}

              <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Komponenten ({template.components?.length || 0})
                </p>
                <div className="space-y-1">
                  {template.components?.slice(0, 3).map((comp, index) => (
                    <div 
                      key={index}
                      className={`text-sm flex justify-between ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      <span className="truncate">{comp.component_name || 'Komponente'}</span>
                      <span className={`ml-2 font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {comp.quantity}x
                      </span>
                    </div>
                  ))}
                  {template.components && template.components.length > 3 && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{template.components.length - 3} weitere
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-3xl w-full rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
              </h2>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Template Name */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Vorlagen-Name *
                </label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Standard Set"
                />
              </div>

              {/* Article Number */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Artikelnummer
                </label>
                <input
                  type="text"
                  value={formData.article_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, article_number: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Wird automatisch generiert (NL-SET-XXX)"
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Optional - Wenn leer, wird automatisch NL-SET-XXX vergeben
                </p>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Optional"
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Kundentyp
                </label>
                <input
                  type="text"
                  value={formData.customer_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_type: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="z.B. Standard, Premium, etc."
                />
              </div>

              {/* Shop Settings Section */}
              <div className={`border-t pt-4 mt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-md font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Shop-Einstellungen
                </h3>

                {/* Shop Enabled */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shop_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, shop_enabled: e.target.checked }))}
                      className="rounded"
                    />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Im Shop anzeigen
                    </span>
                  </label>
                </div>

                {formData.shop_enabled && (
                  <div className="space-y-3 ml-6">
                    {/* Shop Category */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Shop-Kategorie
                      </label>
                      <select
                        value={formData.shop_category}
                        onChange={(e) => setFormData(prev => ({ ...prev, shop_category: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">Kategorie wählen</option>
                        <option value="airport">Airport / Wichtige Standorte</option>
                        <option value="corporate">Corporate</option>
                        <option value="agency">Agenturpartner</option>
                      </select>
                    </div>

                    {/* Shop Display Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Anzeigename im Shop
                      </label>
                      <input
                        type="text"
                        value={formData.shop_display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, shop_display_name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="z.B. Standard Scanner-Set"
                      />
                    </div>

                    {/* Shop Description */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Shop-Beschreibung
                      </label>
                      <textarea
                        value={formData.shop_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, shop_description: e.target.value }))}
                        rows="2"
                        className={`w-full px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Beschreibung für Kunden im Shop"
                      />
                    </div>

                    {/* Shop Priority */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Priorität (Sortierung)
                      </label>
                      <input
                        type="number"
                        value={formData.shop_priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, shop_priority: parseInt(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="0 = niedrigste Priorität"
                      />
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Höhere Werte werden zuerst angezeigt
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Components */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Komponenten *
                  </label>
                  <Button
                    type="button"
                    onClick={handleAddComponent}
                    size="sm"
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Hinzufügen
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.components.map((comp, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={comp.component_id}
                        onChange={(e) => handleComponentChange(index, 'component_id', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        {components.map((component) => (
                          <option key={component.id} value={component.id}>
                            {component.name} ({component.component_type})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={comp.quantity}
                        onChange={(e) => handleComponentChange(index, 'quantity', e.target.value)}
                        className={`w-20 px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(index)}
                        className="p-2 rounded hover:bg-red-100 text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {formData.components.length === 0 && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Keine Komponenten hinzugefügt
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="outline"
                className={`${
                  theme === 'dark'
                    ? 'border-gray-700 text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-100'
                }`}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;
