/**
 * Brother QL Raster Generator for Mobile
 * 
 * Generates Brother QL compatible raster data for Bluetooth printing
 * Matches backend label_printer.py format with real QR codes and TSRID logo
 */

import QRCode from 'qrcode';
import { LOGO_WIDTH, LOGO_HEIGHT, LOGO_ROW_BYTES, decodeLogo, getLogoPixel } from './TSRIDLogo';

// Label dimensions for 62mm continuous roll at 300dpi
const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271; // ~29mm at 300dpi

/**
 * Generate QR Code as a 2D binary matrix
 */
async function generateQRMatrix(content, size = 150) {
  try {
    // Generate QR code as data URL
    const qrModules = await QRCode.create(content, {
      errorCorrectionLevel: 'M',
      margin: 1,
    });
    
    const moduleCount = qrModules.modules.size;
    const moduleSize = Math.floor(size / moduleCount);
    const matrix = [];
    
    // Convert QR modules to pixel matrix
    for (let y = 0; y < size; y++) {
      const row = [];
      const moduleY = Math.floor(y / moduleSize);
      for (let x = 0; x < size; x++) {
        const moduleX = Math.floor(x / moduleSize);
        if (moduleY < moduleCount && moduleX < moduleCount) {
          // QR module data: 1 = black, 0 = white
          row.push(qrModules.modules.get(moduleY, moduleX) ? 1 : 0);
        } else {
          row.push(0); // white
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  } catch (error) {
    console.error('QR generation error:', error);
    // Return simple fallback pattern
    return generateFallbackQR(size);
  }
}

/**
 * Generate a simple fallback QR-like pattern
 */
function generateFallbackQR(size) {
  const matrix = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      // Create a simple pattern with corners and some data
      const inBorder = x < 3 || x >= size - 3 || y < 3 || y >= size - 3;
      const inTopLeft = x < 25 && y < 25;
      const inTopRight = x >= size - 25 && y < 25;
      const inBottomLeft = x < 25 && y >= size - 25;
      
      if (inBorder) {
        row.push(1);
      } else if (inTopLeft || inTopRight || inBottomLeft) {
        // Finder patterns
        const localX = inTopLeft ? x : (inTopRight ? x - (size - 25) : x);
        const localY = inTopLeft || inTopRight ? y : y - (size - 25);
        if (localX < 7 && localY < 7) {
          if (localX === 0 || localX === 6 || localY === 0 || localY === 6) {
            row.push(1);
          } else if (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4) {
            row.push(1);
          } else {
            row.push(0);
          }
        } else {
          row.push(0);
        }
      } else {
        // Random-like pattern for data area
        row.push(((x * 13 + y * 17) % 5) < 2 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Create a label bitmap with QR code and text
 * Layout: QR code on LEFT, text on RIGHT (like backend)
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  
  // Initialize with white (all 0s)
  bitmap.fill(0);
  
  // QR Code settings
  const qrSize = Math.min(height - 20, 200); // QR size based on label height
  const qrX = 10; // QR on left side
  const qrY = Math.floor((height - qrSize) / 2);
  
  // Generate real QR code
  const qrContent = assetId;
  const qrMatrix = await generateQRMatrix(qrContent, qrSize);
  
  // Draw QR code onto bitmap
  for (let y = 0; y < qrMatrix.length && (qrY + y) < height; y++) {
    for (let x = 0; x < qrMatrix[y].length && (qrX + x) < width; x++) {
      if (qrMatrix[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, qrX + x, qrY + y);
      }
    }
  }
  
  // Text area starts after QR code
  const textX = qrX + qrSize + 20;
  
  // Simple 8x8 font
  const font8x8 = createSimpleFont();
  
  // Draw text lines
  const lines = [
    { text: assetId, y: 20, scale: 3, bold: true },      // Main ID - large
    { text: typeLabel, y: 70, scale: 2 },                 // Type label
    { text: 'SN: ' + serialNumber, y: 110, scale: 1 },   // Serial number
  ];
  
  if (location) {
    lines.push({ text: location.substring(0, 30), y: 140, scale: 1 });
  }
  
  for (const line of lines) {
    drawText(bitmap, width, rowBytes, line.text, textX, line.y, font8x8, line.scale || 1);
  }
  
  return bitmap;
}

/**
 * Create simple 8x8 font for basic ASCII characters
 */
function createSimpleFont() {
  const font = {};
  
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
  font['('] = [0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00];
  font[')'] = [0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00];
  
  // Lowercase (same as uppercase)
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

/**
 * Draw text on bitmap
 */
function drawText(bitmap, width, rowBytes, text, x, y, font, scale = 1) {
  const charWidth = 8 * scale;
  let curX = x;
  
  for (const char of text.toUpperCase()) {
    const pattern = font[char] || font[' '];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
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
 * Set a pixel in the bitmap (1 = black)
 */
function setPixel(bitmap, rowBytes, width, x, y) {
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Create Brother raster label with real QR code
 */
export async function createBrotherRasterLabel(options = {}) {
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
  for (let i = 0; i < 200; i++) {
    data.push(0x00);
  }
  data.push(0x1B, 0x40); // ESC @ - Initialize

  // ========== MODE SETTINGS ==========
  data.push(0x1B, 0x69, 0x61, 0x01); // Switch to raster mode

  // ========== PRINT INFORMATION ==========
  data.push(0x1B, 0x69, 0x7A);
  data.push(0x86);  // Valid flags
  data.push(0x0A);  // Media type: continuous roll
  data.push(0x3E);  // Media width: 62mm
  data.push(0x00);  // Media length: 0 for continuous
  data.push(height & 0xFF);
  data.push((height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);

  // ========== AUTO CUT ==========
  if (autoCut) {
    data.push(0x1B, 0x69, 0x4D, 0x40);
  } else {
    data.push(0x1B, 0x69, 0x4D, 0x00);
  }
  data.push(0x1B, 0x69, 0x4B, 0x08);
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // ========== GENERATE BITMAP ==========
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  
  const rowBytes = Math.ceil(width / 8);
  
  // Send each row with horizontal mirroring
  for (let y = 0; y < height; y++) {
    data.push(0x67, 0x00, rowBytes);
    
    // Reverse byte order for correct printing
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      // Reverse bits within byte
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) {
          reversed |= (1 << (7 - bit));
        }
      }
      data.push(reversed);
    }
  }

  // ========== PRINT ==========
  data.push(0x1A);

  return new Uint8Array(data);
}

/**
 * Create a test label
 */
export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'TEST-LABEL-001',
    typeLabel: 'Testdruck',
    serialNumber: 'TEST-SN-12345',
    location: 'Drucker-Test',
  });
}

/**
 * Create an asset label
 */
export async function createAssetLabel(asset) {
  return await createBrotherRasterLabel({
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
