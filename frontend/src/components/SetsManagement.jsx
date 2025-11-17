import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Edit2, Trash2, Package, X, Save, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const SetsManagement = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [sets, setSets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    template_id: '',
    components: [],
    status: 'assembled',
    location_code: '',
    assigned_to: '',
    notes: ''
  });

  useEffect(() => {
    fetchSets();
    fetchTemplates();
    fetchComponents();
  }, []);

  const fetchSets = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/components/sets/list');
      if (result.success && result.data) {
        setSets(result.data.sets || []);
      }
    } catch (error) {
      console.error('Error fetching sets:', error);
      toast.error('Fehler beim Laden der Sets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const result = await apiCall('/api/components/templates/list');
      if (result.success && result.data) {
        setTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
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

  const handleOpenModal = (set = null) => {
    if (set) {
      setEditingSet(set);
      setFormData({
        template_id: set.template_id || '',
        components: set.components || [],
        status: set.status,
        location_code: set.location_code || '',
        assigned_to: set.assigned_to || '',
        notes: set.notes || ''
      });
    } else {
      setEditingSet(null);
      setFormData({
        template_id: templates.length > 0 ? templates[0].id : '',
        components: [],
        status: 'assembled',
        location_code: '',
        assigned_to: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSet(null);
    setFormData({
      template_id: '',
      components: [],
      status: 'assembled',
      location_code: '',
      assigned_to: '',
      notes: ''
    });
  };

  const handleLoadTemplate = () => {
    const template = templates.find(t => t.id === formData.template_id);
    if (!template) {
      toast.error('Vorlage nicht gefunden');
      return;
    }

    const templateComponents = template.components.map(comp => ({
      component_id: comp.component_id,
      component_name: comp.component_name || getComponentName(comp.component_id),
      quantity: comp.quantity || 1,
      serial_number: ''
    }));

    setFormData(prev => ({
      ...prev,
      components: templateComponents
    }));

    toast.success(`Vorlage "${template.template_name}" geladen`);
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
        {
          component_id: components[0].id,
          component_name: components[0].name,
          quantity: 1,
          serial_number: ''
        }
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
      components: prev.components.map((comp, i) => {
        if (i === index) {
          if (field === 'component_id') {
            const component = components.find(c => c.id === value);
            return {
              ...comp,
              component_id: value,
              component_name: component ? component.name : comp.component_name
            };
          }
          return {
            ...comp,
            [field]: field === 'quantity' ? parseInt(value) || 1 : value
          };
        }
        return comp;
      })
    }));
  };

  const handleSubmit = async () => {
    if (editingSet) {
      // Update existing set
      try {
        const result = await apiCall(`/api/components/sets/${editingSet.set_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: formData.status,
            location_code: formData.location_code,
            assigned_to: formData.assigned_to,
            notes: formData.notes
          })
        });

        if (result.success) {
          toast.success('Set aktualisiert');
          handleCloseModal();
          fetchSets();
        } else {
          toast.error(result.message || 'Fehler beim Aktualisieren');
        }
      } catch (error) {
        console.error('Error updating set:', error);
        toast.error(error.message || 'Fehler beim Aktualisieren des Sets');
      }
    } else {
      // Create new set
      if (formData.components.length === 0) {
        toast.error('Bitte fügen Sie mindestens eine Komponente hinzu');
        return;
      }

      try {
        const result = await apiCall('/api/components/sets/create', {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        if (result.success) {
          toast.success(`Set ${result.data.set_id} erfolgreich erstellt`);
          handleCloseModal();
          fetchSets();
        } else {
          toast.error(result.message || 'Fehler beim Erstellen');
        }
      } catch (error) {
        console.error('Error creating set:', error);
        toast.error(error.message || 'Fehler beim Erstellen des Sets');
      }
    }
  };

  const handleDelete = async (setId) => {
    if (!window.confirm('Möchten Sie dieses Set wirklich löschen? Die Komponenten werden zurück ins Lager gelegt.')) return;

    try {
      const result = await apiCall(`/api/components/sets/${setId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Set gelöscht und Bestand wiederhergestellt');
        fetchSets();
      } else {
        toast.error(result.message || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      toast.error(error.message || 'Fehler beim Löschen des Sets');
    }
  };

  const getComponentName = (componentId) => {
    const component = components.find(c => c.id === componentId);
    return component ? component.name : 'Unbekannt';
  };

  const getStatusLabel = (status) => {
    const labels = {
      assembled: 'Zusammengestellt',
      deployed: 'Bereitgestellt',
      in_storage: 'Im Lager',
      decommissioned: 'Außer Betrieb'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      assembled: 'bg-blue-900/30 text-blue-400',
      deployed: 'bg-green-900/30 text-green-400',
      in_storage: 'bg-gray-700 text-gray-300',
      decommissioned: 'bg-red-900/30 text-red-400'
    };
    return theme === 'dark' ? colors[status] : colors[status]?.replace('900/30', '100').replace('400', '700');
  };

  const filteredSets = filterStatus === 'all' 
    ? sets 
    : sets.filter(set => set.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Set-Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen und verwalten Sie zusammengestellte Komponenten-Sets
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Set
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Status Filter:
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`px-4 py-2 border rounded-lg ${
            theme === 'dark'
              ? 'bg-[#2d2d2d] border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">Alle</option>
          <option value="assembled">Zusammengestellt</option>
          <option value="deployed">Bereitgestellt</option>
          <option value="in_storage">Im Lager</option>
          <option value="decommissioned">Außer Betrieb</option>
        </select>
        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {filteredSets.length} Set(s)
        </span>
      </div>

      {/* Sets Grid */}
      {loading ? (
        <div className="text-center p-8">
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lädt...</p>
        </div>
      ) : filteredSets.length === 0 ? (
        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Sets vorhanden
          </p>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen Sie Ihr erstes Komponenten-Set
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Erstes Set erstellen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((set) => (
            <Card
              key={set.id}
              className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className={`text-lg font-bold font-mono mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {set.set_id}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(set.status)}`}>
                    {getStatusLabel(set.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(set)}
                    className={`p-2 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(set.set_id)}
                    className="p-2 rounded hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {set.location_code && (
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  📍 Standort: {set.location_code}
                </p>
              )}

              {set.assigned_to && (
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  👤 Zugewiesen: {set.assigned_to}
                </p>
              )}

              <div className={`border-t pt-4 mt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Komponenten ({set.components?.length || 0})
                </p>
                <div className="space-y-1">
                  {set.components?.slice(0, 3).map((comp, index) => (
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
                  {set.components && set.components.length > 3 && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{set.components.length - 3} weitere
                    </p>
                  )}
                </div>
              </div>

              {set.notes && (
                <p className={`text-xs mt-3 italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {set.notes}
                </p>
              )}
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
                {editingSet ? `Set bearbeiten: ${editingSet.set_id}` : 'Neues Set erstellen'}
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
              {!editingSet && (
                <>
                  {/* Template Selection */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Vorlage (Optional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.template_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">Keine Vorlage</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.template_name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={handleLoadTemplate}
                        disabled={!formData.template_id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Laden
                      </Button>
                    </div>
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
                            className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
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
                            placeholder="Anzahl"
                            className={`w-20 px-3 py-2 border rounded-lg text-sm ${
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
                </>
              )}

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="assembled">Zusammengestellt</option>
                  <option value="deployed">Bereitgestellt</option>
                  <option value="in_storage">Im Lager</option>
                  <option value="decommissioned">Außer Betrieb</option>
                </select>
              </div>

              {/* Location & Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Standort-Code
                  </label>
                  <input
                    type="text"
                    value={formData.location_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_code: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. LOC-001"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Zugewiesen an
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. Kunde XYZ"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Optional"
                />
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
                {editingSet ? 'Aktualisieren' : 'Set erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetsManagement;
