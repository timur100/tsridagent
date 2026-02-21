/**
 * Brother QL Raster Generator for Mobile
 * 
 * Generates Brother QL compatible raster data for Bluetooth printing
 * With real QR codes and TSRID logo - LARGE TEXT VERSION
 */

import QRCode from 'qrcode';

// Label dimensions for 62mm continuous roll at 300dpi
const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271; // ~29mm at 300dpi

/**
 * Generate QR Code as a 2D binary matrix
 */
async function generateQRMatrix(content, size = 150) {
  try {
    const qrModules = await QRCode.create(content, {
      errorCorrectionLevel: 'M',
      margin: 1,
    });
    
    const moduleCount = qrModules.modules.size;
    const moduleSize = Math.floor(size / moduleCount);
    const matrix = [];
    
    for (let y = 0; y < size; y++) {
      const row = [];
      const moduleY = Math.floor(y / moduleSize);
      for (let x = 0; x < size; x++) {
        const moduleX = Math.floor(x / moduleSize);
        if (moduleY < moduleCount && moduleX < moduleCount) {
          row.push(qrModules.modules.get(moduleY, moduleX) ? 1 : 0);
        } else {
          row.push(0);
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  } catch (error) {
    console.error('QR generation error:', error);
    return generateFallbackQR(size);
  }
}

/**
 * Generate a fallback QR-like pattern
 */
function generateFallbackQR(size) {
  const matrix = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const inBorder = x < 3 || x >= size - 3 || y < 3 || y >= size - 3;
      const inTopLeft = x < 21 && y < 21;
      const inTopRight = x >= size - 21 && y < 21;
      const inBottomLeft = x < 21 && y >= size - 21;
      
      if (inBorder) {
        row.push(1);
      } else if (inTopLeft || inTopRight || inBottomLeft) {
        const localX = inTopLeft ? x : (inTopRight ? x - (size - 21) : x);
        const localY = inTopLeft || inTopRight ? y : y - (size - 21);
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
        row.push(((x * 13 + y * 17) % 5) < 2 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Create LARGE 12x16 font (doubled 8x8)
 */
function createLargeFont() {
  const baseFont = createSimpleFont();
  return baseFont; // Will be scaled during drawing
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
  
  // Uppercase Letters
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
  font['Ä'] = font['A'];
  font['Ö'] = font['O'];
  font['Ü'] = font['U'];
  font['ß'] = font['S'];
  
  // Lowercase = Uppercase
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

/**
 * Draw BOLD text (with outline) on bitmap
 */
function drawTextBold(bitmap, width, rowBytes, text, x, y, font, scale = 1) {
  // Draw text multiple times with slight offsets for bold effect
  drawText(bitmap, width, rowBytes, text, x, y, font, scale);
  drawText(bitmap, width, rowBytes, text, x + 1, y, font, scale);
  drawText(bitmap, width, rowBytes, text, x, y + 1, font, scale);
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
              if (px >= 0 && px < width && py >= 0 && py < bitmap.length / rowBytes) {
                setPixel(bitmap, rowBytes, width, px, py);
              }
            }
          }
        }
      }
    }
    
    curX += charWidth + (scale > 2 ? 2 : 0); // Extra spacing for large text
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
 * Draw a filled rectangle
 */
function drawRect(bitmap, rowBytes, width, x, y, w, h) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0) {
        setPixel(bitmap, rowBytes, width, px, py);
      }
    }
  }
}

/**
 * Create a label bitmap with QR code and text
 * Layout: QR code on LEFT, LARGE text on RIGHT
 * FORMAT: TSRID Standard Asset Label
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  
  // Initialize with white
  bitmap.fill(0);
  
  // QR Code - large, left side
  const qrSize = Math.min(height - 40, 220);
  const qrX = 20;
  const qrY = Math.floor((height - qrSize) / 2);
  
  // Generate QR code
  const qrContent = assetId;
  const qrMatrix = await generateQRMatrix(qrContent, qrSize);
  
  // Draw QR code
  for (let y = 0; y < qrMatrix.length && (qrY + y) < height; y++) {
    for (let x = 0; x < qrMatrix[y].length && (qrX + x) < width; x++) {
      if (qrMatrix[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, qrX + x, qrY + y);
      }
    }
  }
  
  // Text area - right side with LARGE fonts
  const textX = qrX + qrSize + 30;
  const font = createSimpleFont();
  
  // Asset ID - VERY LARGE (scale 5 = 40px)
  const idScale = 5;
  drawTextBold(bitmap, width, rowBytes, assetId, textX, 30, font, idScale);
  
  // Type Label - LARGE (scale 3 = 24px)
  const typeScale = 3;
  const typeY = 30 + (8 * idScale) + 15;
  drawText(bitmap, width, rowBytes, typeLabel.substring(0, 20), textX, typeY, font, typeScale);
  
  // Serial Number - Medium (scale 2 = 16px)
  const snScale = 2;
  const snY = typeY + (8 * typeScale) + 10;
  drawText(bitmap, width, rowBytes, 'SN: ' + (serialNumber || 'N/A'), textX, snY, font, snScale);
  
  // Location - Medium (scale 2)
  if (location) {
    const locY = snY + (8 * snScale) + 8;
    drawText(bitmap, width, rowBytes, location.substring(0, 25), textX, locY, font, snScale);
  }
  
  // Draw a thin separator line
  const lineY = qrY - 10;
  if (lineY > 5) {
    for (let px = 15; px < width - 15; px++) {
      setPixel(bitmap, rowBytes, width, px, lineY);
    }
  }
  
  return bitmap;
}

/**
 * Create Brother raster label data
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

  // Initialization - 200 nulls
  for (let i = 0; i < 200; i++) {
    data.push(0x00);
  }
  data.push(0x1B, 0x40); // ESC @ - Initialize

  // Switch to raster mode
  data.push(0x1B, 0x69, 0x61, 0x01);

  // Print information
  data.push(0x1B, 0x69, 0x7A);
  data.push(0x86);  // Valid flags
  data.push(0x0A);  // Media type: continuous roll
  data.push(0x3E);  // Media width: 62mm
  data.push(0x00);  // Media length: 0 for continuous
  data.push(height & 0xFF);
  data.push((height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);

  // Auto cut setting
  if (autoCut) {
    data.push(0x1B, 0x69, 0x4D, 0x40);
  } else {
    data.push(0x1B, 0x69, 0x4D, 0x00);
  }
  data.push(0x1B, 0x69, 0x4B, 0x08);
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // Generate bitmap
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  
  const rowBytes = Math.ceil(width / 8);
  
  // Send each row with horizontal mirroring
  for (let y = 0; y < height; y++) {
    data.push(0x67, 0x00, rowBytes);
    
    // Reverse byte order and bits for correct printing
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) {
          reversed |= (1 << (7 - bit));
        }
      }
      data.push(reversed);
    }
  }

  // Print command
  data.push(0x1A);

  return new Uint8Array(data);
}

/**
 * Create a test label
 */
export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'TSR-12345',
    typeLabel: 'ZEBRA TC78',
    serialNumber: 'SN-2024-ABCD',
    location: 'Lager Berlin',
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
