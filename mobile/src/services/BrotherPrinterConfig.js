/**
 * Brother Printer Configuration and Commands
 * Supports Brother QL series with various label formats
 */

// Label formats supported by Brother QL-820NWB
export const BROTHER_LABEL_FORMATS = {
  // Continuous rolls (Endlos)
  'DK-22205': {
    id: 'DK-22205',
    name: '62mm Endlos',
    width: 62,
    type: 'continuous',
    maxPrintWidth: 696, // pixels at 300dpi
    description: 'Endlos-Papier 62mm breit',
  },
  'DK-22211': {
    id: 'DK-22211',
    name: '29mm Endlos',
    width: 29,
    type: 'continuous',
    maxPrintWidth: 306,
    description: 'Endlos-Film 29mm breit',
  },
  'DK-22210': {
    id: 'DK-22210',
    name: '29mm Endlos Papier',
    width: 29,
    type: 'continuous',
    maxPrintWidth: 306,
    description: 'Endlos-Papier 29mm breit',
  },
  'DK-22212': {
    id: 'DK-22212',
    name: '62mm Endlos Film',
    width: 62,
    type: 'continuous',
    maxPrintWidth: 696,
    description: 'Endlos-Film 62mm breit',
  },
  // Die-cut labels
  'DK-11201': {
    id: 'DK-11201',
    name: '29x90mm',
    width: 29,
    height: 90,
    type: 'die-cut',
    maxPrintWidth: 306,
    description: 'Standard Adress-Etiketten',
  },
  'DK-11202': {
    id: 'DK-11202',
    name: '62x100mm',
    width: 62,
    height: 100,
    type: 'die-cut',
    maxPrintWidth: 696,
    description: 'Versand-Etiketten',
  },
  'DK-11204': {
    id: 'DK-11204',
    name: '17x54mm',
    width: 17,
    height: 54,
    type: 'die-cut',
    maxPrintWidth: 165,
    description: 'Mehrzweck-Etiketten',
  },
};

// Label templates
export const LABEL_TEMPLATES = {
  'asset-standard': {
    id: 'asset-standard',
    name: 'Asset Standard',
    description: 'Asset-ID, Typ, Seriennummer, QR-Code',
    fields: ['asset_id', 'type', 'serial_number', 'qr_code'],
    minWidth: 62,
  },
  'asset-compact': {
    id: 'asset-compact',
    name: 'Asset Kompakt',
    description: 'Asset-ID und QR-Code',
    fields: ['asset_id', 'qr_code'],
    minWidth: 29,
  },
  'asset-detailed': {
    id: 'asset-detailed',
    name: 'Asset Detailliert',
    description: 'Alle Asset-Informationen',
    fields: ['asset_id', 'type', 'manufacturer', 'serial_number', 'location', 'qr_code', 'barcode'],
    minWidth: 62,
  },
  'inventory': {
    id: 'inventory',
    name: 'Inventar',
    description: 'Für Inventur-Zwecke',
    fields: ['asset_id', 'location', 'date', 'qr_code'],
    minWidth: 62,
  },
  'simple-text': {
    id: 'simple-text',
    name: 'Einfacher Text',
    description: 'Nur Text ohne Barcodes',
    fields: ['asset_id', 'type', 'serial_number'],
    minWidth: 29,
  },
};

// ESC/P Commands for Brother QL printers
export const BROTHER_COMMANDS = {
  // Initialize printer
  INIT: '\x1B@',
  
  // Print mode
  PRINT_MODE_STANDARD: '\x1Bia\x00',
  PRINT_MODE_RASTER: '\x1Bia\x01',
  
  // Media type
  MEDIA_CONTINUOUS: '\x1Bic\x00',
  MEDIA_DIE_CUT: '\x1Bic\x01',
  
  // Print quality
  QUALITY_FAST: '\x1BiK\x08',
  QUALITY_HIGH: '\x1BiK\x40',
  
  // Cut settings
  AUTO_CUT_ON: '\x1BiM\x40',
  AUTO_CUT_OFF: '\x1BiM\x00',
  
  // Form feed / cut
  FORM_FEED: '\x0C',
  
  // Print command
  PRINT: '\x1BiZ',
};

/**
 * Generate Brother ESC/P commands for 62mm continuous label
 */
export function generateBrotherLabelCommands(content, options = {}) {
  const {
    labelFormat = 'DK-22205', // Default: 62mm continuous
    labelHeight = 40, // Height in mm for continuous labels
    autoCut = true,
    copies = 1,
  } = options;

  const format = BROTHER_LABEL_FORMATS[labelFormat] || BROTHER_LABEL_FORMATS['DK-22205'];
  const ESC = '\x1B';
  
  const commands = [];
  
  // Initialize printer
  commands.push(`${ESC}@`);
  
  // Set print mode to standard (text mode)
  commands.push(`${ESC}ia\x00`);
  
  // Set media type
  if (format.type === 'continuous') {
    commands.push(`${ESC}ic\x00`); // Continuous
  } else {
    commands.push(`${ESC}ic\x01`); // Die-cut
  }
  
  // Set label width (62mm = 0x3E)
  const widthByte = String.fromCharCode(format.width);
  commands.push(`${ESC}iw${widthByte}`);
  
  // Set auto-cut
  if (autoCut) {
    commands.push(`${ESC}iM\x40`);
  } else {
    commands.push(`${ESC}iM\x00`);
  }
  
  // Set print quality (high)
  commands.push(`${ESC}iK\x40`);
  
  // Add content
  commands.push(content);
  
  // Form feed / print
  commands.push('\x0C');
  
  return commands.join('');
}

/**
 * Generate label content for asset
 */
export function generateAssetLabelContent(asset, template = 'asset-standard') {
  const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
  const serialNumber = asset.manufacturer_sn || asset.serial_number || 'N/A';
  const type = asset.type_label || asset.type || 'N/A';
  const manufacturer = asset.manufacturer || 'N/A';
  const location = asset.location_name || asset.location || '';
  
  const lines = [];
  
  switch (template) {
    case 'asset-compact':
      lines.push(`${assetId}`);
      break;
      
    case 'asset-detailed':
      lines.push(`ID: ${assetId}`);
      lines.push(`Typ: ${type}`);
      lines.push(`Hersteller: ${manufacturer}`);
      lines.push(`SN: ${serialNumber}`);
      if (location) {
        lines.push(`Standort: ${location}`);
      }
      break;
      
    case 'inventory':
      lines.push(`${assetId}`);
      if (location) {
        lines.push(`${location}`);
      }
      lines.push(`Datum: ${new Date().toLocaleDateString('de-DE')}`);
      break;
      
    case 'simple-text':
      lines.push(`${assetId}`);
      lines.push(`${type}`);
      lines.push(`SN: ${serialNumber}`);
      break;
      
    case 'asset-standard':
    default:
      lines.push(`${assetId}`);
      lines.push(`Typ: ${type}`);
      lines.push(`SN: ${serialNumber}`);
      break;
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Generate test label content
 */
export function generateTestLabelContent() {
  const timestamp = new Date().toLocaleString('de-DE');
  return [
    'TSRID Mobile',
    'Test-Etikett',
    timestamp,
    '----------------',
    'Drucktest OK',
    '',
  ].join('\n');
}

export default {
  BROTHER_LABEL_FORMATS,
  LABEL_TEMPLATES,
  BROTHER_COMMANDS,
  generateBrotherLabelCommands,
  generateAssetLabelContent,
  generateTestLabelContent,
};
