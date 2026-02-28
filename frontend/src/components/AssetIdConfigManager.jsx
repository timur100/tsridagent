import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Hash, 
  Tag,
  Warehouse,
  MapPin,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const AssetIdConfigManager = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [warehousePrefix, setWarehousePrefix] = useState('TSRID');
  const [counters, setCounters] = useState({});
  const [metadata, setMetadata] = useState(null);
  
  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAssetType, setResetAssetType] = useState(null);
  const [newCounterValue, setNewCounterValue] = useState(1);
  const [confirmResetText, setConfirmResetText] = useState('');
  
  // Load config and counters
  useEffect(() => {
    loadConfig();
    loadMetadata();
    loadCounters();
  }, []);
  
  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/asset-mgmt/asset-id-config');
      if (result.success) {
        setConfig(result.data?.config || result.config);
        setWarehousePrefix(result.data?.config?.warehouse_prefix || result.config?.warehouse_prefix || 'TSRID');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Fehler beim Laden der Konfiguration');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMetadata = async () => {
    try {
      const result = await apiCall('/api/asset-mgmt/metadata');
      if (result.success) {
        setMetadata(result.data || result);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };
  
  const loadCounters = async () => {
    try {
      // Load counters for common asset types
      const types = ['tab_tsr_i5', 'tab_tsr_i7', 'tab_sp4', 'tab_sp6', 'sca_tsr', 'sca_dsk'];
      const counterData = {};
      
      for (const type of types) {
        try {
          const result = await apiCall(`/api/asset-mgmt/asset-id-config/next-id?asset_type=${type}`);
          if (result.success) {
            const data = result.data || result;
            counterData[type] = {
              next_sequence: data.next_sequence,
              next_asset_id: data.next_asset_id,
              current_count: data.next_sequence - 1
            };
          }
        } catch (e) {
          counterData[type] = { next_sequence: 1, current_count: 0 };
        }
      }
      
      setCounters(counterData);
    } catch (error) {
      console.error('Error loading counters:', error);
    }
  };
  
  const handleSavePrefix = async () => {
    try {
      setSaving(true);
      const result = await apiCall('/api/asset-mgmt/asset-id-config', {
        method: 'PUT',
        body: JSON.stringify({
          tenant_id: 'default',
          warehouse_prefix: warehousePrefix
        })
      });
      
      if (result.success) {
        toast.success('Präfix gespeichert');
        loadConfig();
        loadCounters();
      }
    } catch (error) {
      console.error('Error saving prefix:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetCounter = async () => {
    if (!resetAssetType || confirmResetText !== 'ZURÜCKSETZEN') {
      toast.error('Bitte geben Sie ZURÜCKSETZEN ein um fortzufahren');
      return;
    }
    
    try {
      setSaving(true);
      const result = await apiCall('/api/asset-mgmt/asset-id-config/reset-counter', {
        method: 'POST',
        body: JSON.stringify({
          asset_type: resetAssetType.value,
          new_value: newCounterValue
        })
      });
      
      if (result.success) {
        toast.success(`Zähler für ${resetAssetType.label} zurückgesetzt auf ${newCounterValue}`);
        setShowResetModal(false);
        setResetAssetType(null);
        setNewCounterValue(1);
        setConfirmResetText('');
        loadCounters();
      }
    } catch (error) {
      console.error('Error resetting counter:', error);
      toast.error('Fehler beim Zurücksetzen des Zählers');
    } finally {
      setSaving(false);
    }
  };
  
  // Group asset types by category
  const assetTypeCategories = useMemo(() => {
    if (!metadata?.asset_type_categories) return {};
    return metadata.asset_type_categories;
  }, [metadata]);
  
  const formatsList = useMemo(() => {
    if (!config?.formats) return [];
    return config.formats;
  }, [config]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Asset-ID Konfiguration
          </h2>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie die automatische ID-Generierung für neue Geräte
          </p>
        </div>
        <Button 
          onClick={() => { loadConfig(); loadCounters(); }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>
      
      {/* Info Banner */}
      <Card className={`p-4 border-l-4 border-l-blue-500 ${theme === 'dark' ? 'bg-blue-900/30 border-gray-700' : 'bg-blue-50'}`}>
        <div className="flex items-start gap-3">
          <Info className={`h-5 w-5 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
          <div>
            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Wie funktioniert die ID-Generierung?
            </h4>
            <ul className={`mt-2 space-y-2 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-600'}`}>
              <li className="flex items-center gap-2 flex-wrap">
                <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Lager-ID:</strong>
                <code className={`px-2 py-1 rounded font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 text-green-400 border border-gray-600' : 'bg-gray-200 text-green-700'}`}>
                  {warehousePrefix}-TYP-0001
                </code>
                <span>- Wird beim Wareneingang vergeben</span>
              </li>
              <li className="flex items-center gap-2 flex-wrap">
                <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Standort-ID:</strong>
                <code className={`px-2 py-1 rounded font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 text-blue-400 border border-gray-600' : 'bg-gray-200 text-blue-700'}`}>
                  LOC01-01-TYP
                </code>
                <span>- Wird bei Standort-Zuweisung generiert</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
      
      <Tabs defaultValue="prefix" className="space-y-4">
        <TabsList className={`grid w-full grid-cols-3 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-gray-100'}`}>
          <TabsTrigger value="prefix" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Präfix
          </TabsTrigger>
          <TabsTrigger value="counters" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Zähler
          </TabsTrigger>
          <TabsTrigger value="formats" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Formate
          </TabsTrigger>
        </TabsList>
        
        {/* Prefix Tab */}
        <TabsContent value="prefix">
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Lager-ID Präfix
            </h3>
            <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Das Präfix wird allen neuen Geräten im Wareneingang vorangestellt.
            </p>
            
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="prefix" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  Präfix
                </Label>
                <Input
                  id="prefix"
                  value={warehousePrefix}
                  onChange={(e) => setWarehousePrefix(e.target.value.toUpperCase())}
                  placeholder="TSRID"
                  className={`mt-1 font-mono ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : ''}`}
                  maxLength={10}
                />
              </div>
              <Button 
                onClick={handleSavePrefix}
                disabled={saving || warehousePrefix === config?.warehouse_prefix}
                className="bg-[#d50c2d] hover:bg-[#b80a28] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
            
            {/* Preview */}
            <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Vorschau
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    TSRID Tablet i7:
                  </span>
                  <p className={`font-mono text-lg ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {warehousePrefix}-TAB-i7-0001
                  </p>
                </div>
                <div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Desko Scanner:
                  </span>
                  <p className={`font-mono text-lg ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {warehousePrefix}-SCA-DSK-0001
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Counters Tab */}
        <TabsContent value="counters">
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Sequenz-Zähler
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Zeigt den aktuellen Stand der automatischen Nummerierung pro Gerätetyp.
                </p>
              </div>
            </div>
            
            {/* Warning */}
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <strong>Hinweis:</strong> Die Zähler werden automatisch verwaltet. Ein manuelles Zurücksetzen kann zu doppelten IDs führen, wenn Geräte mit höheren Nummern bereits existieren.
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className={theme === 'dark' ? 'border-gray-700' : ''}>
                  <TableHead className={theme === 'dark' ? 'text-gray-400' : ''}>Gerätetyp</TableHead>
                  <TableHead className={theme === 'dark' ? 'text-gray-400' : ''}>Bereits erstellt</TableHead>
                  <TableHead className={theme === 'dark' ? 'text-gray-400' : ''}>Nächste ID</TableHead>
                  <TableHead className={`text-right ${theme === 'dark' ? 'text-gray-400' : ''}`}>Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(counters).map(([type, data]) => {
                  const typeLabel = metadata?.asset_type_labels?.[type] || type;
                  const typeSuffix = metadata?.asset_type_suffix_map?.[type] || 'OTH';
                  
                  return (
                    <TableRow key={type} className={theme === 'dark' ? 'border-gray-700' : ''}>
                      <TableCell>
                        <div>
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {typeLabel}
                          </span>
                          <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            ({typeSuffix})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={data.current_count > 0 ? 'default' : 'secondary'}>
                          {data.current_count} Geräte
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-[#3a3a3a] text-green-400' : 'bg-gray-100 text-green-600'}`}>
                          {data.next_asset_id || `${warehousePrefix}-${typeSuffix}-${String(data.next_sequence).padStart(4, '0')}`}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetAssetType({ value: type, label: typeLabel });
                            setNewCounterValue(data.next_sequence);
                            setShowResetModal(true);
                          }}
                          className={`${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Anpassen
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        {/* Formats Tab */}
        <TabsContent value="formats">
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ID-Formate nach Gerätetyp
            </h3>
            <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Diese Formate werden automatisch basierend auf dem Gerätetyp angewendet.
            </p>
            
            <div className="space-y-6">
              {Object.entries(assetTypeCategories).map(([category, types]) => (
                <div key={category}>
                  <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {types.map((type) => (
                      <div 
                        key={type.value}
                        className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {type.label}
                          </span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {type.suffix}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-3 w-3 text-gray-400" />
                            <code className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                              {warehousePrefix}-{type.suffix}-0001
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <code className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>
                              LOC01-01-{type.suffix}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Reset Counter Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className={theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : ''}>
              Zähler anpassen: {resetAssetType?.label}
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-gray-400' : ''}>
              Setzen Sie den Zähler auf einen neuen Wert. Die nächste generierte ID wird diese Nummer verwenden.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>
                Neuer Startwert
              </Label>
              <Input
                type="number"
                min={1}
                value={newCounterValue}
                onChange={(e) => setNewCounterValue(parseInt(e.target.value) || 1)}
                className={`mt-1 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : ''}`}
              />
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Nächste ID wird: {warehousePrefix}-{resetAssetType?.label ? metadata?.asset_type_suffix_map?.[resetAssetType.value] : 'TYP'}-{String(newCounterValue).padStart(4, '0')}
              </p>
            </div>
            
            {/* Warning */}
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
                  <strong>Warnung:</strong> Das Ändern des Zählers kann zu doppelten IDs führen, wenn bereits Geräte mit höheren Nummern existieren.
                </div>
              </div>
            </div>
            
            <div>
              <Label className={theme === 'dark' ? 'text-gray-300' : ''}>
                Bestätigung eingeben: <strong>ZURÜCKSETZEN</strong>
              </Label>
              <Input
                value={confirmResetText}
                onChange={(e) => setConfirmResetText(e.target.value.toUpperCase())}
                placeholder="ZURÜCKSETZEN"
                className={`mt-1 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : ''}`}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowResetModal(false);
                setConfirmResetText('');
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleResetCounter}
              disabled={saving || confirmResetText !== 'ZURÜCKSETZEN'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zähler anpassen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetIdConfigManager;
