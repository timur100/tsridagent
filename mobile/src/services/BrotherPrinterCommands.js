/**
 * Brother QL Printer Commands
 * 
 * Brother QL printers use a binary raster protocol.
 * This module generates the correct binary commands for 62mm continuous labels.
 */

// ESC/P and Brother-specific control codes
const ESC = '\x1B';
const NULL = '\x00';

/**
 * Create initialization commands for Brother QL printer
 */
export function createInitCommands() {
  const commands = [];
  
  // Invalidate - clear the buffer
  commands.push(NULL.repeat(200));
  
  // Initialize
  commands.push(ESC + '@');
  
  return commands.join('');
}

/**
 * Create status request command
 */
export function createStatusRequestCommand() {
  return ESC + 'iS';
}

/**
 * Create print information command for 62mm continuous roll
 * @param {number} labelLengthMM - Length of the label in mm
 */
export function createPrintInfoCommand(labelLengthMM = 40) {
  const commands = [];
  
  // Print information command
  // ESC i z {n1} {n2} {n3} {n4} {n5} {n6} {n7} {n8} {n9} {n10}
  
  const printInfoCommand = [
    ESC, 'i', 'z',
    String.fromCharCode(0x86),  // n1: Valid flag - PI_KIND, PI_WIDTH, PI_LENGTH, PI_QUALITY
    String.fromCharCode(0x0A),  // n2: Media type - Continuous roll (0x0A)
    String.fromCharCode(0x3E),  // n3: Media width - 62mm (0x3E = 62)
    String.fromCharCode(0x00),  // n4: Media length (0 for continuous)
    String.fromCharCode(labelLengthMM & 0xFF),  // n5: Label length low byte (dots) - not used for continuous
    String.fromCharCode((labelLengthMM >> 8) & 0xFF),  // n6: Label length high byte
    String.fromCharCode(0x00),  // n7: Page number (starting)
    String.fromCharCode(0x00),  // n8: Page number (starting) high
    String.fromCharCode(0x00),  // n9: reserved
    String.fromCharCode(0x00),  // n10: reserved
  ];
  
  commands.push(printInfoCommand.join(''));
  
  return commands.join('');
}

/**
 * Set various mode settings
 */
export function createModeCommands(options = {}) {
  const {
    autoCut = true,
    mirror = false,
    highResolution = false,
  } = options;
  
  const commands = [];
  
  // Various mode settings: ESC i M {n}
  // Bit 7: auto cut (1 = on)
  // Bit 6: mirror printing (1 = on)
  let modeByte = 0x00;
  if (autoCut) modeByte |= 0x40;  // Auto cut
  if (mirror) modeByte |= 0x80;  // Mirror
  
  commands.push(ESC + 'i' + 'M' + String.fromCharCode(modeByte));
  
  // Advanced mode setting: ESC i K {n}
  // Bit 3: half cut
  // Bit 6: high resolution (only for some models)
  let advancedModeByte = 0x08;  // Enable half cut
  if (highResolution) advancedModeByte |= 0x40;
  
  commands.push(ESC + 'i' + 'K' + String.fromCharCode(advancedModeByte));
  
  // Margin amount: ESC i d {n1} {n2}
  // Set margins (in dots at 300dpi)
  const marginDots = 35;  // About 3mm margin
  commands.push(ESC + 'i' + 'd' + String.fromCharCode(marginDots & 0xFF) + String.fromCharCode((marginDots >> 8) & 0xFF));
  
  return commands.join('');
}

/**
 * Create text-based label for Brother printer
 * Uses P-touch template mode which is simpler
 */
export function createSimpleTextLabel(lines, options = {}) {
  const { autoCut = true } = options;
  
  const commands = [];
  
  // Initialize
  commands.push(createInitCommands());
  
  // Use ESC/P text mode
  // Set character style
  commands.push(ESC + 'i' + 'a' + String.fromCharCode(0x00));  // ESC/P mode
  
  // Add text content line by line
  for (const line of lines) {
    if (line && line.trim()) {
      commands.push(line + '\n');
    }
  }
  
  // Form feed / Print
  commands.push('\x0C');
  
  return commands.join('');
}

/**
 * Create a complete label with text
 * This uses the simpler text mode which should work on most Brother QL printers
 */
export function createTextLabel(content, options = {}) {
  const {
    autoCut = true,
    copies = 1,
  } = options;
  
  const commands = [];
  
  // Clear buffer with null bytes
  commands.push(NULL.repeat(100));
  
  // Initialize printer
  commands.push(ESC + '@');
  
  // Switch to ESC/P mode
  commands.push(ESC + 'i' + 'a' + String.fromCharCode(0x00));
  
  // Set print density (optional)
  commands.push(ESC + 'i' + 'D' + String.fromCharCode(0x00));
  
  // Auto cut setting
  if (autoCut) {
    commands.push(ESC + 'i' + 'A' + String.fromCharCode(0x01));
  }
  
  // Content
  commands.push(content);
  
  // Print command (form feed)
  commands.push('\x0C');
  
  return commands.join('');
}

/**
 * Generate test label content
 */
export function generateTestLabel() {
  const timestamp = new Date().toLocaleString('de-DE');
  const lines = [
    '================================',
    '      TSRID Mobile',
    '      Test-Etikett',
    '================================',
    '',
    'Datum: ' + timestamp,
    '',
    'Drucktest erfolgreich!',
    '',
    '================================',
  ];
  
  return createTextLabel(lines.join('\n'), { autoCut: true });
}

/**
 * Generate asset label content
 */
export function generateAssetLabel(asset, template = 'standard') {
  const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
  const serialNumber = asset.manufacturer_sn || asset.serial_number || 'N/A';
  const type = asset.type_label || asset.type || 'N/A';
  const manufacturer = asset.manufacturer || '';
  
  let lines = [];
  
  switch (template) {
    case 'compact':
      lines = [
        '================================',
        assetId,
        '================================',
      ];
      break;
      
    case 'detailed':
      lines = [
        '================================',
        'ID: ' + assetId,
        '--------------------------------',
        'Typ: ' + type,
        manufacturer ? 'Hersteller: ' + manufacturer : '',
        'SN: ' + serialNumber,
        '================================',
      ].filter(l => l);
      break;
      
    case 'inventory':
      lines = [
        '================================',
        assetId,
        '--------------------------------',
        'Inventur: ' + new Date().toLocaleDateString('de-DE'),
        '================================',
      ];
      break;
      
    default: // standard
      lines = [
        '================================',
        assetId,
        '--------------------------------',
        'Typ: ' + type,
        'SN: ' + serialNumber,
        '================================',
      ];
      break;
  }
  
  return createTextLabel(lines.join('\n'), { autoCut: true });
}

export default {
  createInitCommands,
  createStatusRequestCommand,
  createPrintInfoCommand,
  createModeCommands,
  createSimpleTextLabel,
  createTextLabel,
  generateTestLabel,
  generateAssetLabel,
};
