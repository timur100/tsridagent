/**
 * Brother QL Raster Generator for Mobile
 * 
 * Generates Brother QL compatible raster data for Bluetooth printing
 * With TSRID Logo, real QR codes, and LARGE text that doesn't get cut off
 */

import QRCode from 'qrcode';

// Label dimensions for 62mm continuous roll at 300dpi
const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271; // ~29mm at 300dpi

// TSRID Logo bitmap (simplified fingerprint pattern)
const LOGO_SIZE = 50;

/**
 * Generate TSRID Logo bitmap pattern (simplified fingerprint)
 */
function generateLogoBitmap(size) {
  const bitmap = [];
  const center = size / 2;
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      // Create fingerprint-like concentric pattern
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Fingerprint ridges
      const ridge = Math.sin(dist * 0.8) > 0.3;
      const inCircle = dist < center - 2;
      
      // Add some variation for fingerprint effect
      const noise = Math.sin(x * 0.5) * Math.cos(y * 0.3) > 0;
      
      row.push(inCircle && ridge && (dist > 5 || noise) ? 1 : 0);
    }
    bitmap.push(row);
  }
  return bitmap;
}

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
 * Fallback QR pattern
 */
function generateFallbackQR(size) {
  const matrix = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const inBorder = x < 2 || x >= size - 2 || y < 2 || y >= size - 2;
      const cornerSize = Math.floor(size * 0.25);
      const inTopLeft = x < cornerSize && y < cornerSize;
      const inTopRight = x >= size - cornerSize && y < cornerSize;
      const inBottomLeft = x < cornerSize && y >= size - cornerSize;
      
      if (inBorder) {
        row.push(1);
      } else if (inTopLeft || inTopRight || inBottomLeft) {
        // Finder pattern
        const localX = inTopLeft ? x : (inTopRight ? x - (size - cornerSize) : x);
        const localY = inTopLeft || inTopRight ? y : y - (size - cornerSize);
        const inOuter = localX === 0 || localX === cornerSize - 1 || localY === 0 || localY === cornerSize - 1;
        const inInner = localX >= Math.floor(cornerSize * 0.3) && localX < Math.floor(cornerSize * 0.7) &&
                        localY >= Math.floor(cornerSize * 0.3) && localY < Math.floor(cornerSize * 0.7);
        row.push(inOuter || inInner ? 1 : 0);
      } else {
        row.push(((x * 17 + y * 13) % 7) < 2 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Simple 8x8 font
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
  
  // Uppercase
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
  
  // Special
  font['-'] = [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00];
  font[':'] = [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00];
  font['.'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00];
  font[' '] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  font['_'] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x00];
  font['/'] = [0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00];
  font['('] = [0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00];
  font[')'] = [0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00];
  
  // Lowercase = Uppercase
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

/**
 * Draw text - with auto-scaling to fit available width
 */
function drawTextFit(bitmap, width, rowBytes, text, x, y, font, maxWidth, baseScale = 3) {
  // Calculate text width at base scale
  const charWidth = 8 * baseScale;
  const textWidth = text.length * charWidth;
  
  // Scale down if needed to fit
  let scale = baseScale;
  if (textWidth > maxWidth && text.length > 0) {
    scale = Math.max(1, Math.floor(maxWidth / (text.length * 8)));
  }
  
  drawText(bitmap, width, rowBytes, text, x, y, font, scale);
  return scale; // Return actual scale used
}

/**
 * Draw text on bitmap
 */
function drawText(bitmap, width, rowBytes, text, x, y, font, scale = 1) {
  const charWidth = 8 * scale;
  let curX = x;
  
  const upperText = text.toUpperCase();
  
  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
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
    
    curX += charWidth;
  }
}

/**
 * Set pixel
 */
function setPixel(bitmap, rowBytes, width, x, y) {
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Create label bitmap - FULL WIDTH TEXT, NO CUTOFF
 * Layout: Logo (top-left), QR (below logo), Text fills entire right side
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  bitmap.fill(0);
  
  // Logo in top-left corner
  const logoSize = 45;
  const logoX = 10;
  const logoY = 10;
  const logoBitmap = generateLogoBitmap(logoSize);
  
  // Draw logo
  for (let y = 0; y < logoSize && (logoY + y) < height; y++) {
    for (let x = 0; x < logoSize && (logoX + x) < width; x++) {
      if (logoBitmap[y] && logoBitmap[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, logoX + x, logoY + y);
      }
    }
  }
  
  // QR Code below logo
  const qrSize = Math.min(height - logoSize - 30, 180);
  const qrX = 10;
  const qrY = logoY + logoSize + 10;
  
  const qrMatrix = await generateQRMatrix(assetId, qrSize);
  
  for (let y = 0; y < qrMatrix.length && (qrY + y) < height; y++) {
    for (let x = 0; x < qrMatrix[y].length && (qrX + x) < width; x++) {
      if (qrMatrix[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, qrX + x, qrY + y);
      }
    }
  }
  
  // Text area - use ALL space to the right of QR/Logo
  const textX = Math.max(qrX + qrSize, logoX + logoSize) + 15;
  const textMaxWidth = width - textX - 10; // Leave small margin on right
  
  const font = createSimpleFont();
  
  // Asset ID - LARGE, auto-scaled to fit
  const idY = 25;
  drawTextFit(bitmap, width, rowBytes, assetId, textX, idY, font, textMaxWidth, 4);
  
  // Type Label - Medium, auto-scaled
  const typeY = idY + 45;
  drawTextFit(bitmap, width, rowBytes, typeLabel, textX, typeY, font, textMaxWidth, 3);
  
  // Serial Number - Smaller
  const snY = typeY + 35;
  drawTextFit(bitmap, width, rowBytes, 'SN: ' + (serialNumber || 'N/A'), textX, snY, font, textMaxWidth, 2);
  
  // Location if present
  if (location) {
    const locY = snY + 25;
    drawTextFit(bitmap, width, rowBytes, location, textX, locY, font, textMaxWidth, 2);
  }
  
  return bitmap;
}

/**
 * Create Brother raster label
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

  // Initialization
  for (let i = 0; i < 200; i++) data.push(0x00);
  data.push(0x1B, 0x40);

  // Raster mode
  data.push(0x1B, 0x69, 0x61, 0x01);

  // Print info
  data.push(0x1B, 0x69, 0x7A);
  data.push(0x86, 0x0A, 0x3E, 0x00);
  data.push(height & 0xFF, (height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);

  // Auto cut
  data.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0x00);
  data.push(0x1B, 0x69, 0x4B, 0x08);
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // Generate bitmap
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rowBytes = Math.ceil(width / 8);
  
  // Send rows with mirroring
  for (let y = 0; y < height; y++) {
    data.push(0x67, 0x00, rowBytes);
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) reversed |= (1 << (7 - bit));
      }
      data.push(reversed);
    }
  }

  data.push(0x1A);
  return new Uint8Array(data);
}

export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'AAHC01-01',
    typeLabel: 'ZEBRA TC78 SCANNER',
    serialNumber: 'SN-2024-ABCDEF123',
    location: 'BERLIN ZENTRAL',
  });
}

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
