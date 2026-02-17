import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PrintableLabel - Wiederverwendbare Komponente für Asset-Labels
 * Optimiert für Brother QL-820NWB mit 62mm Endlosrolle
 */

// Druckt das Label in einem neuen Fenster
export const printAssetLabel = (asset) => {
  if (!asset) return;
  
  const labelId = asset.asset_id || asset.warehouse_asset_id || asset.manufacturer_sn || '';
  const typeLabel = asset.type_label || asset.type || '';
  const serialNumber = asset.manufacturer_sn || '';
  const manufacturer = asset.manufacturer || '';
  const model = asset.model || '';
  
  // QR-Code Inhalt - JSON mit allen wichtigen Daten
  const qrContent = JSON.stringify({
    id: labelId,
    sn: serialNumber,
    type: asset.type || ''
  });
  
  const printWindow = window.open('', '_blank', 'width=500,height=400');
  if (!printWindow) {
    toast.error('Popup-Blocker aktiv - bitte erlauben Sie Popups');
    return;
  }
  
  // HTML für das Druckfenster - optimiert für 62mm Endlosrolle
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label: ${labelId}</title>
      <style>
        /* Reset und Basis-Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        /* Druckeinstellungen für 62mm Endlosrolle */
        @page {
          size: 62mm auto;
          margin: 0;
        }
        
        @media print {
          html, body {
            width: 62mm;
            margin: 0;
            padding: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          width: 62mm;
          padding: 2mm;
          background: white;
        }
        
        /* Label Container - Horizontales Layout */
        .label {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 3mm;
          width: 100%;
        }
        
        /* QR Code Bereich - Links */
        .qr-section {
          flex-shrink: 0;
          width: 20mm;
          height: 20mm;
        }
        
        .qr-section svg {
          width: 20mm !important;
          height: 20mm !important;
          display: block;
        }
        
        /* Info Bereich - Rechts */
        .info-section {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1mm;
        }
        
        /* Asset-ID - Hauptidentifikator */
        .asset-id {
          font-size: 10pt;
          font-weight: bold;
          line-height: 1.2;
          word-break: break-all;
          color: #000;
        }
        
        /* Gerätetyp */
        .device-type {
          font-size: 7pt;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        /* Hersteller/Modell Info */
        .device-info {
          font-size: 6pt;
          color: #666;
          margin-top: 0.5mm;
        }
        
        /* Seriennummer mit Barcode */
        .serial-section {
          margin-top: 2mm;
          padding-top: 2mm;
          border-top: 0.3mm solid #ddd;
        }
        
        .serial-label {
          font-size: 5pt;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1mm;
        }
        
        /* Barcode Container */
        .barcode-container {
          width: 100%;
          overflow: hidden;
        }
        
        .barcode-container svg {
          display: block;
          width: 100%;
          height: auto;
          max-height: 10mm;
        }
        
        /* Seriennummer Text (Fallback wenn kein Barcode) */
        .serial-text {
          font-family: 'Courier New', monospace;
          font-size: 7pt;
          color: #333;
          letter-spacing: 0.5px;
        }
        
        /* Logo/Branding (optional) */
        .brand-footer {
          margin-top: 2mm;
          padding-top: 1mm;
          border-top: 0.3mm dashed #ccc;
          font-size: 5pt;
          color: #999;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <!-- QR Code -->
        <div class="qr-section" id="qr-placeholder"></div>
        
        <!-- Info Section -->
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
      
      <!-- QR Code Library -->
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <!-- JsBarcode Library -->
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      
      <script>
        // QR Code generieren
        const qrContainer = document.getElementById('qr-placeholder');
        if (qrContainer) {
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, '${qrContent.replace(/'/g, "\\'")}', {
            width: 76, // ~20mm bei 96dpi
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
        
        // Barcode generieren (falls Seriennummer vorhanden)
        ${serialNumber ? `
        const barcodeContainer = document.getElementById('barcode-placeholder');
        if (barcodeContainer) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          barcodeContainer.appendChild(svg);
          try {
            JsBarcode(svg, '${serialNumber.replace(/'/g, "\\'")}', {
              format: 'CODE128',
              width: 1.5,
              height: 25,
              displayValue: true,
              fontSize: 8,
              margin: 0,
              textMargin: 2
            });
          } catch(e) {
            // Fallback: Nur Text anzeigen
            barcodeContainer.innerHTML = '<div class="serial-text">${serialNumber}</div>';
          }
        }
        ` : ''}
        
        // Automatisch drucken nach kurzer Verzögerung
        setTimeout(function() {
          window.print();
        }, 500);
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// Label Vorschau Komponente für Modals
export const LabelPreview = ({ asset, isDark = true }) => {
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
  
  return (
    <div 
      className={`p-4 rounded-lg border ${isDark ? 'bg-white' : 'bg-gray-50'}`}
      style={{ width: '100%', maxWidth: '280px' }}
    >
      <div className="flex gap-3">
        {/* QR Code */}
        <div className="flex-shrink-0" data-qr-preview>
          <QRCodeSVG 
            value={qrContent}
            size={80}
            level="M"
            includeMargin={false}
          />
        </div>
        
        {/* Info Section */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div 
            className="font-bold text-black text-sm leading-tight break-all"
            style={{ wordBreak: 'break-word' }}
          >
            {labelId}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">
            {typeLabel}
          </div>
          {(manufacturer || model) && (
            <div className="text-xs text-gray-500">
              {manufacturer}{manufacturer && model ? ' - ' : ''}{model}
            </div>
          )}
          
          {/* Seriennummer mit Barcode */}
          {serialNumber && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Seriennummer
              </div>
              <div data-barcode-preview className="w-full overflow-hidden">
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

// Label Print Modal Komponente
export const LabelPrintModal = ({ 
  open, 
  onOpenChange, 
  asset, 
  isDark = true 
}) => {
  const handlePrint = () => {
    printAssetLabel(asset);
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
        
        <div className="py-4">
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Vorschau des Labels für 62mm Endlosrolle:
          </p>
          
          <div className="flex justify-center">
            <LabelPreview asset={asset} isDark={isDark} />
          </div>
          
          <div className={`mt-4 p-3 rounded-lg text-sm ${isDark ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
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
  LabelPreview,
  LabelPrintModal
};
