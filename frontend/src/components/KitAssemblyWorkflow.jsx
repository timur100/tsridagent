import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Scan, Check, X, AlertTriangle, RefreshCw, Barcode, 
  CheckCircle, ArrowRight, Printer, QrCode, Plus, Trash2,
  ChevronRight, Box, Search, Tag
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Progress } from './ui/progress';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const KitAssemblyWorkflow = ({ theme, onRefreshStats }) => {
  const isDark = theme === 'dark';

  // Kit Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Assembly State
  const [assemblyMode, setAssemblyMode] = useState(false);
  const [scannedComponents, setScannedComponents] = useState([]);
  const [currentScan, setCurrentScan] = useState('');
  const [validating, setValidating] = useState(false);

  // Location for Kit
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  // Finalization
  const [finalizing, setFinalizing] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [kitLabelData, setKitLabelData] = useState(null);

  // Printer Settings
  const [printerIP, setPrinterIP] = useState(localStorage.getItem('labelPrinterIP') || '');
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerStatus, setPrinterStatus] = useState(null);
  const [testingPrinter, setTestingPrinter] = useState(false);

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch Kit Templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kit-templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
      toast.error('Fehler beim Laden der Kit-Vorlagen');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch Locations
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/locations?limit=500`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchLocations();
  }, [fetchTemplates, fetchLocations]);

  // Start Assembly for selected template
  const startAssembly = (template) => {
    setSelectedTemplate(template);
    setScannedComponents([]);
    setAssemblyMode(true);
    setCurrentScan('');
  };

  // Cancel Assembly
  const cancelAssembly = () => {
    if (scannedComponents.length > 0) {
      if (!window.confirm('Wollen Sie die Kit-Zusammenstellung wirklich abbrechen? Alle gescannten Komponenten werden verworfen.')) {
        return;
      }
    }
    setAssemblyMode(false);
    setSelectedTemplate(null);
    setScannedComponents([]);
    setCurrentScan('');
  };

  // Handle barcode scan
  const handleScan = async (e) => {
    if (e.key !== 'Enter' || !currentScan.trim()) return;
    
    const scannedValue = currentScan.trim();
    setCurrentScan('');
    setValidating(true);

    try {
      // First, check if this component was already scanned
      if (scannedComponents.some(c => c.manufacturer_sn === scannedValue || c.asset_id === scannedValue)) {
        toast.error('Diese Komponente wurde bereits gescannt');
        setValidating(false);
        return;
      }

      // Lookup the asset by serial number or asset_id
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/by-sn/${encodeURIComponent(scannedValue)}`);
      const data = await res.json();

      if (!data.success || !data.asset) {
        // Try looking up by asset_id
        const res2 = await fetch(`${BACKEND_URL}/api/asset-mgmt/assets?search=${encodeURIComponent(scannedValue)}&limit=1`);
        const data2 = await res2.json();
        
        if (!data2.success || !data2.assets || data2.assets.length === 0) {
          toast.error(`Gerät nicht gefunden: ${scannedValue}`);
          setValidating(false);
          return;
        }
        
        const asset = data2.assets[0];
        validateAndAddComponent(asset);
      } else {
        validateAndAddComponent(data.asset);
      }
    } catch (e) {
      console.error('Error validating scan:', e);
      toast.error('Fehler bei der Validierung');
    } finally {
      setValidating(false);
    }
  };

  // Validate component against template requirements
  const validateAndAddComponent = (asset) => {
    if (!selectedTemplate) return;

    // Check if this type is needed
    const neededTypes = selectedTemplate.components.map(c => c.type);
    const alreadyScannedTypes = scannedComponents.map(c => c.type);
    
    // Count how many of each type we need vs have
    const typeCount = {};
    neededTypes.forEach(t => { typeCount[t] = (typeCount[t] || 0) + 1; });
    
    const scannedTypeCount = {};
    alreadyScannedTypes.forEach(t => { scannedTypeCount[t] = (scannedTypeCount[t] || 0) + 1; });

    const assetType = asset.type;
    const neededOfThisType = typeCount[assetType] || 0;
    const alreadyHaveOfThisType = scannedTypeCount[assetType] || 0;

    if (neededOfThisType === 0) {
      toast.error(`Typ "${assetType}" wird für dieses Kit nicht benötigt`);
      return;
    }

    if (alreadyHaveOfThisType >= neededOfThisType) {
      toast.error(`Alle benötigten "${assetType}" wurden bereits gescannt`);
      return;
    }

    // Check if asset is already assigned to another kit
    if (asset.parent_kit_id) {
      toast.error(`Gerät ist bereits einem Kit zugewiesen: ${asset.parent_kit_id}`);
      return;
    }

    // Add the component
    const componentInfo = {
      ...asset,
      scanned_at: new Date().toISOString(),
      validated: true
    };

    setScannedComponents(prev => [...prev, componentInfo]);
    toast.success(`${asset.type_label || asset.type} hinzugefügt`);
  };

  // Remove scanned component
  const removeComponent = (index) => {
    setScannedComponents(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate progress
  const getProgress = () => {
    if (!selectedTemplate) return { percentage: 0, remaining: [] };
    
    const needed = {};
    selectedTemplate.components.forEach(c => {
      needed[c.type] = (needed[c.type] || 0) + c.quantity;
    });

    const have = {};
    scannedComponents.forEach(c => {
      have[c.type] = (have[c.type] || 0) + 1;
    });

    const totalNeeded = Object.values(needed).reduce((a, b) => a + b, 0);
    const totalHave = Object.values(have).reduce((a, b) => a + b, 0);
    
    const remaining = [];
    Object.entries(needed).forEach(([type, count]) => {
      const haveCount = have[type] || 0;
      if (haveCount < count) {
        remaining.push({ type, needed: count, have: haveCount });
      }
    });

    return {
      percentage: totalNeeded > 0 ? Math.round((totalHave / totalNeeded) * 100) : 0,
      remaining,
      isComplete: remaining.length === 0
    };
  };

  // Finalize Kit
  const finalizeKit = async () => {
    if (!selectedLocation) {
      toast.error('Bitte wählen Sie einen Standort aus');
      return;
    }

    const progress = getProgress();
    if (!progress.isComplete) {
      if (!window.confirm('Das Kit ist noch nicht vollständig. Trotzdem fortfahren?')) {
        return;
      }
    }

    setFinalizing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v2/kits/quick-assemble?technician=${encodeURIComponent(technician || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.template_id,
          location_id: selectedLocation,
          component_sns: scannedComponents.map(c => c.manufacturer_sn || c.asset_id)
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Kit erstellt: ${data.kit_id}`);
        setKitLabelData({
          asset_id: data.kit_id,
          type_label: selectedTemplate.name,
          manufacturer_sn: data.kit_id,
          location_name: locations.find(l => l.location_id === selectedLocation)?.city || selectedLocation,
          qr_content: data.kit_id,
          components: scannedComponents.length
        });
        setShowLabelModal(true);
        
        // Reset assembly
        setAssemblyMode(false);
        setSelectedTemplate(null);
        setScannedComponents([]);
        if (onRefreshStats) onRefreshStats();
      } else {
        toast.error(data.detail || 'Fehler beim Erstellen des Kits');
      }
    } catch (e) {
      console.error('Error finalizing kit:', e);
      toast.error('Fehler beim Finalisieren des Kits');
    } finally {
      setFinalizing(false);
    }
  };

  // Test Printer Connection
  const testPrinterConnection = async () => {
    if (!printerIP) {
      toast.error('Bitte IP-Adresse eingeben');
      return;
    }
    
    setTestingPrinter(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer_ip: printerIP, printer_port: 9100 })
      });
      const data = await res.json();
      setPrinterStatus(data);
      
      if (data.success) {
        localStorage.setItem('labelPrinterIP', printerIP);
        toast.success('Drucker verbunden');
      } else {
        toast.error(data.message || 'Drucker nicht erreichbar');
      }
    } catch (e) {
      console.error('Error testing printer:', e);
      toast.error('Verbindungsfehler');
      setPrinterStatus({ success: false, status: 'error' });
    } finally {
      setTestingPrinter(false);
    }
  };

  // Print Label
  const printLabel = async () => {
    if (!printerIP) {
      setShowPrinterSettings(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_ip: printerIP,
          printer_port: 9100,
          label: kitLabelData,
          copies: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Label gedruckt');
      } else {
        toast.error(data.detail || 'Druckfehler');
      }
    } catch (e) {
      console.error('Error printing:', e);
      toast.error('Druckfehler');
    }
  };

  const progress = getProgress();

  // Template Selection View
  if (!assemblyMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
              Kit-Zusammenstellung
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Wählen Sie eine Kit-Vorlage und scannen Sie die Komponenten
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowPrinterSettings(true)}
            className={printerStatus?.success ? 'border-green-500 text-green-500' : ''}
          >
            <Printer className="h-4 w-4 mr-2" />
            {printerIP ? `Drucker: ${printerIP.substring(0, 15)}...` : 'Drucker einrichten'}
          </Button>
        </div>

        {/* Template Grid */}
        {loadingTemplates ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : templates.length === 0 ? (
          <Card className={`p-12 text-center ${cardBg}`}>
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Keine Kit-Vorlagen vorhanden
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Erstellen Sie Kit-Vorlagen im Admin-Bereich
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card 
                key={template.template_id} 
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${cardBg} hover:border-blue-500`}
                onClick={() => startAssembly(template)}
                data-testid={`template-card-${template.template_id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${isDark ? 'text-white' : ''}`}>
                      {template.name}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {template.description || template.template_id}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.components?.slice(0, 4).map((comp, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {comp.quantity}x {comp.type}
                        </Badge>
                      ))}
                      {template.components?.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.components.length - 4} mehr
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Printer Settings Modal */}
        <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
          <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : ''}>
                Etikettendrucker einrichten
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
                  Drucker IP-Adresse
                </label>
                <Input
                  placeholder="z.B. 192.168.1.100"
                  value={printerIP}
                  onChange={(e) => setPrinterIP(e.target.value)}
                  className={inputBg}
                  data-testid="printer-ip-input"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Brother QL-820NWB - Netzwerkdruck auf Port 9100
                </p>
              </div>

              {printerStatus && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  printerStatus.success 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {printerStatus.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className={printerStatus.success ? 'text-green-500' : 'text-red-500'}>
                    {printerStatus.message}
                  </span>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrinterSettings(false)}>
                Schließen
              </Button>
              <Button 
                onClick={testPrinterConnection}
                disabled={testingPrinter || !printerIP}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testingPrinter ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Verbindung testen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Assembly Mode View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
            Kit zusammenstellen: {selectedTemplate?.name}
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Scannen Sie die benötigten Komponenten
          </p>
        </div>
        <Button variant="outline" onClick={cancelAssembly} className="text-red-500 border-red-500">
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
      </div>

      {/* Progress */}
      <Card className={`p-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : ''}>Fortschritt</span>
          <span className={`font-bold ${progress.isComplete ? 'text-green-500' : isDark ? 'text-white' : ''}`}>
            {progress.percentage}%
          </span>
        </div>
        <Progress value={progress.percentage} className="h-3" />
        
        {progress.remaining.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fehlend:</span>
            {progress.remaining.map((item, i) => (
              <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-500">
                {item.needed - item.have}x {item.type}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Scanner Input */}
      <Card className={`p-6 ${cardBg}`}>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
              Komponente scannen (Seriennummer oder Asset-ID)
            </label>
            <div className="relative">
              <Barcode className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <Input
                placeholder="Barcode scannen oder eingeben..."
                value={currentScan}
                onChange={(e) => setCurrentScan(e.target.value)}
                onKeyDown={handleScan}
                className={`pl-10 ${inputBg}`}
                data-testid="component-scan-input"
                autoFocus
                disabled={validating}
              />
              {validating && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        </div>

        {/* Scanned Components */}
        {scannedComponents.length > 0 && (
          <div className="mt-6">
            <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : ''}`}>
              Gescannte Komponenten ({scannedComponents.length})
            </h4>
            <div className="space-y-2">
              {scannedComponents.map((comp, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <span className={`font-mono ${isDark ? 'text-white' : ''}`}>
                        {comp.asset_id || comp.manufacturer_sn}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {comp.type_label || comp.type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeComponent(idx)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Location Selection & Finalize */}
      <Card className={`p-6 ${cardBg}`}>
        <h4 className={`font-medium mb-4 ${isDark ? 'text-white' : ''}`}>
          Kit finalisieren
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>
              Standort für das Kit *
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className={inputBg} data-testid="kit-location-select">
                <SelectValue placeholder="Standort wählen" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.location_id} value={loc.location_id}>
                    {loc.location_id} - {loc.city || loc.customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={finalizeKit}
              disabled={finalizing || scannedComponents.length === 0 || !selectedLocation}
              className={`w-full ${progress.isComplete ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
              data-testid="finalize-kit-btn"
            >
              {finalizing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {progress.isComplete ? 'Kit erstellen' : 'Unvollständiges Kit erstellen'}
            </Button>
          </div>
        </div>
        
        {!progress.isComplete && scannedComponents.length > 0 && (
          <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              Das Kit ist noch nicht vollständig. Sie können es trotzdem erstellen.
            </span>
          </div>
        )}
      </Card>

      {/* Kit Label Modal */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className={`max-w-sm ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Kit erstellt
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {kitLabelData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={kitLabelData.qr_content || kitLabelData.asset_id}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>
              
              {/* Label Info */}
              <div className={`space-y-2 text-center ${isDark ? 'text-gray-300' : ''}`}>
                <p className="text-2xl font-bold font-mono">
                  {kitLabelData.asset_id}
                </p>
                <p className="text-sm">
                  {kitLabelData.type_label}
                </p>
                <p className="text-xs text-gray-500">
                  {kitLabelData.components} Komponenten
                </p>
                <p className="text-xs text-gray-500">
                  {kitLabelData.location_name}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowLabelModal(false)}
                >
                  Schließen
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={printLabel}
                  data-testid="print-kit-label-btn"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KitAssemblyWorkflow;
