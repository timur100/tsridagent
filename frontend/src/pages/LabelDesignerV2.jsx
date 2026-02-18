import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { 
  Save, Trash2, Plus, Eye, Printer, RotateCcw, 
  QrCode, BarChart3, Type, Image, Minus, Copy,
  Settings, FileText, Download, Upload, Check, Wifi, WifiOff,
  Ruler, ZoomIn, ZoomOut, Move, Bluetooth, Monitor, Send,
  ChevronDown, AlertCircle, CheckCircle, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import QRCodeLib from 'qrcode';
import JsBarcode from 'jsbarcode';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Element types
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

// Sample data for preview
const SAMPLE_ASSET = {
  asset_id: 'FRAT01-01-TAB-TSRi7',
  warehouse_asset_id: 'TSRID-TAB-i7-0001',
  manufacturer_sn: '1GAMNA8D0XFA',
  type: 'tab_tsr_i7',
  type_label: 'TSRID Tablet i7',
  manufacturer: 'TSRID GmbH',
  model: 'TSR-TAB-i7-2024',
};

// Print methods
const PRINT_METHODS = {
  network: { 
    id: 'network', 
    label: 'WiFi/Netzwerk', 
    icon: Wifi, 
    description: 'Direktdruck über IP (Brother QL-820NWB)',
    port: 9100
  },
  bluetooth: { 
    id: 'bluetooth', 
    label: 'Bluetooth', 
    icon: Bluetooth, 
    description: 'Für Zebra Handheld-Geräte',
    note: 'Erfordert Web Bluetooth API'
  },
  browser: { 
    id: 'browser', 
    label: 'Browser-Druck', 
    icon: Monitor, 
    description: 'Standard-Druckdialog',
    note: 'Fallback-Option'
  },
};

// WYSIWYG Constants - 1mm = 3.78px at 96dpi
const MM_TO_PX = 3.78;
const LABEL_WIDTH_MM = 62;
const GRID_COLS = 12;
const COL_WIDTH_MM = LABEL_WIDTH_MM / GRID_COLS;
const ROW_HEIGHT_MM = 5;

const LabelDesignerV2 = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Designer state
  const [elements, setElements] = useState([]);
  const [layout, setLayout] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateAssetType, setTemplateAssetType] = useState('all');
  const [isDefault, setIsDefault] = useState(false);
  const [labelHeight, setLabelHeight] = useState(6);
  const [logoUrl, setLogoUrl] = useState('');
  const [zoom, setZoom] = useState(100);
  
  // Printer state
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [selectedPrintMethod, setSelectedPrintMethod] = useState('network');
  const [printerConfig, setPrinterConfig] = useState({
    ip: '192.168.118.1',
    port: 9100,
    name: 'Brother QL-820NWB'
  });
  const [printerStatus, setPrinterStatus] = useState({ connected: false, message: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Bluetooth state
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const printCanvasRef = useRef(null);
  
  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Calculate pixel dimensions based on zoom
  const labelWidthPx = LABEL_WIDTH_MM * MM_TO_PX * (zoom / 100);
  const labelHeightPx = (labelHeight * ROW_HEIGHT_MM) * MM_TO_PX * (zoom / 100);
  const rowHeightPx = ROW_HEIGHT_MM * MM_TO_PX * (zoom / 100);
  const labelHeightMm = labelHeight * ROW_HEIGHT_MM;

  // Fetch templates and printer settings on mount
  useEffect(() => {
    fetchTemplates();
    fetchPrinterSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-templates`);
      const data = await res.json();
      if (data.success) setTemplates(data.templates || []);
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  const fetchPrinterSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        setPrinterConfig({
          ip: data.settings.ip_address || '192.168.118.1',
          port: data.settings.port || 9100,
          name: data.settings.name || 'Brother QL-820NWB'
        });
      }
    } catch (e) {
      console.error('Error fetching printer settings:', e);
    }
  };

  // Test network printer connection
  const testNetworkConnection = async () => {
    if (!printerConfig.ip) {
      toast.error('Bitte IP-Adresse eingeben');
      return;
    }
    
    setTestingConnection(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: printerConfig.ip,
          port: printerConfig.port
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setPrinterStatus({ connected: true, message: data.message });
        toast.success('Drucker verbunden!');
      } else {
        setPrinterStatus({ connected: false, message: data.message || 'Verbindung fehlgeschlagen' });
        toast.error(data.message || 'Verbindung fehlgeschlagen');
      }
    } catch (e) {
      setPrinterStatus({ connected: false, message: 'Netzwerkfehler' });
      toast.error('Netzwerkfehler beim Verbindungstest');
    }
    setTestingConnection(false);
  };

  // Connect to Bluetooth printer
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth wird von diesem Browser nicht unterstützt');
      return;
    }
    
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // Serial Port Profile
      });
      
      setBluetoothDevice(device);
      setBluetoothConnected(true);
      toast.success(`Verbunden mit ${device.name || 'Bluetooth-Drucker'}`);
    } catch (e) {
      if (e.name === 'NotFoundError') {
        // User cancelled the device selection
        return;
      }
      
      // Check for permissions policy error
      if (e.message && e.message.includes('permissions policy')) {
        toast.error('Bluetooth ist in dieser Umgebung nicht verfügbar. Bitte nutzen Sie die Electron-App oder WiFi-Druck.', { duration: 5000 });
        setBluetoothStatus({ 
          available: false, 
          message: 'Bluetooth ist nur in der Electron-App verfügbar' 
        });
      } else if (e.name === 'SecurityError') {
        toast.error('Bluetooth erfordert HTTPS und ist in dieser Umgebung eingeschränkt.', { duration: 5000 });
      } else {
        toast.error('Bluetooth-Verbindung fehlgeschlagen: ' + e.message);
      }
    }
  };
  
  // Bluetooth availability state
  const [bluetoothStatus, setBluetoothStatus] = useState({ available: true, message: '' });

  // Save printer settings
  const savePrinterSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/label-printer/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: printerConfig.ip,
          port: printerConfig.port,
          name: printerConfig.name,
          print_method: selectedPrintMethod,
          is_default: true
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Drucker-Einstellungen gespeichert');
      }
    } catch (e) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Generate label image as base64
  const generateLabelImage = async () => {
    const canvas = document.createElement('canvas');
    const scale = 4; // High resolution for printing
    const widthPx = LABEL_WIDTH_MM * MM_TO_PX * scale;
    const heightPx = labelHeightMm * MM_TO_PX * scale;
    
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    // Draw elements
    for (const element of elements) {
      const layoutItem = layout.find(l => l.i === element.id);
      if (!layoutItem) continue;
      
      const { type, config } = element;
      const x = (layoutItem.x / GRID_COLS) * widthPx;
      const y = (layoutItem.y / labelHeight) * heightPx;
      const w = (layoutItem.w / GRID_COLS) * widthPx;
      const h = (layoutItem.h / labelHeight) * heightPx;
      
      ctx.save();
      
      switch (type) {
        case 'qrcode':
          // Create QR code canvas
          const qrCanvas = document.createElement('canvas');
          const qrSize = Math.min(w, h) * 0.9;
          const qrContent = JSON.stringify({
            id: SAMPLE_ASSET.asset_id,
            sn: SAMPLE_ASSET.manufacturer_sn
          });
          
          // Use QRCodeCanvas to render
          const qrDiv = document.createElement('div');
          document.body.appendChild(qrDiv);
          const root = require('react-dom/client').createRoot(qrDiv);
          await new Promise(resolve => {
            root.render(
              <QRCodeCanvas 
                value={qrContent} 
                size={qrSize}
                level="M"
                ref={(el) => {
                  if (el) {
                    const qrCanvasEl = el;
                    ctx.drawImage(qrCanvasEl, x + (w - qrSize) / 2, y + (h - qrSize) / 2);
                    resolve();
                  }
                }}
              />
            );
            setTimeout(resolve, 100);
          });
          root.unmount();
          document.body.removeChild(qrDiv);
          break;
          
        case 'barcode':
          // For barcode we'll render as text (simplified)
          ctx.fillStyle = 'black';
          ctx.font = `bold ${Math.floor(h * 0.4)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(SAMPLE_ASSET.manufacturer_sn, x + w/2, y + h/2);
          break;
          
        case 'asset_id':
          ctx.fillStyle = 'black';
          ctx.font = `${config.fontWeight === 'bold' ? 'bold' : ''} ${(config.fontSize || 10) * scale}px Arial`;
          ctx.textAlign = config.textAlign || 'left';
          const assetX = config.textAlign === 'center' ? x + w/2 : config.textAlign === 'right' ? x + w : x;
          ctx.fillText(SAMPLE_ASSET.asset_id, assetX, y + h * 0.7);
          break;
          
        case 'serial_number':
          ctx.fillStyle = 'black';
          ctx.font = `${(config.fontSize || 10) * scale}px monospace`;
          ctx.textAlign = config.textAlign || 'left';
          const snX = config.textAlign === 'center' ? x + w/2 : config.textAlign === 'right' ? x + w : x;
          ctx.fillText(`SN: ${SAMPLE_ASSET.manufacturer_sn}`, snX, y + h * 0.7);
          break;
          
        case 'device_type':
          ctx.fillStyle = 'black';
          ctx.font = `${(config.fontSize || 10) * scale}px Arial`;
          ctx.fillText(SAMPLE_ASSET.type_label, x, y + h * 0.7);
          break;
          
        case 'manufacturer':
          ctx.fillStyle = 'black';
          ctx.font = `${(config.fontSize || 10) * scale}px Arial`;
          ctx.fillText(SAMPLE_ASSET.manufacturer, x, y + h * 0.7);
          break;
          
        case 'model':
          ctx.fillStyle = 'black';
          ctx.font = `${(config.fontSize || 10) * scale}px Arial`;
          ctx.fillText(SAMPLE_ASSET.model, x, y + h * 0.7);
          break;
          
        case 'custom_text':
          ctx.fillStyle = 'black';
          ctx.font = `${(config.fontSize || 10) * scale}px Arial`;
          ctx.fillText(config.customText || '', x, y + h * 0.7);
          break;
          
        case 'logo':
          if (logoUrl) {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = () => {
                const ratio = Math.min(w / img.width, h / img.height);
                const imgW = img.width * ratio * 0.9;
                const imgH = img.height * ratio * 0.9;
                ctx.drawImage(img, x + (w - imgW) / 2, y + (h - imgH) / 2, imgW, imgH);
                resolve();
              };
              img.onerror = reject;
              img.src = logoUrl;
            });
          }
          break;
          
        case 'line':
          ctx.strokeStyle = config.lineColor || 'black';
          ctx.lineWidth = 2;
          if (config.lineStyle === 'dashed') {
            ctx.setLineDash([10, 5]);
          } else if (config.lineStyle === 'dotted') {
            ctx.setLineDash([2, 2]);
          }
          ctx.beginPath();
          ctx.moveTo(x, y + h/2);
          ctx.lineTo(x + w, y + h/2);
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    }
    
    return canvas.toDataURL('image/png');
  };

  // Print via network (Brother QL-820NWB)
  const printViaNetwork = async () => {
    setIsPrinting(true);
    toast.loading('Label wird gedruckt...', { id: 'print' });
    
    try {
      // Generate label data
      const labelData = {
        asset_id: SAMPLE_ASSET.asset_id,
        type_label: SAMPLE_ASSET.type_label,
        manufacturer_sn: SAMPLE_ASSET.manufacturer_sn,
        location_name: null,
        qr_content: JSON.stringify({
          id: SAMPLE_ASSET.asset_id,
          sn: SAMPLE_ASSET.manufacturer_sn
        })
      };
      
      const res = await fetch(`${BACKEND_URL}/api/label-printer/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_ip: printerConfig.ip,
          printer_port: printerConfig.port,
          label: labelData,
          copies: 1
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Label erfolgreich gedruckt!', { id: 'print' });
      } else {
        toast.error(data.detail || 'Druckfehler', { id: 'print' });
      }
    } catch (e) {
      toast.error('Netzwerkfehler beim Drucken: ' + e.message, { id: 'print' });
    }
    
    setIsPrinting(false);
  };

  // Print via Bluetooth
  const printViaBluetooth = async () => {
    if (!bluetoothDevice) {
      toast.error('Kein Bluetooth-Drucker verbunden');
      return;
    }
    
    setIsPrinting(true);
    toast.loading('Label wird über Bluetooth gedruckt...', { id: 'print' });
    
    try {
      // For Zebra printers, we'd send ZPL commands
      // This is a simplified example
      const zplCommand = `
^XA
^FO50,50^BQN,2,5^FDQA,${SAMPLE_ASSET.asset_id}^FS
^FO200,50^A0N,30,30^FD${SAMPLE_ASSET.asset_id}^FS
^FO200,90^A0N,25,25^FD${SAMPLE_ASSET.type_label}^FS
^FO200,130^A0N,20,20^FDSN: ${SAMPLE_ASSET.manufacturer_sn}^FS
^XZ
      `.trim();
      
      // Note: Actual Bluetooth printing requires connecting to GATT service
      // This is platform-specific and may require native app support
      toast.success('ZPL-Befehl generiert (Bluetooth-Druck erfordert native App)', { id: 'print' });
      console.log('ZPL Command:', zplCommand);
    } catch (e) {
      toast.error('Bluetooth-Druckfehler: ' + e.message, { id: 'print' });
    }
    
    setIsPrinting(false);
  };

  // Print via browser - generates images BEFORE opening print window
  const printViaBrowser = async () => {
    setIsPrinting(true);
    toast.loading('Label wird vorbereitet...', { id: 'print-prep' });
    
    const labelId = SAMPLE_ASSET.asset_id;
    const serialNumber = SAMPLE_ASSET.manufacturer_sn;
    const typeLabel = SAMPLE_ASSET.type_label;
    
    // Pre-generate QR codes and barcodes as base64 images
    const qrImages = {};
    const barcodeImages = {};
    
    // Generate QR codes using qrcode library - QR contains only the Asset-ID
    for (const element of elements.filter(e => e.type === 'qrcode')) {
      try {
        const qrDataUrl = await QRCodeLib.toDataURL(labelId, { 
          width: 400, 
          margin: 1,
          errorCorrectionLevel: 'H'
        });
        qrImages[element.id] = qrDataUrl;
        console.log('QR generated for', element.id, 'content:', labelId);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }
    
    // Generate barcodes using jsbarcode
    for (const element of elements.filter(e => e.type === 'barcode')) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, serialNumber, {
          format: element.config?.barcodeFormat || 'CODE128',
          width: 2,
          height: 50,
          displayValue: element.config?.showValue !== false,
          fontSize: 12,
          margin: 0,
          background: '#ffffff'
        });
        barcodeImages[element.id] = canvas.toDataURL('image/png');
        console.log('Barcode generated for', element.id);
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
    
    toast.dismiss('print-prep');
    
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      toast.error('Popup-Blocker aktiv - bitte Popups erlauben');
      setIsPrinting(false);
      return;
    }

    // Generate element HTML with pre-rendered images
    let elementsHtml = '';
    for (const element of elements) {
      const layoutItem = layout.find(l => l.i === element.id);
      if (!layoutItem) continue;
      
      const { type, config } = element;
      const left = (layoutItem.x / GRID_COLS) * LABEL_WIDTH_MM;
      const top = (layoutItem.y / labelHeight) * labelHeightMm;
      const width = (layoutItem.w / GRID_COLS) * LABEL_WIDTH_MM;
      const height = (layoutItem.h / labelHeight) * labelHeightMm;
      
      const posStyle = `position:absolute;left:${left}mm;top:${top}mm;width:${width}mm;height:${height}mm;overflow:hidden;`;
      const textStyle = `font-size:${config.fontSize || 10}pt;font-weight:${config.fontWeight || 'normal'};display:flex;align-items:center;justify-content:${config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start'};color:#000;`;
      
      switch (type) {
        case 'qrcode':
          // Use pre-generated QR code image with crisp rendering
          if (qrImages[element.id]) {
            elementsHtml += `<div style="${posStyle}display:flex;align-items:center;justify-content:center;"><img src="${qrImages[element.id]}" style="width:${Math.min(width, height) - 1}mm;height:${Math.min(width, height) - 1}mm;object-fit:contain;image-rendering:pixelated;image-rendering:-moz-crisp-edges;image-rendering:crisp-edges;" /></div>`;
          }
          break;
        case 'barcode':
          // Use pre-generated barcode image
          if (barcodeImages[element.id]) {
            elementsHtml += `<div style="${posStyle}display:flex;align-items:center;justify-content:center;"><img src="${barcodeImages[element.id]}" style="max-width:100%;max-height:100%;object-fit:contain;" /></div>`;
          }
          break;
        case 'asset_id':
          elementsHtml += `<div style="${posStyle}${textStyle}">${labelId}</div>`;
          break;
        case 'serial_number':
          elementsHtml += `<div style="${posStyle}${textStyle}font-family:monospace;">SN: ${serialNumber}</div>`;
          break;
        case 'device_type':
          elementsHtml += `<div style="${posStyle}${textStyle}">${typeLabel}</div>`;
          break;
        case 'manufacturer':
          elementsHtml += `<div style="${posStyle}${textStyle}">${SAMPLE_ASSET.manufacturer}</div>`;
          break;
        case 'model':
          elementsHtml += `<div style="${posStyle}${textStyle}">${SAMPLE_ASSET.model}</div>`;
          break;
        case 'custom_text':
          elementsHtml += `<div style="${posStyle}${textStyle}">${config.customText || ''}</div>`;
          break;
        case 'logo':
          if (logoUrl) {
            elementsHtml += `<div style="${posStyle}display:flex;align-items:center;justify-content:center;"><img src="${logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain;"/></div>`;
          }
          break;
        case 'line':
          elementsHtml += `<div style="${posStyle}display:flex;align-items:center;"><div style="width:100%;border-top:1px ${config.lineStyle||'solid'} ${config.lineColor||'#000'};"></div></div>`;
          break;
        default:
          break;
      }
    }
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Label: ${labelId}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:62mm ${labelHeightMm + 2}mm;margin:0;}
    @media print{
      html,body{width:62mm;height:${labelHeightMm + 2}mm;margin:0;padding:0;overflow:hidden;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .no-print{display:none !important;}
    }
    body{font-family:Arial,sans-serif;width:62mm;background:white;}
    .label-container{position:relative;width:62mm;height:${labelHeightMm}mm;padding:1mm;background:white;overflow:hidden;}
    img{display:block;}
  </style>
</head>
<body>
  <div class="label-container">
    ${elementsHtml}
  </div>
  <script>
    // Wait for all images to load, then print
    var images = document.querySelectorAll('img');
    var loadedCount = 0;
    var totalImages = images.length;
    
    console.log('Total images to load:', totalImages);
    
    function checkAllLoaded() {
      loadedCount++;
      console.log('Image loaded:', loadedCount, '/', totalImages);
      if (loadedCount >= totalImages) {
        // All images loaded, trigger print
        console.log('All images loaded, printing...');
        setTimeout(function() { 
          window.print(); 
        }, 200);
      }
    }
    
    if (totalImages === 0) {
      // No images, print immediately
      console.log('No images, printing immediately...');
      setTimeout(function() { window.print(); }, 200);
    } else {
      images.forEach(function(img) {
        if (img.complete && img.naturalHeight !== 0) {
          checkAllLoaded();
        } else {
          img.onload = checkAllLoaded;
          img.onerror = function() {
            console.error('Image failed to load:', img.src.substring(0, 50));
            checkAllLoaded();
          };
        }
      });
    }
  <\/script>
</body>
</html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setIsPrinting(false);
  };

  // Main print function
  const handlePrint = async () => {
    switch (selectedPrintMethod) {
      case 'network':
        await printViaNetwork();
        break;
      case 'bluetooth':
        await printViaBluetooth();
        break;
      case 'browser':
      default:
        await printViaBrowser();
        break;
    }
  };

  // Add element
  const addElement = (type) => {
    const config = ELEMENT_TYPES[type];
    const newId = `${type}_${Date.now()}`;
    
    const newElement = {
      id: newId,
      type,
      config: {
        fontSize: ['asset_id', 'serial_number', 'device_type', 'manufacturer', 'model', 'custom_text'].includes(type) ? 10 : undefined,
        fontWeight: type === 'asset_id' ? 'bold' : 'normal',
        textAlign: 'left',
        customText: type === 'custom_text' ? 'Text' : undefined,
        barcodeFormat: type === 'barcode' ? 'CODE128' : undefined,
        showValue: type === 'barcode' ? true : undefined,
        lineStyle: type === 'line' ? 'solid' : undefined,
        lineColor: type === 'line' ? '#000000' : undefined,
      }
    };
    
    const maxY = layout.length > 0 ? Math.max(...layout.map(l => l.y + l.h)) : 0;
    const newLayoutItem = {
      i: newId,
      x: 0,
      y: maxY,
      w: config.defaultW,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    };
    
    setElements(prev => [...prev, newElement]);
    setLayout(prev => [...prev, newLayoutItem]);
    setSelectedElement(newId);
    
    if (maxY + config.defaultH > labelHeight) {
      setLabelHeight(maxY + config.defaultH + 1);
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
    setElements(prev => [...prev, { ...element, id: newId, config: { ...element.config } }]);
    setLayout(prev => [...prev, { ...layoutItem, i: newId, y: layoutItem.y + layoutItem.h }]);
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
    if (newLayout.length > 0) {
      const maxY = Math.max(...newLayout.map(l => l.y + l.h));
      if (maxY > labelHeight - 1) setLabelHeight(maxY + 1);
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
      elements,
      layout,
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
        if (!currentTemplate) setCurrentTemplate(data.template);
      } else {
        toast.error(data.detail || 'Fehler beim Speichern');
      }
    } catch (e) {
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
      const res = await fetch(`${BACKEND_URL}/api/label-templates/${templateId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Template gelöscht');
        fetchTemplates();
        if (currentTemplate?.template_id === templateId) resetDesigner();
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Reset
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

  // Render element content (WYSIWYG)
  const renderElementContent = (element, scale = 1) => {
    const { type, config } = element;
    const fontSize = (config.fontSize || 10) * scale;
    
    const textStyle = {
      fontSize: `${fontSize}pt`,
      fontWeight: config.fontWeight || 'normal',
      textAlign: config.textAlign || 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      color: '#000',
      padding: '1px 2px',
    };
    
    switch (type) {
      case 'qrcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white">
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
              width={1.2}
              height={35}
              displayValue={config.showValue !== false}
              fontSize={9}
              margin={0}
              background="transparent"
            />
          </div>
        );
      case 'asset_id':
        return <div style={textStyle} className="bg-white">{SAMPLE_ASSET.asset_id}</div>;
      case 'serial_number':
        return <div style={{ ...textStyle, fontFamily: 'monospace' }} className="bg-white">SN: {SAMPLE_ASSET.manufacturer_sn}</div>;
      case 'device_type':
        return <div style={textStyle} className="bg-white">{SAMPLE_ASSET.type_label}</div>;
      case 'manufacturer':
        return <div style={textStyle} className="bg-white">{SAMPLE_ASSET.manufacturer}</div>;
      case 'model':
        return <div style={textStyle} className="bg-white">{SAMPLE_ASSET.model}</div>;
      case 'custom_text':
        return <div style={textStyle} className="bg-white">{config.customText || 'Text'}</div>;
      case 'logo':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-gray-400 text-xs text-center">Logo</div>
            )}
          </div>
        );
      case 'line':
        return (
          <div className="w-full h-full flex items-center bg-white">
            <div style={{ width: '100%', borderTop: `1px ${config.lineStyle || 'solid'} ${config.lineColor || '#000'}` }} />
          </div>
        );
      default:
        return <div className="w-full h-full bg-gray-200" />;
    }
  };

  const selectedElementData = selectedElement ? elements.find(e => e.id === selectedElement) : null;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100'}`} data-testid="label-designer-v2">
      {/* Header */}
      <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <div>
            <h1 className="text-lg font-bold">Label-Designer V2</h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentTemplate ? currentTemplate.name : 'Neues Template'} • {LABEL_WIDTH_MM}mm × {labelHeightMm}mm
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 mr-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(50, zoom - 25))} data-testid="zoom-out-btn">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))} data-testid="zoom-in-btn">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Printer Settings Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPrinterDialog(true)}
            className={`${printerStatus.connected ? 'border-green-500 text-green-500' : ''}`}
            data-testid="printer-settings-btn"
          >
            {printerStatus.connected ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
            Drucker
          </Button>
          
          <Button variant="outline" size="sm" onClick={resetDesigner} data-testid="reset-btn">
            <RotateCcw className="h-4 w-4 mr-1" />
            Neu
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={isPrinting || elements.length === 0}
            data-testid="test-print-btn"
          >
            {isPrinting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
            Test-Druck
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowSaveDialog(true)} data-testid="save-template-btn">
            <Save className="h-4 w-4 mr-1" />
            Speichern
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Elements */}
        <div className={`w-56 border-r overflow-y-auto ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
          <div className="p-3">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Elemente
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(ELEMENT_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addElement(type)}
                    data-testid={`add-element-${type}`}
                    className={`p-2 rounded border text-xs flex flex-col items-center gap-1 transition-colors ${
                      isDark ? 'border-gray-600 hover:bg-gray-700 hover:border-blue-500' : 'border-gray-200 hover:bg-blue-50 hover:border-blue-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-center leading-tight text-[10px]">{config.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Logo Upload */}
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h4 className="text-xs font-medium mb-2">Logo</h4>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />
                Hochladen
              </Button>
              {logoUrl && (
                <div className="mt-2 p-1 bg-white rounded border">
                  <img src={logoUrl} alt="Logo" className="max-h-10 mx-auto" />
                </div>
              )}
            </div>
            
            {/* Templates */}
            <div className="mt-3 pt-3 border-t border-gray-600">
              <h4 className="text-xs font-medium mb-2">Templates ({templates.length})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {templates.map(template => (
                  <div 
                    key={template.template_id}
                    className={`p-1.5 rounded border cursor-pointer text-xs ${
                      currentTemplate?.template_id === template.template_id
                        ? 'border-blue-500 bg-blue-500/10'
                        : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200'
                    }`}
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{template.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteTemplate(template.template_id); }} className="text-red-500 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {template.is_default && <Badge variant="outline" className="text-[10px] mt-0.5">Standard</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center - WYSIWYG Canvas */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center" style={{ background: isDark ? '#111' : '#e5e5e5' }}>
          {/* Ruler (Top) */}
          <div className="flex items-end mb-1" style={{ width: labelWidthPx, marginLeft: '20px' }}>
            {[0, 10, 20, 30, 40, 50, 60].map(mm => (
              <div key={mm} className="text-[8px] text-gray-500" style={{ width: `${10 * MM_TO_PX * (zoom / 100)}px`, textAlign: mm === 0 ? 'left' : 'center' }}>
                {mm}mm
              </div>
            ))}
          </div>
          
          <div className="flex">
            {/* Ruler (Left) */}
            <div className="flex flex-col mr-1" style={{ height: labelHeightPx }}>
              {Array.from({ length: Math.ceil(labelHeightMm / 10) + 1 }).map((_, i) => (
                <div key={i} className="text-[8px] text-gray-500 text-right pr-1" style={{ height: `${10 * MM_TO_PX * (zoom / 100)}px` }}>
                  {i * 10}mm
                </div>
              ))}
            </div>
            
            {/* Canvas */}
            <div 
              ref={canvasRef}
              className="bg-white border-2 border-gray-400 shadow-lg relative"
              style={{ 
                width: labelWidthPx,
                height: labelHeightPx,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
              data-testid="label-canvas"
            >
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
                  <div 
                    key={`v${i}`} 
                    className="absolute top-0 bottom-0 border-l border-blue-300"
                    style={{ left: `${(i / GRID_COLS) * 100}%` }}
                  />
                ))}
                {Array.from({ length: labelHeight + 1 }).map((_, i) => (
                  <div 
                    key={`h${i}`} 
                    className="absolute left-0 right-0 border-t border-blue-300"
                    style={{ top: `${(i / labelHeight) * 100}%` }}
                  />
                ))}
              </div>
              
              <GridLayout
                className="layout"
                layout={layout}
                cols={GRID_COLS}
                rowHeight={rowHeightPx}
                width={labelWidthPx}
                onLayoutChange={onLayoutChange}
                isDraggable
                isResizable
                compactType={null}
                preventCollision={false}
                margin={[0, 0]}
                containerPadding={[0, 0]}
              >
                {elements.map(element => (
                  <div 
                    key={element.id}
                    className={`cursor-move border ${selectedElement === element.id ? 'border-blue-500 border-2' : 'border-transparent hover:border-blue-300'}`}
                    onClick={() => setSelectedElement(element.id)}
                    data-testid={`element-${element.id}`}
                  >
                    {renderElementContent(element, zoom / 100)}
                  </div>
                ))}
              </GridLayout>
              
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                  <div className="text-center">
                    <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Elemente hierher ziehen</p>
                    <p className="text-xs mt-1">oder links auswählen</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Height Slider */}
          <div className="mt-4 flex items-center gap-3 bg-white/10 p-2 rounded">
            <Ruler className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">Höhe:</span>
            <Slider
              value={[labelHeight]}
              onValueChange={([v]) => setLabelHeight(v)}
              min={2}
              max={20}
              step={1}
              className="w-40"
            />
            <span className="text-xs text-gray-400 w-16">{labelHeightMm}mm</span>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className={`w-64 border-l overflow-y-auto ${isDark ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
          <div className="p-3">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Eigenschaften
            </h3>
            
            {selectedElementData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="text-xs">{ELEMENT_TYPES[selectedElementData.type]?.label}</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => duplicateElement(selectedElement)} className="h-7 w-7 p-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeElement(selectedElement)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
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
                        className={`mt-1 h-8 text-sm ${inputBg}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Schriftstärke</Label>
                      <Select value={selectedElementData.config.fontWeight || 'normal'} onValueChange={(v) => updateElementConfig(selectedElement, 'fontWeight', v)}>
                        <SelectTrigger className={`mt-1 h-8 text-sm ${inputBg}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Fett</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Ausrichtung</Label>
                      <Select value={selectedElementData.config.textAlign || 'left'} onValueChange={(v) => updateElementConfig(selectedElement, 'textAlign', v)}>
                        <SelectTrigger className={`mt-1 h-8 text-sm ${inputBg}`}><SelectValue /></SelectTrigger>
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
                          className={`mt-1 h-8 text-sm ${inputBg}`}
                        />
                      </div>
                    )}
                  </>
                )}
                
                {selectedElementData.type === 'barcode' && (
                  <>
                    <div>
                      <Label className="text-xs">Format</Label>
                      <Select value={selectedElementData.config.barcodeFormat || 'CODE128'} onValueChange={(v) => updateElementConfig(selectedElement, 'barcodeFormat', v)}>
                        <SelectTrigger className={`mt-1 h-8 text-sm ${inputBg}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CODE128">CODE128</SelectItem>
                          <SelectItem value="CODE39">CODE39</SelectItem>
                          <SelectItem value="EAN13">EAN13</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Wert anzeigen</Label>
                      <Switch checked={selectedElementData.config.showValue !== false} onCheckedChange={(v) => updateElementConfig(selectedElement, 'showValue', v)} />
                    </div>
                  </>
                )}
                
                {selectedElementData.type === 'line' && (
                  <div>
                    <Label className="text-xs">Stil</Label>
                    <Select value={selectedElementData.config.lineStyle || 'solid'} onValueChange={(v) => updateElementConfig(selectedElement, 'lineStyle', v)}>
                      <SelectTrigger className={`mt-1 h-8 text-sm ${inputBg}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Durchgezogen</SelectItem>
                        <SelectItem value="dashed">Gestrichelt</SelectItem>
                        <SelectItem value="dotted">Gepunktet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Element auswählen</p>
            )}
            
            {/* Print Method Selection */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
                <Printer className="h-3 w-3" />
                Druckmethode
              </h4>
              <Select value={selectedPrintMethod} onValueChange={setSelectedPrintMethod}>
                <SelectTrigger className={`h-8 text-xs ${inputBg}`} data-testid="print-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRINT_METHODS).map(method => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3" />
                          {method.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {PRINT_METHODS[selectedPrintMethod]?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className={isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>Template speichern</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="z.B. Standard-Label" className={`mt-1 ${inputBg}`} />
            </div>
            <div>
              <Label className="text-sm">Beschreibung</Label>
              <Input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Optional" className={`mt-1 ${inputBg}`} />
            </div>
            <div>
              <Label className="text-sm">Asset-Typ</Label>
              <Select value={templateAssetType} onValueChange={setTemplateAssetType}>
                <SelectTrigger className={`mt-1 ${inputBg}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="tab_tsr_i7">TSRID Tablet i7</SelectItem>
                  <SelectItem value="tab_tsr_i5">TSRID Tablet i5</SelectItem>
                  <SelectItem value="sca_tsr">TSRID Scanner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Als Standard</Label>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Abbrechen</Button>
            <Button onClick={saveTemplate} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printer Settings Dialog */}
      <Dialog open={showPrinterDialog} onOpenChange={setShowPrinterDialog}>
        <DialogContent className={`max-w-lg ${isDark ? 'bg-[#2d2d2d] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <Settings className="h-5 w-5" />
              Drucker-Einstellungen
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : ''}>
              Konfigurieren Sie die Druckverbindung für den Label-Druck
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="network" value={selectedPrintMethod} onValueChange={setSelectedPrintMethod} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="network" className="text-xs">
                <Wifi className="h-3 w-3 mr-1" />WiFi/Netzwerk
              </TabsTrigger>
              <TabsTrigger value="bluetooth" className="text-xs">
                <Bluetooth className="h-3 w-3 mr-1" />Bluetooth
              </TabsTrigger>
              <TabsTrigger value="browser" className="text-xs">
                <Monitor className="h-3 w-3 mr-1" />Browser
              </TabsTrigger>
            </TabsList>
            
            {/* Network Tab */}
            <TabsContent value="network" className="space-y-4 mt-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Brother QL-820NWB (Netzwerk)</p>
                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Direkter Druck über TCP/IP auf Port 9100</p>
              </div>
              
              <div>
                <Label className="text-sm">IP-Adresse *</Label>
                <Input 
                  value={printerConfig.ip} 
                  onChange={(e) => setPrinterConfig(prev => ({ ...prev, ip: e.target.value }))} 
                  placeholder="192.168.118.1" 
                  className={`mt-1 ${inputBg}`}
                  data-testid="printer-ip-input"
                />
              </div>
              <div>
                <Label className="text-sm">Port</Label>
                <Input 
                  type="number"
                  value={printerConfig.port} 
                  onChange={(e) => setPrinterConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))} 
                  className={`mt-1 ${inputBg}`} 
                />
              </div>
              
              {/* Connection Status */}
              <div className={`p-3 rounded-lg ${printerStatus.connected ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className="flex items-center gap-2">
                  {printerStatus.connected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>{printerStatus.message || 'Verbunden'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{printerStatus.message || 'Nicht verbunden'}</span>
                    </>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={testNetworkConnection} 
                disabled={testingConnection}
                variant="outline"
                className="w-full"
                data-testid="test-connection-btn"
              >
                {testingConnection ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Teste Verbindung...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Verbindung testen</>
                )}
              </Button>
            </TabsContent>
            
            {/* Bluetooth Tab */}
            <TabsContent value="bluetooth" className="space-y-4 mt-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Bluetooth-Drucker (Zebra)</p>
                <p className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Für mobile Handheld-Geräte mit ZPL-Unterstützung</p>
              </div>
              
              {/* Bluetooth Status */}
              <div className={`p-3 rounded-lg ${
                bluetoothConnected 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : !bluetoothStatus.available 
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-gray-500/10 border border-gray-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {bluetoothConnected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        Verbunden: {bluetoothDevice?.name || 'Bluetooth-Drucker'}
                      </span>
                    </>
                  ) : !bluetoothStatus.available ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {bluetoothStatus.message || 'Bluetooth nicht verfügbar'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="h-5 w-5 text-gray-500" />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Kein Gerät verbunden</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Warning for web environment */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>Eingeschränkte Verfügbarkeit</p>
                    <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Bluetooth funktioniert nur in der <strong>Electron-Desktop-App</strong> oder lokal in Chrome/Edge. 
                      In Web-Umgebungen nutzen Sie bitte <strong>WiFi/Netzwerk-Druck</strong> für Zebra-Drucker.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={connectBluetooth}
                variant="outline"
                className="w-full"
                disabled={!bluetoothStatus.available}
                data-testid="connect-bluetooth-btn"
              >
                <Bluetooth className="h-4 w-4 mr-2" />
                Bluetooth-Drucker suchen
              </Button>
              
              {/* Alternative: Zebra via WiFi */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  💡 Alternative: Zebra-Drucker unterstützen auch WiFi-Druck!
                </p>
                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} mt-1`}>
                  Verbinden Sie Ihren Zebra-Drucker mit dem WLAN und nutzen Sie den WiFi/Netzwerk-Tab mit der IP-Adresse des Druckers.
                </p>
              </div>
            </TabsContent>
            
            {/* Browser Tab */}
            <TabsContent value="browser" className="space-y-4 mt-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-500/10 border border-gray-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Browser-Druck</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Standard-Druckdialog des Browsers verwenden</p>
              </div>
              
              <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>Hinweis</p>
                    <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Der Browser-Druck ist eine Fallback-Option. QR-Codes und Barcodes werden möglicherweise nicht zuverlässig gedruckt.
                      Für beste Ergebnisse empfehlen wir den Netzwerkdruck.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="font-medium mb-1">Druckeinstellungen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Papierformat: 62mm × Auto</li>
                  <li>Seitenränder: 0mm</li>
                  <li>Skalierung: 100%</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowPrinterDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={savePrinterSettings} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-1" />
              Einstellungen speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabelDesignerV2;
