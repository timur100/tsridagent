import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Edit2, Trash2, Box, Cpu, HardDrive, Cable, QrCode, AlertTriangle, Calculator, Tag, Boxes, FileText, Monitor, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ComponentModal from './ComponentModal';
import DemandCalculator from './DemandCalculator';
import TemplateManagement from './TemplateManagement';
import SetsManagement from './SetsManagement';
import toast from 'react-hot-toast';

const ComponentsManagement = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState('components'); // components, templates, sets, demand
  const [components, setComponents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showAddSetModal, setShowAddSetModal] = useState(false);
  const [showDemandCalculator, setShowDemandCalculator] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [componentStats, setComponentStats] = useState(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingComponentData, setEditingComponentData] = useState(null);

  // Fetch components
  const fetchComponents = async () => {
    try {
      setLoading(true);
      const result = await apiCall(`/api/components/list?low_stock_only=${lowStockOnly}&search=${searchTerm}`);
      if (result.success && result.data) {
        setComponents(result.data.components || []);
        setComponentStats(result.data.summary);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
      toast.error('Fehler beim Laden der Komponenten');
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates
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

  // Fetch sets
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

  // Load data based on active sub-tab
  useEffect(() => {
    if (activeSubTab === 'components') {
      fetchComponents();
    } else if (activeSubTab === 'templates') {
      fetchTemplates();
    } else if (activeSubTab === 'sets') {
      fetchSets();
    }
  }, [activeSubTab, lowStockOnly, searchTerm]);

  // Get icon for component type
  const getComponentIcon = (type) => {
    const iconMap = {
      pc: Monitor,
      tablet: Cpu,
      scanner: QrCode,
      docking_station: HardDrive,
      accessory: Cable
    };
    return iconMap[type] || Box;
  };

  // Get type label
  const getTypeLabel = (type) => {
    const labelMap = {
      pc: 'PC',
      tablet: 'Tablet',
      scanner: 'Scanner',
      docking_station: 'Docking Station',
      accessory: 'Zubehör'
    };
    return labelMap[type] || type;
  };

  // Delete component
  const handleDuplicateComponent = (component) => {
    // Create a copy of the component with cleared unique fields
    // IMPORTANT: Remove id completely so ComponentModal treats it as new
    const { id, created_at, updated_at, ...componentData } = component;
    
    const duplicatedComponent = {
      ...componentData,
      name: `${component.name} (Kopie)`,
      identification_value: '', // User must enter new serial/article number
      quantity_in_stock: 0, // Reset stock
    };
    
    setEditingComponentData(duplicatedComponent);
    setShowComponentModal(true);
    toast.info('Komponente dupliziert - Bitte neue Identifikation eingeben');
  };

  const handleDeleteComponent = async (componentId) => {
    if (!window.confirm('Möchten Sie diese Komponente wirklich löschen?')) return;
    
    try {
      const result = await apiCall(`/api/components/${componentId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Komponente erfolgreich gelöscht');
        fetchComponents();
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      toast.error(error.message || 'Fehler beim Löschen der Komponente');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;
    
    try {
      const result = await apiCall(`/api/components/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Vorlage erfolgreich gelöscht');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Fehler beim Löschen der Vorlage');
    }
  };

  // Delete set
  const handleDeleteSet = async (setId) => {
    if (!window.confirm('Möchten Sie dieses Set wirklich löschen? Die Komponenten werden zurück ins Lager gelegt.')) return;
    
    try {
      const result = await apiCall(`/api/components/sets/${setId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Set erfolgreich gelöscht und Bestand wiederhergestellt');
        fetchSets();
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      toast.error(error.message || 'Fehler beim Löschen des Sets');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Hardware-Komponenten Verwaltung
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Komponenten, Vorlagen und Sets
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {componentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {componentStats.total}
                </p>
              </div>
              <Box className={`h-10 w-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Niedriger Bestand</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {componentStats.low_stock}
                </p>
              </div>
              <AlertTriangle className={`h-10 w-10 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ausverkauft</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {componentStats.out_of_stock}
                </p>
              </div>
              <AlertTriangle className={`h-10 w-10 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Typen</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {componentStats.by_type ? Object.keys(componentStats.by_type).length : 0}
                </p>
              </div>
              <Boxes className={`h-10 w-10 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
          </Card>
        </div>
      )}

      {/* Sub-navigation */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <nav className="flex space-x-8">
          {[
            { id: 'components', label: 'Komponenten', icon: Box },
            { id: 'templates', label: 'Vorlagen', icon: FileText },
            { id: 'sets', label: 'Sets', icon: Boxes },
            { id: 'demand', label: 'Bedarfsermittlung', icon: Calculator }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === tab.id
                  ? 'border-[#c00000] text-[#c00000]'
                  : theme === 'dark'
                  ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === 'components' && (
        <div className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#2d2d2d] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded"
                />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  Nur niedriger Bestand
                </span>
              </label>
            </div>
            <Button
              onClick={() => {
                setEditingComponentData(null);
                setShowComponentModal(true);
              }}
              className="bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Komponente
            </Button>
          </div>

          {/* Components Table */}
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Typ</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Name</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Identifikation</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Hersteller</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Modell</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Bestand</th>
                  <th className={`text-left p-4 font-semibold font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Aktionen</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center p-8">
                        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lädt...</div>
                      </td>
                    </tr>
                  ) : components.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center p-8">
                        <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          Keine Komponenten gefunden
                        </div>
                      </td>
                    </tr>
                  ) : (
                    components.map((component) => {
                      const Icon = getComponentIcon(component.component_type);
                      return (
                        <tr
                          key={component.id}
                          className={`border-t cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                              <span className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {getTypeLabel(component.component_type)}
                              </span>
                            </div>
                          </td>
                          <td className={`p-4 text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {component.name}
                          </td>
                          <td className={`p-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <div>
                              <span className="font-mono text-xs">{component.identification_type}</span>
                              <div className="font-mono">{component.identification_value}</div>
                            </div>
                          </td>
                          <td className={`p-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {component.manufacturer || '-'}
                          </td>
                          <td className={`p-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {component.model || '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${
                                component.is_low_stock
                                  ? 'text-red-600'
                                  : theme === 'dark'
                                  ? 'text-white'
                                  : 'text-gray-900'
                              }`}>
                                {component.quantity_in_stock}
                              </span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {component.unit}
                              </span>
                              {component.is_low_stock && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingComponentData(component);
                                  setShowComponentModal(true);
                                }}
                                className={`p-1 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                                title="Bearbeiten"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateComponent(component)}
                                className={`p-1 rounded ${
                                  theme === 'dark' 
                                    ? 'hover:bg-blue-900/30 text-blue-400' 
                                    : 'hover:bg-blue-100 text-blue-600'
                                }`}
                                title="Duplizieren"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComponent(component.id)}
                                className={`p-1 rounded hover:bg-red-100 text-red-600`}
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const result = await apiCall('/api/components/generate-label', {
                                      method: 'POST',
                                      body: JSON.stringify({ component_id: component.id })
                                    });
                                    if (result.success) {
                                      toast.success('Label-Daten generiert');
                                      // Here you could integrate a QR code library to display the label
                                      console.log('Label data:', result.label);
                                    }
                                  } catch (error) {
                                    toast.error('Fehler beim Generieren des Labels');
                                  }
                                }}
                                className={`p-1 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                                title="Label generieren"
                              >
                                <Tag className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === 'templates' && (
        <TemplateManagement />
      )}

      {activeSubTab === 'sets' && (
        <SetsManagement />
      )}

      {activeSubTab === 'demand' && (
        <DemandCalculator />
      )}

      {/* Component Modal */}
      <ComponentModal
        isOpen={showComponentModal}
        onClose={() => {
          setShowComponentModal(false);
          setEditingComponentData(null);
        }}
        component={editingComponentData}
        onSuccess={() => {
          fetchComponents();
        }}
      />
    </div>
  );
};

export default ComponentsManagement;
