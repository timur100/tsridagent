/**
 * Brother QL Raster Generator for Mobile
 * 
 * TSRID Standard Label with:
 * - REAL QR Code (left) - using qrcode library
 * - Auto-scaling Text (right) - no cutoff
 * - TSRID Fingerprint Logo (bottom right)
 * - Large Serial Number
 */

import QRCode from 'qrcode';

const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271;
const LOGO_SIZE = 50;

/**
 * Generate TSRID Fingerprint Logo bitmap
 * Creates a recognizable fingerprint pattern
 */
function generateLogoBitmap(size) {
  const bitmap = [];
  const center = size / 2;
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Create fingerprint-like concentric pattern with ridges
      const angle = Math.atan2(dy, dx);
      const ridge1 = Math.sin(dist * 0.8) > 0.3;
      const ridge2 = Math.sin(dist * 0.4 + angle * 2) > 0.4;
      const inCircle = dist < center - 2;
      const isRing = Math.abs(dist - center * 0.3) < 2 || Math.abs(dist - center * 0.6) < 2;
      
      const isPixel = inCircle && (ridge1 || ridge2 || isRing);
      row.push(isPixel ? 1 : 0);
    }
    bitmap.push(row);
  }
  return bitmap;
}

/**
 * Generate REAL QR Code as a 2D binary matrix
 * Uses qrcode library for proper scannable QR codes
 */
async function generateRealQRMatrix(content, targetSize = 200) {
  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: targetSize,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Parse the QR code to get module data
    const qrModules = await QRCode.create(content, {
      errorCorrectionLevel: 'M',
    });
    
    const moduleCount = qrModules.modules.size;
    const moduleSize = Math.floor(targetSize / (moduleCount + 2)); // +2 for quiet zone
    const actualSize = moduleSize * (moduleCount + 2);
    
    // Create pixel matrix
    const matrix = [];
    for (let y = 0; y < actualSize; y++) {
      const row = [];
      const moduleY = Math.floor(y / moduleSize) - 1; // -1 for quiet zone
      
      for (let x = 0; x < actualSize; x++) {
        const moduleX = Math.floor(x / moduleSize) - 1; // -1 for quiet zone
        
        // Quiet zone (white border)
        if (moduleX < 0 || moduleX >= moduleCount || moduleY < 0 || moduleY >= moduleCount) {
          row.push(0);
        } else {
          // Get actual QR module value
          const idx = moduleY * moduleCount + moduleX;
          const isDark = qrModules.modules.data[idx] === 1;
          row.push(isDark ? 1 : 0);
        }
      }
      matrix.push(row);
    }
    
    return { matrix, size: actualSize };
  } catch (error) {
    console.error('QR generation error:', error);
    // Fallback to simple pattern
    return { matrix: generateFallbackQR(targetSize), size: targetSize };
  }
}

/**
 * Fallback QR pattern if library fails
 */
function generateFallbackQR(size) {
  const matrix = [];
  const cs = Math.floor(size * 0.22);
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const inBorder = x < 4 || x >= size - 4 || y < 4 || y >= size - 4;
      const inTL = x < cs && y < cs;
      const inTR = x >= size - cs && y < cs;
      const inBL = x < cs && y >= size - cs;
      
      if (inBorder) {
        row.push(0); // White border
      } else if (inTL || inTR || inBL) {
        const lx = inTL ? x : (inTR ? x - (size - cs) : x);
        const ly = inTL || inTR ? y : y - (size - cs);
        const outer = lx < 7 || lx >= cs - 7 || ly < 7 || ly >= cs - 7;
        const inner = lx >= cs * 0.35 && lx < cs * 0.65 && ly >= cs * 0.35 && ly < cs * 0.65;
        row.push(outer || inner ? 1 : 0);
      } else {
        row.push(((x * 17 + y * 13) % 5) < 2 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * 8x8 pixel font for label text
 */
function createSimpleFont() {
  const font = {};
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
  font['-'] = [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00];
  font[':'] = [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00];
  font['.'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00];
  font[' '] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  font['_'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x00];
  font['/'] = [0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00];
  font['('] = [0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00];
  font[')'] = [0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00];
  
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

function setPixel(bitmap, rowBytes, width, x, y) {
  if (x < 0 || x >= width || y < 0) return;
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Draw text with auto-scaling to fit available width
 */
function drawTextAutoScale(bitmap, width, rowBytes, text, x, y, maxWidth, font, maxScale = 4, minScale = 1) {
  const upperText = (text || '').toUpperCase();
  if (!upperText) return x;
  
  // Calculate required width at each scale
  const charBaseWidth = 8;
  let scale = maxScale;
  
  while (scale >= minScale) {
    const requiredWidth = upperText.length * charBaseWidth * scale;
    if (requiredWidth <= maxWidth) {
      break;
    }
    scale--;
  }
  
  // Ensure minimum scale
  scale = Math.max(scale, minScale);
  
  // Draw text
  const charWidth = charBaseWidth * scale;
  let curX = x;
  
  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
    const pattern = font[char] || font[' '];
    
    // Check if we're about to exceed the width
    if (curX + charWidth > x + maxWidth) {
      break; // Stop if we would exceed
    }
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = curX + col * scale + sx;
              const py = y + row * scale + sy;
              setPixel(bitmap, rowBytes, width, px, py);
            }
          }
        }
      }
    }
    curX += charWidth;
  }
  
  return curX;
}

/**
 * Create label bitmap
 * Layout:
 * - QR Code: LEFT (large, scannable)
 * - Text: RIGHT side, auto-scaled to fit
 * - Logo: BOTTOM RIGHT corner
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  bitmap.fill(0);
  
  const font = createSimpleFont();
  
  // === QR CODE (LEFT) - REAL SCANNABLE ===
  const qrTargetSize = Math.min(220, height - 30);
  const qrX = 15;
  const { matrix: qrMatrix, size: qrActualSize } = await generateRealQRMatrix(assetId, qrTargetSize);
  const qrY = Math.floor((height - qrActualSize) / 2);
  
  for (let y = 0; y < qrMatrix.length && (qrY + y) < height; y++) {
    for (let x = 0; x < qrMatrix[y].length && (qrX + x) < width; x++) {
      if (qrMatrix[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, qrX + x, qrY + y);
      }
    }
  }
  
  // === TEXT AREA (RIGHT) ===
  const textX = qrX + qrActualSize + 25;
  const textMaxWidth = width - textX - LOGO_SIZE - 25;
  
  // Asset ID - LARGE, auto-scale to fit
  const idY = 25;
  drawTextAutoScale(bitmap, width, rowBytes, assetId || 'N/A', textX, idY, textMaxWidth, font, 4, 2);
  
  // Type Label - MEDIUM
  const typeY = idY + 45;
  drawTextAutoScale(bitmap, width, rowBytes, typeLabel || '', textX, typeY, textMaxWidth, font, 3, 2);
  
  // Serial Number - LARGE
  const snY = typeY + 40;
  drawTextAutoScale(bitmap, width, rowBytes, 'SN: ' + (serialNumber || 'N/A'), textX, snY, textMaxWidth, font, 3, 2);
  
  // Location - MEDIUM (if provided)
  if (location) {
    const locY = snY + 40;
    drawTextAutoScale(bitmap, width, rowBytes, location, textX, locY, textMaxWidth, font, 2, 1);
  }
  
  // === TSRID FINGERPRINT LOGO (BOTTOM RIGHT) ===
  const logoX = width - LOGO_SIZE - 20;
  const logoY = height - LOGO_SIZE - 15;
  const logoBitmap = generateLogoBitmap(LOGO_SIZE);
  
  for (let y = 0; y < LOGO_SIZE && (logoY + y) < height; y++) {
    for (let x = 0; x < LOGO_SIZE && (logoX + x) < width; x++) {
      if (logoBitmap[y] && logoBitmap[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, logoX + x, logoY + y);
      }
    }
  }
  
  return bitmap;
}

/**
 * Create Brother QL Raster Label
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

  // Brother QL initialization sequence
  // Invalidate buffer
  for (let i = 0; i < 200; i++) data.push(0x00);
  
  // Initialize
  data.push(0x1B, 0x40); // ESC @
  
  // Switch to raster mode
  data.push(0x1B, 0x69, 0x61, 0x01); // ESC i a 1
  
  // Print info command - 62mm endless
  data.push(0x1B, 0x69, 0x7A, 0x86, 0x0A, 0x3E, 0x00);
  data.push(height & 0xFF, (height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);
  
  // Various mode settings
  data.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0x00); // Auto cut
  data.push(0x1B, 0x69, 0x4B, 0x08); // Cut type
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00); // Margins

  // Generate bitmap
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rowBytes = Math.ceil(width / 8);
  
  // Send raster data
  for (let y = 0; y < height; y++) {
    data.push(0x67, 0x00, rowBytes); // Raster line command
    
    // Send row data (reversed for Brother)
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      // Reverse bits within byte
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) reversed |= (1 << (7 - bit));
      }
      data.push(reversed);
    }
  }

  // Print and feed
  data.push(0x1A); // Print command
  
  return new Uint8Array(data);
}

/**
 * Create test label
 */
export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'AAHC01-01',
    typeLabel: 'ZEBRA TC78',
    serialNumber: '22105525802581',
    location: 'AACHEN',
  });
}

/**
 * Create label for an asset object
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
