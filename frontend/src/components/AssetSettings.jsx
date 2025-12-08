import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Settings, Cpu, Package, Key, BarChart3, 
  Plus, Edit2, Trash2, Save, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmojiPicker from './EmojiPicker';

const AssetSettings = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeTab, setActiveTab] = useState('asset-ids'); // asset-ids, categories, templates, rules
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Asset ID Configuration
  const [assetIdConfig, setAssetIdConfig] = useState({
    prefix: '',
    pattern: '',
    start_number: 1,
    padding: 5,
    separator: '-',
    include_category: true,
    include_location: false,
    include_year: false
  });

  // Categories State
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    short_code: '',
    type: 'hardware',
    description: '',
    icon: ''
  });

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category_id: '',
    fields: [],
    description: ''
  });

  // Rules State
  const [rules, setRules] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'warranty', // warranty, maintenance, lifecycle, compliance
    condition: '',
    action: '',
    enabled: true
  });

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadAssetIdConfig();
      loadCategories();
      loadTemplates();
      loadRules();
    }
  }, [selectedTenantId]);

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

  const loadAssetIdConfig = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/config`);
      if (result.success && result.data) {
        setAssetIdConfig(result.data);
      }
    } catch (error) {
      console.error('Error loading asset config:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/categories`);
      if (result.success) {
        const data = result.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const loadDemoData = async () => {
    console.log('[AssetSettings] loadDemoData called');
    
    if (!window.confirm('Demo-Daten laden? Vorhandene Daten bleiben erhalten.')) {
      console.log('[AssetSettings] User cancelled demo data load');
      return;
    }
    
    console.log('[AssetSettings] Starting demo data creation...');
    
    try {
      const toastId = toast.loading('Demo-Daten werden erstellt...');

      // Create demo categories
      console.log('[AssetSettings] Creating 6 demo categories...');
      const demoCategories = [
        { name: 'Computer', short_code: 'PC', type: 'hardware', description: 'Desktop & Laptop Computer', icon: '💻' },
        { name: 'Monitor', short_code: 'MON', type: 'hardware', description: 'Bildschirme & Displays', icon: '🖥️' },
        { name: 'Drucker', short_code: 'PRT', type: 'hardware', description: 'Drucker & Scanner', icon: '🖨️' },
        { name: 'Mobilgerät', short_code: 'MOB', type: 'hardware', description: 'Smartphones & Tablets', icon: '📱' },
        { name: 'Betriebssystem', short_code: 'OS', type: 'software', description: 'Windows, Linux, MacOS', icon: '💿' },
        { name: 'Office Suite', short_code: 'OFF', type: 'software', description: 'Microsoft Office, LibreOffice', icon: '📝' }
      ];

      for (const category of demoCategories) {
        const result = await apiCall(`/api/assets/${selectedTenantId}/categories`, 'POST', category);
        console.log(`[AssetSettings] Created category: ${category.name}`, result);
      }

      // Create demo template
      console.log('[AssetSettings] Creating demo template...');
      const categories = await apiCall(`/api/assets/${selectedTenantId}/categories`);
      console.log('[AssetSettings] Fetched categories for template:', categories);
      
      if (categories.success && categories.data && categories.data.length > 0) {
        const pcCategory = categories.data.find(c => c.short_code === 'PC');
        if (pcCategory) {
          const templateResult = await apiCall(`/api/assets/${selectedTenantId}/templates`, 'POST', {
            name: 'Standard Laptop',
            category_id: pcCategory.id,
            fields: ['CPU', 'RAM', 'SSD', 'Display', 'Betriebssystem'],
            description: 'Standard Büro-Laptop Konfiguration'
          });
          console.log('[AssetSettings] Created template:', templateResult);
        }
      }

      // Create demo rules
      console.log('[AssetSettings] Creating 3 demo rules...');
      const demoRules = [
        { name: 'Garantie-Warnung', type: 'warranty', condition: '30 Tage vor Ablauf', action: 'E-Mail Benachrichtigung senden', enabled: true },
        { name: 'Wartungs-Intervall', type: 'maintenance', condition: 'Alle 6 Monate', action: 'Wartungsticket erstellen', enabled: true },
        { name: 'Lifecycle-Check', type: 'lifecycle', condition: 'Nach 5 Jahren', action: 'Als veraltet markieren', enabled: false }
      ];

      for (const rule of demoRules) {
        const ruleResult = await apiCall(`/api/assets/${selectedTenantId}/rules`, 'POST', rule);
        console.log(`[AssetSettings] Created rule: ${rule.name}`, ruleResult);
      }

      toast.dismiss();
      toast.success('6 Kategorien, 1 Vorlage und 3 Regeln erstellt!');
      console.log('[AssetSettings] Demo data creation completed!');
      
      // Small delay to ensure DB write completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload all data
      console.log('[AssetSettings] Reloading all data...');
      await loadCategories();
      await loadTemplates();
      await loadRules();
      
      console.log('[AssetSettings] Data reloaded, categories state:', categories.length);
      
      // Switch to categories tab to show results
      console.log('[AssetSettings] Switching to categories tab');
      setActiveTab('categories');
    } catch (error) {
      console.error('[AssetSettings] Error loading demo data:', error);
      toast.dismiss();
      toast.error('Fehler beim Laden der Demo-Daten: ' + error.message);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/templates`);
      if (result.success) {
        const data = result.data || [];
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const loadRules = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/rules`);
      if (result.success) {
        const data = result.data || [];
        setRules(Array.isArray(data) ? data : []);
      } else {
        setRules([]);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
      setRules([]);
    }
  };

  const saveAssetIdConfig = async () => {
    try {
      const result = await apiCall(`/api/assets/${selectedTenantId}/config`, 'POST', assetIdConfig);
      if (result.success) {
        toast.success('Konfiguration gespeichert');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving asset config:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  // Category Functions
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm(category);
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', short_code: '', type: 'hardware', description: '', icon: '' });
    }
    setShowCategoryModal(true);
  };

  const saveCate = async () => {
    try {
      if (editingCategory) {
        const result = await apiCall(`/api/assets/${selectedTenantId}/categories/${editingCategory.id}`, 'PUT', categoryForm);
        if (result.success) {
          toast.success('Kategorie aktualisiert');
          loadCategories();
        }
      } else {
        const result = await apiCall(`/api/assets/${selectedTenantId}/categories`, 'POST', categoryForm);
        if (result.success) {
          toast.success('Kategorie erstellt');
          loadCategories();
        }
      }
      setShowCategoryModal(false);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const deleteCategory = async (id) => {
    if (window.confirm('Kategorie wirklich löschen?')) {
      try {
        const result = await apiCall(`/api/assets/${selectedTenantId}/categories/${id}`, 'DELETE');
        if (result.success) {
          toast.success('Kategorie gelöscht');
          loadCategories();
        }
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  // Template Functions
  const openTemplateModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm(template);
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', category_id: '', fields: [], description: '' });
    }
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    try {
      if (editingTemplate) {
        const result = await apiCall(`/api/assets/${selectedTenantId}/templates/${editingTemplate.id}`, 'PUT', templateForm);
        if (result.success) {
          toast.success('Vorlage aktualisiert');
          loadTemplates();
        }
      } else {
        const result = await apiCall(`/api/assets/${selectedTenantId}/templates`, 'POST', templateForm);
        if (result.success) {
          toast.success('Vorlage erstellt');
          loadTemplates();
        }
      }
      setShowTemplateModal(false);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const deleteTemplate = async (id) => {
    if (window.confirm('Vorlage wirklich löschen?')) {
      try {
        const result = await apiCall(`/api/assets/${selectedTenantId}/templates/${id}`, 'DELETE');
        if (result.success) {
          toast.success('Vorlage gelöscht');
          loadTemplates();
        }
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  // Rule Functions
  const openRuleModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm(rule);
    } else {
      setEditingRule(null);
      setRuleForm({ name: '', type: 'warranty', condition: '', action: '', enabled: true });
    }
    setShowRuleModal(true);
  };

  const saveRule = async () => {
    try {
      if (editingRule) {
        const result = await apiCall(`/api/assets/${selectedTenantId}/rules/${editingRule.id}`, 'PUT', ruleForm);
        if (result.success) {
          toast.success('Regel aktualisiert');
          loadRules();
        }
      } else {
        const result = await apiCall(`/api/assets/${selectedTenantId}/rules`, 'POST', ruleForm);
        if (result.success) {
          toast.success('Regel erstellt');
          loadRules();
        }
      }
      setShowRuleModal(false);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const deleteRule = async (id) => {
    if (window.confirm('Regel wirklich löschen?')) {
      try {
        const result = await apiCall(`/api/assets/${selectedTenantId}/rules/${id}`, 'DELETE');
        if (result.success) {
          toast.success('Regel gelöscht');
          loadRules();
        }
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  const toggleRule = async (id) => {
    try {
      const rule = rules.find(r => r.id === id);
      if (rule) {
        const updatedRule = { ...rule, enabled: !rule.enabled };
        const result = await apiCall(`/api/assets/${selectedTenantId}/rules/${id}`, 'PUT', updatedRule);
        if (result.success) {
          toast.success('Regel-Status aktualisiert');
          loadRules();
        }
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getExampleAssetId = () => {
    const { prefix, separator, padding, include_category, include_location, include_year } = assetIdConfig;
    let example = prefix || 'ASSET';
    
    if (include_year) {
      example += separator + new Date().getFullYear();
    }
    
    if (include_category) {
      example += separator + 'HW';
    }
    
    if (include_location) {
      example += separator + 'LOC1';
    }
    
    example += separator + String(1).padStart(padding, '0');
    
    return example;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Card className={`p-1 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActiveTab('asset-ids'); }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'asset-ids'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            type="button"
          >
            <Settings className="h-5 w-5" />
            Asset-IDs
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActiveTab('categories'); }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            type="button"
          >
            <Package className="h-5 w-5" />
            Asset-Kategorien
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActiveTab('templates'); }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            type="button"
          >
            <Cpu className="h-5 w-5" />
            Vorlagen
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActiveTab('rules'); }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            type="button"
          >
            <Key className="h-5 w-5" />
            Regeln
          </button>
        </div>
      </Card>

      {/* Tenant Selection */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <Building2 className="h-5 w-5 text-[#c00000]" />
          <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Tenant auswählen:
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
          {selectedTenantId && (
            <Button
              onClick={loadDemoData}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              📦 Demo-Daten laden
            </Button>
          )}
        </div>
      </Card>

      {/* Tab Content */}
      {!selectedTenantId ? (
        <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="text-center">
            <Building2 className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Bitte wählen Sie einen Tenant aus
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Asset IDs Tab */}
          {activeTab === 'asset-ids' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <div className="space-y-6">
                <div>
                  <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Asset-ID Konfiguration
                  </h4>
                  <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Definieren Sie das Format und die Struktur Ihrer Asset-IDs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prefix */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Präfix
                    </label>
                    <input
                      type="text"
                      value={assetIdConfig.prefix}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, prefix: e.target.value})}
                      placeholder="z.B. ASSET, PC, MON"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Separator */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Trennzeichen
                    </label>
                    <input
                      type="text"
                      value={assetIdConfig.separator}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, separator: e.target.value})}
                      placeholder="-"
                      maxLength={1}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Start Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Startnummer
                    </label>
                    <input
                      type="number"
                      value={assetIdConfig.start_number}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, start_number: parseInt(e.target.value)})}
                      min="1"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Padding */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Ziffern (Padding)
                    </label>
                    <input
                      type="number"
                      value={assetIdConfig.padding}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, padding: parseInt(e.target.value)})}
                      min="1"
                      max="10"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_category}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_category: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Kategorie einbeziehen (z.B. HW, SW)</span>
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_location}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_location: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Standort einbeziehen</span>
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <input
                      type="checkbox"
                      checked={assetIdConfig.include_year}
                      onChange={(e) => setAssetIdConfig({...assetIdConfig, include_year: e.target.checked})}
                      className="h-5 w-5"
                    />
                    <span>Jahr einbeziehen</span>
                  </label>
                </div>

                {/* Example */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Beispiel Asset-ID:
                  </label>
                  <code className={`text-lg font-mono ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {getExampleAssetId()}
                  </code>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={saveAssetIdConfig}
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Konfiguration speichern
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Asset Categories Tab */}
          {activeTab === 'categories' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Asset-Kategorien
                  </h4>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {categories.length} Kategorien ({categories.filter(c => c.type === 'hardware').length} Hardware, {categories.filter(c => c.type === 'software').length} Software)
                  </p>
                </div>
                <Button
                  onClick={() => openCategoryModal()}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Kategorie
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(category => (
                  <Card key={category.id} className={`p-4 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-3xl">{category.icon}</div>
                        <div className="flex-1">
                          <h5 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {category.name}
                          </h5>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            Kürzel: {category.short_code} • Typ: {category.type === 'hardware' ? 'Hardware' : 'Software'}
                          </p>
                          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className={`p-2 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className={`p-2 rounded hover:bg-red-100 ${theme === 'dark' ? 'hover:bg-red-900' : ''}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Category Modal */}
              {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <Card className={`p-6 w-full max-w-md ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
                    <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-[#1f1f1f] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          placeholder="z.B. Computer"
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Kürzel
                        </label>
                        <input
                          type="text"
                          value={categoryForm.short_code}
                          onChange={(e) => setCategoryForm({...categoryForm, short_code: e.target.value})}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-[#1f1f1f] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          placeholder="z.B. PC"
                          maxLength={5}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Typ
                        </label>
                        <select
                          value={categoryForm.type}
                          onChange={(e) => setCategoryForm({...categoryForm, type: e.target.value})}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-[#1f1f1f] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="hardware">Hardware</option>
                          <option value="software">Software</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Icon (Emoji)
                        </label>
                        <EmojiPicker
                          value={categoryForm.icon}
                          onChange={(emoji) => setCategoryForm({...categoryForm, icon: emoji})}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Beschreibung
                        </label>
                        <textarea
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-[#1f1f1f] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          rows={3}
                          placeholder="Kurze Beschreibung"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <Button
                        onClick={saveCate}
                        className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Speichern
                      </Button>
                      <Button
                        onClick={() => setShowCategoryModal(false)}
                        variant="outline"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Asset-Vorlagen
                  </h4>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {templates.length} Vorlagen verfügbar
                  </p>
                </div>
                <Button
                  onClick={() => openTemplateModal()}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Vorlage
                </Button>
              </div>

              <div className="space-y-4">
                {templates.map(template => {
                  const category = categories.find(c => c.id === template.category_id);
                  return (
                    <Card key={template.id} className={`p-4 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-[#c00000]" />
                            <h5 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {template.name}
                            </h5>
                            {category && (
                              <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                {category.icon} {category.name}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {template.fields.map((field, idx) => (
                              <span key={idx} className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openTemplateModal(template)}
                            className={`p-2 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className={`p-2 rounded hover:bg-red-100 ${theme === 'dark' ? 'hover:bg-red-900' : ''}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Asset-Regeln
                  </h4>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {rules.length} Regeln ({rules.filter(r => r.enabled).length} aktiv)
                  </p>
                </div>
                <Button
                  onClick={() => openRuleModal()}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Regel
                </Button>
              </div>

              <div className="space-y-4">
                {rules.map(rule => {
                  const typeColors = {
                    warranty: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                    maintenance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    lifecycle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                    compliance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  };

                  return (
                    <Card key={rule.id} className={`p-4 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={() => toggleRule(rule.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {rule.name}
                              </h5>
                              <span className={`text-xs px-2 py-1 rounded ${typeColors[rule.type]}`}>
                                {rule.type === 'warranty' ? 'Garantie' : 
                                 rule.type === 'maintenance' ? 'Wartung' :
                                 rule.type === 'lifecycle' ? 'Lifecycle' : 'Compliance'}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span className="font-medium">Bedingung:</span> {rule.condition}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span className="font-medium">Aktion:</span> {rule.action}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openRuleModal(rule)}
                            className={`p-2 rounded hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className={`p-2 rounded hover:bg-red-100 ${theme === 'dark' ? 'hover:bg-red-900' : ''}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AssetSettings;
