import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  Save, Trash2, Plus, Eye, Printer, RotateCcw, 
  QrCode, BarChart3, Type, Image, Minus, Copy,
  Settings, FileText, Download, Upload, Check
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import { printAssetLabelWithTemplate } from './PrintableLabel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Element types available in the designer
const ELEMENT_TYPES = {
  qrcode: { label: 'QR-Code', icon: QrCode, defaultW: 3, defaultH: 3, minW: 2, minH: 2 },
  barcode: { label: 'Barcode', icon: BarChart3, defaultW: 6, defaultH: 2, minW: 3, minH: 1 },
  asset_id: { label: 'Asset-ID', icon: Type, defaultW: 4, defaultH: 1, minW: 2, minH: 1 },
  serial_number: { label: 'Seriennummer', icon: Type, defaultW: 4, defaultH: 1, minW: 2, minH: 1 },
  device_type: { label: 'Gerätetyp', icon: Type, defaultW: 3, defaultH: 1, minW: 2, minH: 1 },
  manufacturer: { label: 'Hersteller', icon: Type, defaultW: 3, defaultH: 1, minW: 2, minH: 1 },
  model: { label: 'Modell', icon: Type, defaultW: 3, defaultH: 1, minW: 2, minH: 1 },
  custom_text: { label: 'Eigener Text', icon: Type, defaultW: 3, defaultH: 1, minW: 1, minH: 1 },
  logo: { label: 'Logo', icon: Image, defaultW: 3, defaultH: 2, minW: 2, minH: 1 },
  line: { label: 'Trennlinie', icon: Minus, defaultW: 6, defaultH: 1, minW: 2, minH: 1 },
};

// Sample asset data for preview
const SAMPLE_ASSET = {
  asset_id: 'FRAT01-01-TAB-TSRi7',
  warehouse_asset_id: 'TSRID-TAB-i7-0001',
  manufacturer_sn: '1GAMNA8D0XFA',
  type: 'tab_tsr_i7',
  type_label: 'TSRID Tablet i7',
  manufacturer: 'TSRID GmbH',
  model: 'TSR-TAB-i7-2024',
};

// Grid configuration - 62mm width = 12 columns
const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 20; // pixels per row
const LABEL_WIDTH_MM = 62;
const LABEL_WIDTH_PX = 280; // Visual representation

const LabelDesigner = ({ theme = 'dark', onClose }) => {
  const isDark = theme === 'dark';
  const [elements, setElements] = useState([]);
  const [layout, setLayout] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateAssetType, setTemplateAssetType] = useState('all');
  const [isDefault, setIsDefault] = useState(false);
  const [labelHeight, setLabelHeight] = useState(6); // rows
  const [logoUrl, setLogoUrl] = useState('');
  const fileInputRef = useRef(null);
  
  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch templates from backend
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Add element to canvas
  const addElement = (type) => {
    const config = ELEMENT_TYPES[type];
    const newId = `${type}_${Date.now()}`;
    
    const newElement = {
      id: newId,
      type,
      config: {
        fontSize: type.includes('text') || ['asset_id', 'serial_number', 'device_type', 'manufacturer', 'model'].includes(type) ? 10 : undefined,
        fontWeight: type === 'asset_id' ? 'bold' : 'normal',
        textAlign: 'left',
        customText: type === 'custom_text' ? 'Eigener Text' : undefined,
        barcodeFormat: type === 'barcode' ? 'CODE128' : undefined,
        showValue: type === 'barcode' ? true : undefined,
        lineStyle: type === 'line' ? 'solid' : undefined,
        lineColor: type === 'line' ? '#000000' : undefined,
      }
    };
    
    const newLayoutItem = {
      i: newId,
      x: 0,
      y: layout.length > 0 ? Math.max(...layout.map(l => l.y + l.h)) : 0,
      w: config.defaultW,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    };
    
    setElements(prev => [...prev, newElement]);
    setLayout(prev => [...prev, newLayoutItem]);
    setSelectedElement(newId);
    
    // Auto-extend label height if needed
    const newMaxY = newLayoutItem.y + newLayoutItem.h;
    if (newMaxY > labelHeight) {
      setLabelHeight(newMaxY + 1);
    }
  };

  // Remove element
  const removeElement = (id) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setLayout(prev => prev.filter(l => l.i !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  // Duplicate element
  const duplicateElement = (id) => {
    const element = elements.find(e => e.id === id);
    const layoutItem = layout.find(l => l.i === id);
    if (!element || !layoutItem) return;
    
    const newId = `${element.type}_${Date.now()}`;
    const newElement = { ...element, id: newId, config: { ...element.config } };
    const newLayoutItem = { ...layoutItem, i: newId, y: layoutItem.y + layoutItem.h };
    
    setElements(prev => [...prev, newElement]);
    setLayout(prev => [...prev, newLayoutItem]);
    setSelectedElement(newId);
  };

  // Update element config
  const updateElementConfig = (id, key, value) => {
    setElements(prev => prev.map(e => 
      e.id === id ? { ...e, config: { ...e.config, [key]: value } } : e
    ));
  };

  // Handle layout change
  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
    // Update label height based on content
    if (newLayout.length > 0) {
      const maxY = Math.max(...newLayout.map(l => l.y + l.h));
      if (maxY > labelHeight - 1) {
        setLabelHeight(maxY + 1);
      }
    }
  };

  // Save template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Bitte Template-Namen eingeben');
      return;
    }
    
    const templateData = {
      name: templateName,
      description: templateDescription,
      asset_type: templateAssetType,
      is_default: isDefault,
      label_height: labelHeight,
      elements: elements,
      layout: layout,
      logo_url: logoUrl,
    };
    
    try {
      const url = currentTemplate 
        ? `${BACKEND_URL}/api/label-templates/${currentTemplate.template_id}`
        : `${BACKEND_URL}/api/label-templates`;
      
      const res = await fetch(url, {
        method: currentTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(currentTemplate ? 'Template aktualisiert' : 'Template gespeichert');
        setShowSaveDialog(false);
        fetchTemplates();
        if (!currentTemplate) {
          setCurrentTemplate(data.template);
        }
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
      console.error('Error saving template:', e);
      toast.error('Fehler beim Speichern');
    }
  };

  // Load template
  const loadTemplate = (template) => {
    setCurrentTemplate(template);
    setElements(template.elements || []);
    setLayout(template.layout || []);
    setLabelHeight(template.label_height || 6);
    setLogoUrl(template.logo_url || '');
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateAssetType(template.asset_type || 'all');
    setIsDefault(template.is_default || false);
    toast.success(`Template "${template.name}" geladen`);
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Template wirklich löschen?')) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-templates/${templateId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Template gelöscht');
        fetchTemplates();
        if (currentTemplate?.template_id === templateId) {
          resetDesigner();
        }
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Reset designer
  const resetDesigner = () => {
    setElements([]);
    setLayout([]);
    setSelectedElement(null);
    setCurrentTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateAssetType('all');
    setIsDefault(false);
    setLabelHeight(6);
    setLogoUrl('');
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
      toast.success('Logo hochgeladen');
    };
    reader.readAsDataURL(file);
  };

  // Render element content
  const renderElementContent = (element) => {
    const { type, config } = element;
    
    switch (type) {
      case 'qrcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white p-1">
            <QRCodeSVG 
              value={JSON.stringify({ id: SAMPLE_ASSET.asset_id, sn: SAMPLE_ASSET.manufacturer_sn })}
              size={100}
              level="M"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        );
      
      case 'barcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden">
            <Barcode 
              value={SAMPLE_ASSET.manufacturer_sn}
              format={config.barcodeFormat || 'CODE128'}
              width={1.5}
              height={40}
              displayValue={config.showValue !== false}
              fontSize={8}
              margin={2}
              background="transparent"
            />
          </div>
        );
      
      case 'asset_id':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1"
            style={{ 
              fontSize: `${config.fontSize || 10}pt`,
              fontWeight: config.fontWeight || 'bold',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            {SAMPLE_ASSET.asset_id}
          </div>
        );
      
      case 'serial_number':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1 font-mono"
            style={{ 
              fontSize: `${config.fontSize || 9}pt`,
              fontWeight: config.fontWeight || 'normal',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            SN: {SAMPLE_ASSET.manufacturer_sn}
          </div>
        );
      
      case 'device_type':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1"
            style={{ 
              fontSize: `${config.fontSize || 8}pt`,
              fontWeight: config.fontWeight || 'normal',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            {SAMPLE_ASSET.type_label}
          </div>
        );
      
      case 'manufacturer':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1"
            style={{ 
              fontSize: `${config.fontSize || 8}pt`,
              fontWeight: config.fontWeight || 'normal',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            {SAMPLE_ASSET.manufacturer}
          </div>
        );
      
      case 'model':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1"
            style={{ 
              fontSize: `${config.fontSize || 8}pt`,
              fontWeight: config.fontWeight || 'normal',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            {SAMPLE_ASSET.model}
          </div>
        );
      
      case 'custom_text':
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden text-black bg-white px-1"
            style={{ 
              fontSize: `${config.fontSize || 8}pt`,
              fontWeight: config.fontWeight || 'normal',
              textAlign: config.textAlign || 'left',
              justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            {config.customText || 'Text'}
          </div>
        );
      
      case 'logo':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white p-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-gray-400 text-xs text-center">Logo hochladen</div>
            )}
          </div>
        );
      
      case 'line':
        return (
          <div className="w-full h-full flex items-center bg-white px-1">
            <div 
              className="w-full"
              style={{ 
                borderTopWidth: '1px',
                borderTopStyle: config.lineStyle || 'solid',
                borderTopColor: config.lineColor || '#000000'
              }}
            />
          </div>
        );
      
      default:
        return <div className="w-full h-full bg-gray-200" />;
    }
  };

  // Get selected element data
  const selectedElementData = selectedElement ? elements.find(e => e.id === selectedElement) : null;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">Label-Designer</h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentTemplate ? `Bearbeite: ${currentTemplate.name}` : 'Neues Template erstellen'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetDesigner}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Neu
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPreviewDialog(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Vorschau
            </Button>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="h-4 w-4 mr-1" />
              Speichern
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Element Palette */}
        <div className={`w-64 border-r overflow-y-auto ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Elemente
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ELEMENT_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addElement(type)}
                    className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-colors ${
                      isDark 
                        ? 'border-gray-600 hover:bg-gray-700 hover:border-blue-500' 
                        : 'border-gray-200 hover:bg-blue-50 hover:border-blue-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{config.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Logo Upload */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-sm font-medium mb-2">Logo hochladen</h4>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bild wählen
              </Button>
              {logoUrl && (
                <div className="mt-2 p-2 bg-white rounded">
                  <img src={logoUrl} alt="Logo" className="max-h-16 mx-auto" />
                </div>
              )}
            </div>
            
            {/* Saved Templates */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-sm font-medium mb-2">Gespeicherte Templates</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.length === 0 ? (
                  <p className="text-xs text-gray-500">Keine Templates vorhanden</p>
                ) : (
                  templates.map(template => (
                    <div 
                      key={template.template_id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        currentTemplate?.template_id === template.template_id
                          ? 'border-blue-500 bg-blue-500/10'
                          : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{template.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTemplate(template.template_id); }}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {template.is_default && (
                        <Badge variant="outline" className="text-xs mt-1">Standard</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
          <div>
            {/* Label Size Indicator */}
            <div className={`mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {LABEL_WIDTH_MM}mm × {Math.round(labelHeight * GRID_ROW_HEIGHT / 4)}mm (ca.)
            </div>
            
            {/* Canvas */}
            <div 
              className="bg-white border-2 border-dashed border-gray-300 relative"
              style={{ 
                width: LABEL_WIDTH_PX,
                minHeight: labelHeight * GRID_ROW_HEIGHT,
              }}
            >
              <GridLayout
                className="layout"
                layout={layout}
                cols={GRID_COLS}
                rowHeight={GRID_ROW_HEIGHT}
                width={LABEL_WIDTH_PX}
                onLayoutChange={onLayoutChange}
                isDraggable
                isResizable
                compactType={null}
                preventCollision={false}
                margin={[2, 2]}
              >
                {elements.map(element => (
                  <div 
                    key={element.id}
                    className={`cursor-move ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedElement(element.id)}
                  >
                    {renderElementContent(element)}
                  </div>
                ))}
              </GridLayout>
              
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  Elemente hierher ziehen
                </div>
              )}
            </div>
            
            {/* Label Height Control */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm">Höhe:</span>
              <Slider
                value={[labelHeight]}
                onValueChange={([v]) => setLabelHeight(v)}
                min={3}
                max={15}
                step={1}
                className="w-48"
              />
              <span className="text-sm text-gray-500">{labelHeight} Zeilen</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Element Properties */}
        <div className={`w-72 border-l overflow-y-auto ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Eigenschaften
            </h3>
            
            {selectedElementData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge>{ELEMENT_TYPES[selectedElementData.type]?.label}</Badge>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => duplicateElement(selectedElement)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500"
                      onClick={() => removeElement(selectedElement)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Text Properties */}
                {['asset_id', 'serial_number', 'device_type', 'manufacturer', 'model', 'custom_text'].includes(selectedElementData.type) && (
                  <>
                    <div>
                      <Label className="text-xs">Schriftgröße (pt)</Label>
                      <Input
                        type="number"
                        min={6}
                        max={24}
                        value={selectedElementData.config.fontSize || 10}
                        onChange={(e) => updateElementConfig(selectedElement, 'fontSize', parseInt(e.target.value))}
                        className={`mt-1 ${inputBg}`}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Schriftstärke</Label>
                      <Select 
                        value={selectedElementData.config.fontWeight || 'normal'}
                        onValueChange={(v) => updateElementConfig(selectedElement, 'fontWeight', v)}
                      >
                        <SelectTrigger className={`mt-1 ${inputBg}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Fett</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Ausrichtung</Label>
                      <Select 
                        value={selectedElementData.config.textAlign || 'left'}
                        onValueChange={(v) => updateElementConfig(selectedElement, 'textAlign', v)}
                      >
                        <SelectTrigger className={`mt-1 ${inputBg}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Links</SelectItem>
                          <SelectItem value="center">Zentriert</SelectItem>
                          <SelectItem value="right">Rechts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedElementData.type === 'custom_text' && (
                      <div>
                        <Label className="text-xs">Text</Label>
                        <Input
                          value={selectedElementData.config.customText || ''}
                          onChange={(e) => updateElementConfig(selectedElement, 'customText', e.target.value)}
                          className={`mt-1 ${inputBg}`}
                        />
                      </div>
                    )}
                  </>
                )}
                
                {/* Barcode Properties */}
                {selectedElementData.type === 'barcode' && (
                  <>
                    <div>
                      <Label className="text-xs">Format</Label>
                      <Select 
                        value={selectedElementData.config.barcodeFormat || 'CODE128'}
                        onValueChange={(v) => updateElementConfig(selectedElement, 'barcodeFormat', v)}
                      >
                        <SelectTrigger className={`mt-1 ${inputBg}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CODE128">CODE128</SelectItem>
                          <SelectItem value="CODE39">CODE39</SelectItem>
                          <SelectItem value="EAN13">EAN13</SelectItem>
                          <SelectItem value="UPC">UPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Wert anzeigen</Label>
                      <Switch
                        checked={selectedElementData.config.showValue !== false}
                        onCheckedChange={(v) => updateElementConfig(selectedElement, 'showValue', v)}
                      />
                    </div>
                  </>
                )}
                
                {/* Line Properties */}
                {selectedElementData.type === 'line' && (
                  <>
                    <div>
                      <Label className="text-xs">Stil</Label>
                      <Select 
                        value={selectedElementData.config.lineStyle || 'solid'}
                        onValueChange={(v) => updateElementConfig(selectedElement, 'lineStyle', v)}
                      >
                        <SelectTrigger className={`mt-1 ${inputBg}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Durchgezogen</SelectItem>
                          <SelectItem value="dashed">Gestrichelt</SelectItem>
                          <SelectItem value="dotted">Gepunktet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Element auswählen um Eigenschaften zu bearbeiten
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className={isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              Template speichern
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="z.B. Standard-Label"
                className={`mt-1 ${inputBg}`}
              />
            </div>
            
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Optional"
                className={`mt-1 ${inputBg}`}
              />
            </div>
            
            <div>
              <Label>Asset-Typ</Label>
              <Select value={templateAssetType} onValueChange={setTemplateAssetType}>
                <SelectTrigger className={`mt-1 ${inputBg}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="tab_tsr_i7">TSRID Tablet i7</SelectItem>
                  <SelectItem value="tab_tsr_i5">TSRID Tablet i5</SelectItem>
                  <SelectItem value="sca_tsr">TSRID Scanner</SelectItem>
                  <SelectItem value="sca_dsk">Desko Scanner</SelectItem>
                  <SelectItem value="kit">Kits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Als Standard festlegen</Label>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveTemplate} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              Druckvorschau
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              So wird das Label auf dem Drucker ausgegeben:
            </p>
            
            <div className="flex justify-center">
              <div 
                className="bg-white border-2 border-gray-300"
                style={{ 
                  width: LABEL_WIDTH_PX,
                  minHeight: labelHeight * GRID_ROW_HEIGHT,
                }}
              >
                <GridLayout
                  className="layout"
                  layout={layout}
                  cols={GRID_COLS}
                  rowHeight={GRID_ROW_HEIGHT}
                  width={LABEL_WIDTH_PX}
                  isDraggable={false}
                  isResizable={false}
                  margin={[2, 2]}
                >
                  {elements.map(element => (
                    <div key={element.id}>
                      {renderElementContent(element)}
                    </div>
                  ))}
                </GridLayout>
              </div>
            </div>
            
            <div className={`mt-4 p-3 rounded-lg text-sm ${isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <p className="font-medium mb-1">Druckeinstellungen:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Brother QL-820NWB</li>
                <li>62mm Endlosrolle (DK-22205)</li>
                <li>Größe: {LABEL_WIDTH_MM}mm × ~{Math.round(labelHeight * GRID_ROW_HEIGHT / 4)}mm</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Schließen
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Test drucken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabelDesigner;
