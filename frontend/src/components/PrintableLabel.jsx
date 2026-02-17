import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Printer, X, FileText, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Grid constants
const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 20;
const LABEL_WIDTH_MM = 62;
const MM_PER_COL = LABEL_WIDTH_MM / GRID_COLS;

/**
 * PrintableLabel - Asset-Labels für Brother QL-820NWB mit 62mm Endlosrolle
 * Verwendet versteckte DOM-Elemente zum Generieren der SVGs
 */

// Hidden container for rendering SVGs
let hiddenContainer = null;

const getHiddenContainer = () => {
  if (!hiddenContainer) {
    hiddenContainer = document.createElement('div');
    hiddenContainer.id = 'print-svg-container';
    hiddenContainer.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
    document.body.appendChild(hiddenContainer);
  }
  return hiddenContainer;
};

// Extrahiert SVG aus gerendeter React-Komponente
const extractSvgFromElement = (element) => {
  if (!element) return '';
  const svg = element.querySelector('svg');
  if (svg) {
    // Clone und cleanup
    const clone = svg.cloneNode(true);
    clone.removeAttribute('class');
    return clone.outerHTML;
  }
  return '';
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
  
  const labelHeight = template ? (template.label_height || 6) * (GRID_ROW_HEIGHT / 4) : 30;
  
  // Hole SVGs aus der Vorschau (falls vorhanden) oder generiere sie
  let qrSvgHtml = '';
  let barcodeSvgHtml = '';
  
  // Versuche zuerst, existierende SVGs aus dem DOM zu holen
  const previewContainer = document.querySelector('[data-label-preview]');
  if (previewContainer) {
    const qrEl = previewContainer.querySelector('[data-qr-code]');
    const barcodeEl = previewContainer.querySelector('[data-barcode]');
    qrSvgHtml = extractSvgFromElement(qrEl);
    barcodeSvgHtml = extractSvgFromElement(barcodeEl);
  }
  
  // Fallback: Generiere SVGs über temporäre DOM-Elemente
  if (!qrSvgHtml || !barcodeSvgHtml) {
    const container = getHiddenContainer();
    
    // Temporär React-Root erstellen ist zu komplex, verwende stattdessen CDN
    // Wir setzen auf die CDN-Methode mit verbessertem Timing
  }
  
  const printWindow = window.open('', '_blank', 'width=600,height=500');
  if (!printWindow) {
    toast.error('Popup-Blocker aktiv - bitte erlauben Sie Popups');
    return;
  }
  
  // Generiere Element-HTML für Template
  let elementsHtml = '';
  if (template && template.elements && template.layout) {
    template.elements.forEach(element => {
      const layoutItem = template.layout.find(l => l.i === element.id);
      if (layoutItem) {
        const { type, config } = element;
        const { x, y, w, h } = layoutItem;
        
        const left = x * MM_PER_COL;
        const top = y * (GRID_ROW_HEIGHT / 4);
        const width = w * MM_PER_COL;
        const height = h * (GRID_ROW_HEIGHT / 4);
        
        const posStyle = `position: absolute; left: ${left}mm; top: ${top}mm; width: ${width}mm; height: ${height}mm; overflow: hidden;`;
        
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
          color: #000;
        `;
        
        switch (type) {
          case 'qrcode':
            elementsHtml += `<div id="qr-${element.id}" class="qr-container" style="${posStyle} display: flex; align-items: center; justify-content: center;" data-content="${qrContent.replace(/"/g, '&quot;')}" data-size="${Math.min(width, height) * 3.78}"></div>`;
            break;
          case 'barcode':
            elementsHtml += `<div id="bc-${element.id}" class="barcode-container" style="${posStyle} display: flex; align-items: center; justify-content: center;" data-value="${serialNumber}" data-format="${config.barcodeFormat || 'CODE128'}" data-show="${config.showValue !== false}"></div>`;
            break;
          case 'asset_id':
            elementsHtml += `<div style="${posStyle} ${textStyle}">${labelId}</div>`;
            break;
          case 'serial_number':
            elementsHtml += `<div style="${posStyle} ${textStyle} font-family: monospace;">SN: ${serialNumber}</div>`;
            break;
          case 'device_type':
            elementsHtml += `<div style="${posStyle} ${textStyle}">${typeLabel}</div>`;
            break;
          case 'manufacturer':
            elementsHtml += `<div style="${posStyle} ${textStyle}">${manufacturer}</div>`;
            break;
          case 'model':
            elementsHtml += `<div style="${posStyle} ${textStyle}">${model}</div>`;
            break;
          case 'custom_text':
            elementsHtml += `<div style="${posStyle} ${textStyle}">${config.customText || ''}</div>`;
            break;
          case 'logo':
            if (template.logo_url) {
              elementsHtml += `<div style="${posStyle} display: flex; align-items: center; justify-content: center;"><img src="${template.logo_url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>`;
            }
            break;
          case 'line':
            elementsHtml += `<div style="${posStyle} display: flex; align-items: center;"><div style="width: 100%; border-top: 1px ${config.lineStyle || 'solid'} ${config.lineColor || '#000'};"></div></div>`;
            break;
        }
      }
    });
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label: ${labelId}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 62mm auto; margin: 0; }
        @media print {
          html, body { width: 62mm; margin: 0; padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          width: 62mm;
          background: white;
        }
        .label-container {
          position: relative;
          width: 62mm;
          min-height: ${labelHeight}mm;
          padding: 1mm;
          background: white;
        }
        .loading-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #666;
        }
        svg { display: block; }
        ${!template ? `
        .default-label {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 3mm;
          width: 100%;
        }
        .qr-section { flex-shrink: 0; width: 20mm; height: 20mm; }
        .info-section { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1mm; }
        .asset-id { font-size: 10pt; font-weight: bold; line-height: 1.2; word-break: break-all; color: #000; }
        .device-type { font-size: 7pt; color: #444; text-transform: uppercase; letter-spacing: 0.3px; }
        .device-info { font-size: 6pt; color: #666; margin-top: 0.5mm; }
        .serial-section { margin-top: 2mm; padding-top: 2mm; border-top: 0.3mm solid #ddd; }
        .serial-label { font-size: 5pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
        .barcode-container { width: 100%; overflow: hidden; }
        ` : ''}
      </style>
    </head>
    <body>
      <div id="loading" class="loading-overlay no-print">Generiere Label...</div>
      <div class="label-container">
        ${template ? elementsHtml : `
        <div class="default-label">
          <div class="qr-section" id="default-qr"></div>
          <div class="info-section">
            <div class="asset-id">${labelId}</div>
            <div class="device-type">${typeLabel}</div>
            ${manufacturer || model ? `<div class="device-info">${manufacturer}${manufacturer && model ? ' - ' : ''}${model}</div>` : ''}
            ${serialNumber ? `
            <div class="serial-section">
              <div class="serial-label">Seriennummer</div>
              <div class="barcode-container" id="default-barcode"></div>
            </div>
            ` : ''}
          </div>
        </div>
        `}
      </div>
      
      <script>
        (function() {
          var generated = { qr: 0, barcode: 0, total: 0 };
          var expectedQr = document.querySelectorAll('.qr-container, #default-qr').length;
          var expectedBarcode = document.querySelectorAll('.barcode-container[data-value], #default-barcode').length;
          generated.total = expectedQr + expectedBarcode;
          
          function checkComplete() {
            if (generated.qr >= expectedQr && generated.barcode >= expectedBarcode) {
              document.getElementById('loading').style.display = 'none';
              setTimeout(function() { window.print(); }, 200);
            }
          }
          
          function waitForLibs(callback) {
            var attempts = 0;
            var check = function() {
              attempts++;
              if (typeof QRCode !== 'undefined' && typeof JsBarcode !== 'undefined') {
                callback();
              } else if (attempts < 100) {
                setTimeout(check, 50);
              } else {
                console.error('Libraries failed to load');
                document.getElementById('loading').textContent = 'Fehler beim Laden';
              }
            };
            check();
          }
          
          waitForLibs(function() {
            // Generate QR codes
            document.querySelectorAll('.qr-container').forEach(function(el) {
              var content = el.getAttribute('data-content');
              var size = parseInt(el.getAttribute('data-size')) || 80;
              var canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, content, { width: size, margin: 0 }, function(err) {
                if (!err) {
                  canvas.style.width = '100%';
                  canvas.style.height = '100%';
                  el.appendChild(canvas);
                }
                generated.qr++;
                checkComplete();
              });
            });
            
            // Default QR
            var defaultQr = document.getElementById('default-qr');
            if (defaultQr) {
              var canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, '${qrContent.replace(/'/g, "\\'")}', { width: 80, margin: 0 }, function(err) {
                if (!err) {
                  canvas.style.width = '20mm';
                  canvas.style.height = '20mm';
                  defaultQr.appendChild(canvas);
                }
                generated.qr++;
                checkComplete();
              });
            }
            
            // Generate barcodes
            document.querySelectorAll('.barcode-container[data-value]').forEach(function(el) {
              var value = el.getAttribute('data-value');
              var format = el.getAttribute('data-format') || 'CODE128';
              var showVal = el.getAttribute('data-show') !== 'false';
              if (value) {
                var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                el.appendChild(svg);
                try {
                  JsBarcode(svg, value, { format: format, width: 1.5, height: 35, displayValue: showVal, fontSize: 9, margin: 0 });
                  svg.style.width = '100%';
                  svg.style.maxHeight = '100%';
                } catch(e) { el.textContent = value; }
              }
              generated.barcode++;
              checkComplete();
            });
            
            // Default barcode
            var defaultBarcode = document.getElementById('default-barcode');
            if (defaultBarcode && '${serialNumber}') {
              var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              defaultBarcode.appendChild(svg);
              try {
                JsBarcode(svg, '${serialNumber}', { format: 'CODE128', width: 1.5, height: 30, displayValue: true, fontSize: 9, margin: 0 });
                svg.style.width = '100%';
              } catch(e) { defaultBarcode.textContent = '${serialNumber}'; }
              generated.barcode++;
              checkComplete();
            }
            
            // Fallback if no codes needed
            if (generated.total === 0) {
              document.getElementById('loading').style.display = 'none';
              setTimeout(function() { window.print(); }, 200);
            }
          });
        })();
      <\/script>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// Legacy-Funktion
export const printAssetLabel = (asset) => {
  printAssetLabelWithTemplate(asset, null);
};

// Label Vorschau Komponente
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
  
  // Template-basierte Vorschau
  if (template && template.elements && template.layout) {
    const labelHeight = (template.label_height || 6) * GRID_ROW_HEIGHT;
    
    return (
      <div 
        className="bg-white rounded border border-gray-300 relative overflow-hidden"
        style={{ width: '280px', height: `${labelHeight}px` }}
        data-label-preview="true"
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
                <div key={element.id} style={style} data-qr-code="true">
                  <QRCodeSVG value={qrContent} size={100} level="M" style={{ width: '100%', height: '100%' }} />
                </div>
              );
            case 'barcode':
              return serialNumber ? (
                <div key={element.id} style={style} data-barcode="true">
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
  
  // Standard-Vorschau
  return (
    <div 
      className={`p-4 rounded-lg border ${isDark ? 'bg-white' : 'bg-gray-50'}`}
      style={{ width: '100%', maxWidth: '280px' }}
      data-label-preview="true"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0" data-qr-code="true">
          <QRCodeSVG value={qrContent} size={80} level="M" includeMargin={false} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="font-bold text-black text-sm leading-tight break-all">{labelId}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">{typeLabel}</div>
          {(manufacturer || model) && (
            <div className="text-xs text-gray-500">{manufacturer}{manufacturer && model ? ' - ' : ''}{model}</div>
          )}
          {serialNumber && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Seriennummer</div>
              <div className="w-full overflow-hidden" data-barcode="true">
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

// Label Print Modal
export const LabelPrintModal = ({ open, onOpenChange, asset, isDark = true }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/label-templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        const def = data.templates?.find(t => t.is_default);
        if (def) {
          setSelectedTemplateId(def.template_id);
          setSelectedTemplate(def);
        }
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id);
    setSelectedTemplate(id === 'default' ? null : templates.find(t => t.template_id === id) || null);
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
                {templates.map(t => (
                  <SelectItem key={t.template_id} value={t.template_id}>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {t.name}
                      {t.is_default && <span className="text-xs text-blue-500">(Standard)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vorschau:</p>
            <div className="flex justify-center">
              <LabelPreview asset={asset} template={selectedTemplate} isDark={isDark} />
            </div>
          </div>
          
          <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            <p className="font-medium mb-1">Druckhinweis:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Brother QL-820NWB</li>
              <li>62mm Endlosrolle (DK-22205)</li>
              <li>Drucker: "Automatische Größe"</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className={isDark ? 'border-gray-600' : ''}>
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button onClick={() => printAssetLabelWithTemplate(asset, selectedTemplate)} className="bg-blue-600 hover:bg-blue-700" data-testid="print-label-btn">
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default { printAssetLabel, printAssetLabelWithTemplate, LabelPreview, LabelPrintModal };
