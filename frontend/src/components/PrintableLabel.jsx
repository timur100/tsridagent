import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Printer, X, FileText, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Grid constants - must match LabelDesigner
const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 20;
const LABEL_WIDTH_MM = 62;
const MM_PER_COL = LABEL_WIDTH_MM / GRID_COLS; // ~5.17mm per column

/**
 * PrintableLabel - Wiederverwendbare Komponente für Asset-Labels
 * Optimiert für Brother QL-820NWB mit 62mm Endlosrolle
 * Unterstützt jetzt benutzerdefinierte Templates aus dem Label-Designer
 */

// Generiert HTML für ein Element basierend auf Template-Konfiguration
const generateElementHtml = (element, layoutItem, asset, logoUrl) => {
  const { type, config } = element;
  const { x, y, w, h } = layoutItem;
  
  // Position und Größe in mm berechnen
  const left = x * MM_PER_COL;
  const top = y * (GRID_ROW_HEIGHT / 4); // ~5mm per row
  const width = w * MM_PER_COL;
  const height = h * (GRID_ROW_HEIGHT / 4);
  
  const posStyle = `position: absolute; left: ${left}mm; top: ${top}mm; width: ${width}mm; height: ${height}mm; overflow: hidden;`;
  
  const labelId = asset.asset_id || asset.warehouse_asset_id || asset.manufacturer_sn || '';
  const serialNumber = asset.manufacturer_sn || '';
  const typeLabel = asset.type_label || asset.type || '';
  const manufacturer = asset.manufacturer || '';
  const model = asset.model || '';
  
  const qrContent = JSON.stringify({
    id: labelId,
    sn: serialNumber,
    type: asset.type || ''
  });
  
  const textStyle = `
    font-size: ${config.fontSize || 10}pt;
    font-weight: ${config.fontWeight || 'normal'};
    text-align: ${config.textAlign || 'left'};
    display: flex;
    align-items: center;
    justify-content: ${config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;
  
  switch (type) {
    case 'qrcode':
      // QR-Code Container mit expliziten Canvas-Styles
      return `<div class="qr-element" style="${posStyle} display: flex; align-items: center; justify-content: center;" data-qr="${qrContent.replace(/"/g, '&quot;')}" data-width="${width}" data-height="${height}"></div>`;
    
    case 'barcode':
      // Barcode Container mit expliziten SVG-Styles
      return `<div class="barcode-element" style="${posStyle} display: flex; align-items: center; justify-content: center;" data-barcode="${serialNumber}" data-format="${config.barcodeFormat || 'CODE128'}" data-show-value="${config.showValue !== false}" data-width="${width}" data-height="${height}"></div>`;
    
    case 'asset_id':
      return `<div style="${posStyle} ${textStyle}">${labelId}</div>`;
    
    case 'serial_number':
      return `<div style="${posStyle} ${textStyle} font-family: monospace;">SN: ${serialNumber}</div>`;
    
    case 'device_type':
      return `<div style="${posStyle} ${textStyle}">${typeLabel}</div>`;
    
    case 'manufacturer':
      return `<div style="${posStyle} ${textStyle}">${manufacturer}</div>`;
    
    case 'model':
      return `<div style="${posStyle} ${textStyle}">${model}</div>`;
    
    case 'custom_text':
      return `<div style="${posStyle} ${textStyle}">${config.customText || ''}</div>`;
    
    case 'logo':
      if (logoUrl) {
        return `<div style="${posStyle} display: flex; align-items: center; justify-content: center;"><img src="${logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>`;
      }
      return '';
    
    case 'line':
      return `<div style="${posStyle} display: flex; align-items: center;"><div style="width: 100%; border-top: 1px ${config.lineStyle || 'solid'} ${config.lineColor || '#000'};"></div></div>`;
    
    default:
      return '';
  }
};

// Druckt das Label mit Template-Unterstützung
export const printAssetLabelWithTemplate = (asset, template) => {
  if (!asset) return;
  
  const labelId = asset.asset_id || asset.warehouse_asset_id || asset.manufacturer_sn || '';
  const serialNumber = asset.manufacturer_sn || '';
  const typeLabel = asset.type_label || asset.type || '';
  const manufacturer = asset.manufacturer || '';
  const model = asset.model || '';
  
  const qrContent = JSON.stringify({
    id: labelId,
    sn: serialNumber,
    type: asset.type || ''
  });
  
  // Berechne Label-Höhe in mm
  const labelHeight = template ? (template.label_height || 6) * (GRID_ROW_HEIGHT / 4) : 30;
  
  const printWindow = window.open('', '_blank', 'width=500,height=400');
  if (!printWindow) {
    toast.error('Popup-Blocker aktiv - bitte erlauben Sie Popups');
    return;
  }
  
  // Generiere Element-HTML wenn Template vorhanden
  let elementsHtml = '';
  if (template && template.elements && template.layout) {
    template.elements.forEach(element => {
      const layoutItem = template.layout.find(l => l.i === element.id);
      if (layoutItem) {
        elementsHtml += generateElementHtml(element, layoutItem, asset, template.logo_url);
      }
    });
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label: ${labelId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 62mm auto; margin: 0; }
        @media print {
          html, body { width: 62mm; margin: 0; padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          width: 62mm;
          background: white;
        }
        .label-container {
          position: relative;
          width: 62mm;
          height: ${labelHeight}mm;
          padding: 1mm;
        }
        ${!template ? `
        /* Standard Layout ohne Template */
        .default-label {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 3mm;
          width: 100%;
        }
        .qr-section { flex-shrink: 0; width: 20mm; height: 20mm; }
        .qr-section svg, .qr-section canvas { width: 20mm !important; height: 20mm !important; display: block; }
        .info-section { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1mm; }
        .asset-id { font-size: 10pt; font-weight: bold; line-height: 1.2; word-break: break-all; color: #000; }
        .device-type { font-size: 7pt; color: #444; text-transform: uppercase; letter-spacing: 0.3px; }
        .device-info { font-size: 6pt; color: #666; margin-top: 0.5mm; }
        .serial-section { margin-top: 2mm; padding-top: 2mm; border-top: 0.3mm solid #ddd; }
        .serial-label { font-size: 5pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
        .barcode-container { width: 100%; overflow: hidden; }
        .barcode-container svg { display: block; width: 100%; height: auto; max-height: 10mm; }
        ` : ''}
      </style>
    </head>
    <body>
      <div class="label-container">
        ${template ? elementsHtml : `
        <div class="default-label">
          <div class="qr-section" id="qr-placeholder"></div>
          <div class="info-section">
            <div class="asset-id">${labelId}</div>
            <div class="device-type">${typeLabel}</div>
            ${manufacturer || model ? `<div class="device-info">${manufacturer}${manufacturer && model ? ' - ' : ''}${model}</div>` : ''}
            ${serialNumber ? `
            <div class="serial-section">
              <div class="serial-label">Seriennummer</div>
              <div class="barcode-container" id="barcode-placeholder"></div>
            </div>
            ` : ''}
          </div>
        </div>
        `}
      </div>
      
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      
      <script>
        // QR-Codes generieren
        document.querySelectorAll('[data-qr]').forEach(function(el) {
          var content = el.getAttribute('data-qr');
          var canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, content, {
            width: 76,
            margin: 0,
            color: { dark: '#000000', light: '#ffffff' }
          }, function(error) {
            if (!error) {
              el.appendChild(canvas);
              canvas.style.width = '100%';
              canvas.style.height = '100%';
            }
          });
        });
        
        // Barcodes generieren
        document.querySelectorAll('[data-barcode]').forEach(function(el) {
          var value = el.getAttribute('data-barcode');
          var format = el.getAttribute('data-format') || 'CODE128';
          var showValue = el.getAttribute('data-show-value') !== 'false';
          if (value) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            el.appendChild(svg);
            try {
              JsBarcode(svg, value, {
                format: format,
                width: 1.5,
                height: 30,
                displayValue: showValue,
                fontSize: 8,
                margin: 0,
                textMargin: 2
              });
              svg.style.width = '100%';
              svg.style.height = '100%';
            } catch(e) {
              el.innerHTML = '<span style="font-family: monospace; font-size: 8pt;">' + value + '</span>';
            }
          }
        });
        
        ${!template ? `
        // Standard-Layout QR und Barcode
        var qrContainer = document.getElementById('qr-placeholder');
        if (qrContainer) {
          var canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, '${qrContent.replace(/'/g, "\\'")}', {
            width: 76,
            margin: 0,
            color: { dark: '#000000', light: '#ffffff' }
          }, function(error) {
            if (!error) {
              qrContainer.appendChild(canvas);
              canvas.style.width = '20mm';
              canvas.style.height = '20mm';
            }
          });
        }
        
        var barcodeContainer = document.getElementById('barcode-placeholder');
        if (barcodeContainer && '${serialNumber}') {
          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          barcodeContainer.appendChild(svg);
          try {
            JsBarcode(svg, '${serialNumber}', {
              format: 'CODE128',
              width: 1.5,
              height: 25,
              displayValue: true,
              fontSize: 8,
              margin: 0,
              textMargin: 2
            });
          } catch(e) {
            barcodeContainer.innerHTML = '<span style="font-family: monospace;">${serialNumber}</span>';
          }
        }
        ` : ''}
        
        setTimeout(function() { window.print(); }, 500);
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// Legacy-Funktion für Abwärtskompatibilität
export const printAssetLabel = (asset) => {
  printAssetLabelWithTemplate(asset, null);
};

// Label Vorschau Komponente für Modals (mit Template-Unterstützung)
export const LabelPreview = ({ asset, template, isDark = true }) => {
  if (!asset) return null;
  
  const labelId = asset.asset_id || asset.warehouse_asset_id || asset.manufacturer_sn || '';
  const typeLabel = asset.type_label || asset.type || '';
  const serialNumber = asset.manufacturer_sn || '';
  const manufacturer = asset.manufacturer || '';
  const model = asset.model || '';
  
  const qrContent = JSON.stringify({
    id: labelId,
    sn: serialNumber,
    type: asset.type || ''
  });
  
  // Wenn Template vorhanden, zeige Template-basierte Vorschau
  if (template && template.elements && template.layout) {
    const labelHeight = (template.label_height || 6) * GRID_ROW_HEIGHT;
    
    return (
      <div 
        className="bg-white rounded border border-gray-300 relative overflow-hidden"
        style={{ width: '280px', height: `${labelHeight}px` }}
      >
        {template.elements.map(element => {
          const layoutItem = template.layout.find(l => l.i === element.id);
          if (!layoutItem) return null;
          
          const { type, config } = element;
          const left = (layoutItem.x / GRID_COLS) * 100;
          const top = (layoutItem.y / template.label_height) * 100;
          const width = (layoutItem.w / GRID_COLS) * 100;
          const height = (layoutItem.h / template.label_height) * 100;
          
          const style = {
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          };
          
          const textStyle = {
            fontSize: `${Math.min(config.fontSize || 10, 12)}px`,
            fontWeight: config.fontWeight || 'normal',
            textAlign: config.textAlign || 'left',
            justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#000',
          };
          
          switch (type) {
            case 'qrcode':
              return (
                <div key={element.id} style={style}>
                  <QRCodeSVG value={qrContent} size={100} level="M" style={{ width: '100%', height: '100%' }} />
                </div>
              );
            case 'barcode':
              return serialNumber ? (
                <div key={element.id} style={style}>
                  <Barcode 
                    value={serialNumber}
                    format={config.barcodeFormat || 'CODE128'}
                    width={1}
                    height={30}
                    displayValue={config.showValue !== false}
                    fontSize={8}
                    margin={0}
                    background="transparent"
                  />
                </div>
              ) : null;
            case 'asset_id':
              return <div key={element.id} style={{ ...style, ...textStyle, fontWeight: 'bold' }}>{labelId}</div>;
            case 'serial_number':
              return <div key={element.id} style={{ ...style, ...textStyle, fontFamily: 'monospace' }}>SN: {serialNumber}</div>;
            case 'device_type':
              return <div key={element.id} style={{ ...style, ...textStyle }}>{typeLabel}</div>;
            case 'manufacturer':
              return <div key={element.id} style={{ ...style, ...textStyle }}>{manufacturer}</div>;
            case 'model':
              return <div key={element.id} style={{ ...style, ...textStyle }}>{model}</div>;
            case 'custom_text':
              return <div key={element.id} style={{ ...style, ...textStyle }}>{config.customText || ''}</div>;
            case 'logo':
              return template.logo_url ? (
                <div key={element.id} style={{ ...style, justifyContent: 'center' }}>
                  <img src={template.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : null;
            case 'line':
              return (
                <div key={element.id} style={{ ...style, alignItems: 'center' }}>
                  <div style={{ width: '100%', borderTop: `1px ${config.lineStyle || 'solid'} ${config.lineColor || '#000'}` }} />
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }
  
  // Standard-Vorschau ohne Template
  return (
    <div 
      className={`p-4 rounded-lg border ${isDark ? 'bg-white' : 'bg-gray-50'}`}
      style={{ width: '100%', maxWidth: '280px' }}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <QRCodeSVG value={qrContent} size={80} level="M" includeMargin={false} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-black text-sm leading-tight break-all" style={{ wordBreak: 'break-word' }}>
            {labelId}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">{typeLabel}</div>
          {(manufacturer || model) && (
            <div className="text-xs text-gray-500">{manufacturer}{manufacturer && model ? ' - ' : ''}{model}</div>
          )}
          {serialNumber && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Seriennummer</div>
              <div className="w-full overflow-hidden">
                <Barcode 
                  value={serialNumber}
                  format="CODE128"
                  width={1.2}
                  height={30}
                  displayValue={true}
                  fontSize={9}
                  margin={0}
                  textMargin={2}
                  background="transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Label Print Modal Komponente mit Template-Auswahl
export const LabelPrintModal = ({ 
  open, 
  onOpenChange, 
  asset, 
  isDark = true 
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Templates laden
  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/label-templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        // Standard-Template finden
        const defaultTemplate = data.templates?.find(t => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.template_id);
          setSelectedTemplate(defaultTemplate);
        }
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'default') {
      setSelectedTemplate(null);
    } else {
      const template = templates.find(t => t.template_id === templateId);
      setSelectedTemplate(template || null);
    }
  };
  
  const handlePrint = () => {
    printAssetLabelWithTemplate(asset, selectedTemplate);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Printer className="h-5 w-5" />
            Label drucken
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Template-Auswahl */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <Palette className="h-4 w-4 inline mr-1" />
              Label-Template
            </label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className={isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}>
                <SelectValue placeholder="Template wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Standard-Layout
                  </div>
                </SelectItem>
                {templates.map(template => (
                  <SelectItem key={template.template_id} value={template.template_id}>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {template.name}
                      {template.is_default && <span className="text-xs text-blue-500">(Standard)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && !loading && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Erstelle eigene Templates im Label-Designer unter Lagerverwaltung
              </p>
            )}
          </div>
          
          {/* Label Vorschau */}
          <div>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Vorschau:
            </p>
            <div className="flex justify-center">
              <LabelPreview asset={asset} template={selectedTemplate} isDark={isDark} />
            </div>
          </div>
          
          {/* Druckhinweise */}
          <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            <p className="font-medium mb-1">Druckhinweis:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Optimiert für Brother QL-820NWB</li>
              <li>Papier: 62mm Endlosrolle (DK-22205)</li>
              <li>Drucker auf "Automatische Größe" einstellen</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className={isDark ? 'border-gray-600' : ''}
          >
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="print-label-btn"
          >
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default {
  printAssetLabel,
  printAssetLabelWithTemplate,
  LabelPreview,
  LabelPrintModal
};
