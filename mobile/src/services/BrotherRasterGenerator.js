/**
 * Brother QL Raster Generator for Mobile
 * 
 * Generates Brother QL compatible raster data for Bluetooth printing
 * Same format as backend label_printer.py but optimized for mobile
 */

// Label dimensions for 62mm continuous roll at 300dpi
const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271; // Default ~23mm, can be adjusted

/**
 * Create a simple bitmap label with text
 * Returns binary raster data for Brother QL printers
 */
export function createBrotherRasterLabel(options = {}) {
  const {
    assetId = 'TEST-001',
    typeLabel = 'Asset',
    serialNumber = 'N/A',
    location = '',
    width = LABEL_WIDTH_PX,
    height = LABEL_HEIGHT_PX,
    autoCut = true,
  } = options;

  const data = [];

  // ========== INITIALIZATION ==========
  // Invalidate - clear buffer with null bytes
  for (let i = 0; i < 200; i++) {
    data.push(0x00);
  }

  // ESC @ - Initialize printer
  data.push(0x1B, 0x40);

  // ========== MODE SETTINGS ==========
  // ESC i a 1 - Switch to raster graphics mode
  data.push(0x1B, 0x69, 0x61, 0x01);

  // ========== PRINT INFORMATION ==========
  // ESC i z - Print information command
  data.push(0x1B, 0x69, 0x7A);
  data.push(0x86);  // Valid flags: PI_KIND | PI_WIDTH | PI_LENGTH | PI_QUALITY | PI_RECOVER
  data.push(0x0A);  // Media type: 0x0A = continuous roll, 0x0B = die-cut
  data.push(0x3E);  // Media width: 62mm (0x3E = 62)
  data.push(0x00);  // Media length: 0 for continuous
  data.push(height & 0xFF);  // Raster lines low byte
  data.push((height >> 8) & 0xFF);  // Raster lines high byte
  data.push(0x00);  // Starting page
  data.push(0x00);  // Reserved
  data.push(0x00);  // Reserved
  data.push(0x00);  // Reserved

  // ========== VARIOUS MODE SETTINGS ==========
  // ESC i M - Set auto cut
  if (autoCut) {
    data.push(0x1B, 0x69, 0x4D, 0x40);  // Auto cut enabled
  } else {
    data.push(0x1B, 0x69, 0x4D, 0x00);  // Auto cut disabled
  }

  // ESC i K - Advanced mode (cut at end)
  data.push(0x1B, 0x69, 0x4B, 0x08);

  // ESC i d - Margin amount (0)
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // ========== GENERATE RASTER DATA ==========
  // Create bitmap representation
  const bitmap = createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  
  // Row bytes (width in bytes, each byte = 8 pixels)
  const rowBytes = Math.ceil(width / 8);
  
  // Send each row as raster graphics
  for (let y = 0; y < height; y++) {
    // g 0x00 - Raster graphics transfer command
    data.push(0x67, 0x00, rowBytes);
    
    // Add row data
    for (let byteIdx = 0; byteIdx < rowBytes; byteIdx++) {
      data.push(bitmap[y * rowBytes + byteIdx] || 0x00);
    }
  }

  // ========== PRINT COMMAND ==========
  // 0x1A - Print with feeding
  data.push(0x1A);

  return new Uint8Array(data);
}

/**
 * Create a bitmap for the label
 * Simple implementation using character bitmaps
 */
function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  
  // Initialize with white (all 0s for Brother - 0 = white, 1 = black)
  bitmap.fill(0);
  
  // Simple 8x8 font patterns for basic characters
  const font8x8 = createSimpleFont();
  
  // Draw text lines
  const lines = [
    { text: assetId, y: 10, scale: 3, bold: true },
    { text: typeLabel, y: 50, scale: 2 },
    { text: 'SN: ' + serialNumber, y: 80, scale: 1 },
  ];
  
  if (location) {
    lines.push({ text: location, y: 105, scale: 1 });
  }
  
  for (const line of lines) {
    drawText(bitmap, width, rowBytes, line.text, 20, line.y, font8x8, line.scale || 1);
  }
  
  // Draw a simple QR placeholder (square pattern) on the right
  const qrSize = 80;
  const qrX = width - qrSize - 20;
  const qrY = (height - qrSize) / 2;
  drawQRPlaceholder(bitmap, width, rowBytes, qrX, qrY, qrSize, assetId);
  
  return bitmap;
}

/**
 * Create simple 8x8 font for basic ASCII characters
 */
function createSimpleFont() {
  const font = {};
  
  // Define some basic characters (8x8 bitmap patterns)
  // Each character is 8 bytes, each byte is one row (MSB first)
  
  // Numbers
  font['0'] = [0x3C, 0x66, 0x6E, 0x76, 0x66, 0x66, 0x3C, 0x00];
  font['1'] = [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00];
  font['2'] = [0x3C, 0x66, 0x06, 0x1C, 0x30, 0x60, 0x7E, 0x00];
  font['3'] = [0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0x00];
  font['4'] = [0x0C, 0x1C, 0x3C, 0x6C, 0x7E, 0x0C, 0x0C, 0x00];
  font['5'] = [0x7E, 0x60, 0x7C, 0x06, 0x06, 0x66, 0x3C, 0x00];
  font['6'] = [0x1C, 0x30, 0x60, 0x7C, 0x66, 0x66, 0x3C, 0x00];
  font['7'] = [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x30, 0x30, 0x00];
  font['8'] = [0x3C, 0x66, 0x66, 0x3C, 0x66, 0x66, 0x3C, 0x00];
  font['9'] = [0x3C, 0x66, 0x66, 0x3E, 0x06, 0x0C, 0x38, 0x00];
  
  // Letters
  font['A'] = [0x18, 0x3C, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00];
  font['B'] = [0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00];
  font['C'] = [0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00];
  font['D'] = [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00];
  font['E'] = [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x7E, 0x00];
  font['F'] = [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x60, 0x00];
  font['G'] = [0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3C, 0x00];
  font['H'] = [0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00];
  font['I'] = [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00];
  font['J'] = [0x06, 0x06, 0x06, 0x06, 0x66, 0x66, 0x3C, 0x00];
  font['K'] = [0x66, 0x6C, 0x78, 0x70, 0x78, 0x6C, 0x66, 0x00];
  font['L'] = [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0x00];
  font['M'] = [0x63, 0x77, 0x7F, 0x6B, 0x63, 0x63, 0x63, 0x00];
  font['N'] = [0x66, 0x76, 0x7E, 0x7E, 0x6E, 0x66, 0x66, 0x00];
  font['O'] = [0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00];
  font['P'] = [0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0x00];
  font['Q'] = [0x3C, 0x66, 0x66, 0x66, 0x6A, 0x6C, 0x36, 0x00];
  font['R'] = [0x7C, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0x66, 0x00];
  font['S'] = [0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0x00];
  font['T'] = [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00];
  font['U'] = [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00];
  font['V'] = [0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00];
  font['W'] = [0x63, 0x63, 0x63, 0x6B, 0x7F, 0x77, 0x63, 0x00];
  font['X'] = [0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00];
  font['Y'] = [0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0x00];
  font['Z'] = [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x7E, 0x00];
  
  // Special characters
  font['-'] = [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00];
  font[':'] = [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00];
  font['.'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00];
  font[' '] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  font['_'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x00];
  font['/'] = [0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00];
  
  // Lowercase (simplified - same as uppercase for now)
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

/**
 * Draw text on bitmap (NOT MIRRORED)
 */
function drawText(bitmap, width, rowBytes, text, x, y, font, scale = 1) {
  const charWidth = 8 * scale;
  let curX = x;
  
  for (const char of text.toUpperCase()) {
    const pattern = font[char] || font[' '];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
          // Draw scaled pixel - NOT mirrored
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = curX + col * scale + sx;
              const py = y + row * scale + sy;
              if (px < width && py < bitmap.length / rowBytes) {
                setPixel(bitmap, rowBytes, width, px, py);
              }
            }
          }
        }
      }
    }
    
    curX += charWidth;
  }
}

/**
 * Draw a simple QR-like pattern (placeholder)
 */
function drawQRPlaceholder(bitmap, width, rowBytes, x, y, size, data) {
  // Draw border
  for (let i = 0; i < size; i++) {
    setPixel(bitmap, rowBytes, x + i, y);
    setPixel(bitmap, rowBytes, x + i, y + size - 1);
    setPixel(bitmap, rowBytes, x, y + i);
    setPixel(bitmap, rowBytes, x + size - 1, y + i);
  }
  
  // Draw corner squares (like QR finder patterns)
  const cornerSize = Math.floor(size / 5);
  
  // Top-left corner
  drawFilledSquare(bitmap, rowBytes, x + 4, y + 4, cornerSize);
  
  // Top-right corner
  drawFilledSquare(bitmap, rowBytes, x + size - cornerSize - 4, y + 4, cornerSize);
  
  // Bottom-left corner
  drawFilledSquare(bitmap, rowBytes, x + 4, y + size - cornerSize - 4, cornerSize);
  
  // Add some data pattern in the middle
  const hash = simpleHash(data);
  const patternSize = 4;
  const startX = x + cornerSize + 10;
  const startY = y + cornerSize + 10;
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((hash >> ((i * 8 + j) % 32)) & 1) {
        drawFilledSquare(bitmap, rowBytes, startX + i * patternSize, startY + j * patternSize, patternSize - 1);
      }
    }
  }
}

/**
 * Draw a filled square
 */
function drawFilledSquare(bitmap, rowBytes, x, y, size) {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      setPixel(bitmap, rowBytes, x + dx, y + dy);
    }
  }
}

/**
 * Set a pixel in the bitmap (1 = black)
 */
function setPixel(bitmap, rowBytes, x, y) {
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Simple hash function for generating patterns
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Create a test label
 */
export function createTestLabel() {
  return createBrotherRasterLabel({
    assetId: 'TEST-LABEL-001',
    typeLabel: 'Testdruck',
    serialNumber: 'TEST-SN-12345',
    location: 'Drucker-Test',
  });
}

/**
 * Create an asset label (TSRID Standard format)
 */
export function createAssetLabel(asset) {
  return createBrotherRasterLabel({
    assetId: asset.warehouse_asset_id || asset.asset_id || 'N/A',
    typeLabel: asset.type_label || asset.type || 'Asset',
    serialNumber: asset.manufacturer_sn || asset.serial_number || 'N/A',
    location: asset.location_name || asset.location || '',
  });
}

export default {
  createBrotherRasterLabel,
  createTestLabel,
  createAssetLabel,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
};
