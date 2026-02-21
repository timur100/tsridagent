/**
 * Brother QL Raster Generator for Mobile
 * 
 * TSRID Standard Label with:
 * - Large QR Code (left)
 * - Large Text (right) - no cutoff
 * - Fingerprint Logo (bottom right)
 * - Large Serial Number
 */

import QRCode from 'qrcode';

const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271;

// TSRID Fingerprint Logo - simplified pattern for bottom right
const LOGO_SIZE = 40;

function generateLogoBitmap(size) {
  const bitmap = [];
  const center = size / 2;
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Fingerprint ridge pattern
      const ridge = Math.sin(dist * 0.6 + Math.atan2(dy, dx) * 0.5) > 0.2;
      const inCircle = dist < center - 1;
      
      row.push(inCircle && ridge ? 1 : 0);
    }
    bitmap.push(row);
  }
  return bitmap;
}

async function generateQRMatrix(content, size = 200) {
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
    console.error('QR error:', error);
    return generateFallbackQR(size);
  }
}

function generateFallbackQR(size) {
  const matrix = [];
  const cs = Math.floor(size * 0.22); // Corner size
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const inBorder = x < 2 || x >= size - 2 || y < 2 || y >= size - 2;
      const inTL = x < cs && y < cs;
      const inTR = x >= size - cs && y < cs;
      const inBL = x < cs && y >= size - cs;
      
      if (inBorder) {
        row.push(1);
      } else if (inTL || inTR || inBL) {
        const lx = inTL ? x : (inTR ? x - (size - cs) : x);
        const ly = inTL || inTR ? y : y - (size - cs);
        const outer = lx === 0 || lx === cs - 1 || ly === 0 || ly === cs - 1;
        const inner = lx >= cs * 0.3 && lx < cs * 0.7 && ly >= cs * 0.3 && ly < cs * 0.7;
        row.push(outer || inner ? 1 : 0);
      } else {
        row.push(((x * 17 + y * 13) % 7) < 2 ? 1 : 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

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
  
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
    font[c] = font[c.toUpperCase()];
  });
  
  return font;
}

function drawText(bitmap, width, rowBytes, text, x, y, font, scale = 1) {
  const charWidth = 8 * scale;
  let curX = x;
  const upperText = (text || '').toUpperCase();
  
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
  return curX; // Return end position
}

function setPixel(bitmap, rowBytes, width, x, y) {
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Create label bitmap
 * Layout:
 * - QR Code: LEFT (large, ~220px)
 * - Text: RIGHT side, full width
 * - Logo: BOTTOM RIGHT corner
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  bitmap.fill(0);
  
  const font = createSimpleFont();
  
  // === QR CODE (LEFT) - LARGE ===
  const qrSize = 220; // Large QR
  const qrX = 15;
  const qrY = Math.floor((height - qrSize) / 2);
  
  const qrMatrix = await generateQRMatrix(assetId, qrSize);
  for (let y = 0; y < qrMatrix.length && (qrY + y) < height; y++) {
    for (let x = 0; x < qrMatrix[y].length && (qrX + x) < width; x++) {
      if (qrMatrix[y][x] === 1) {
        setPixel(bitmap, rowBytes, width, qrX + x, qrY + y);
      }
    }
  }
  
  // === TEXT AREA (RIGHT) ===
  const textX = qrX + qrSize + 20;
  const textMaxWidth = width - textX - LOGO_SIZE - 20; // Reserve space for logo
  
  // Asset ID - LARGE (scale 4 = 32px)
  const idY = 20;
  drawText(bitmap, width, rowBytes, assetId || 'N/A', textX, idY, font, 4);
  
  // Type Label - MEDIUM (scale 3 = 24px)
  const typeY = idY + 40;
  drawText(bitmap, width, rowBytes, (typeLabel || '').substring(0, 20), textX, typeY, font, 3);
  
  // Serial Number - LARGE (scale 3 = 24px) - Made bigger!
  const snY = typeY + 35;
  drawText(bitmap, width, rowBytes, 'SN: ' + (serialNumber || 'N/A'), textX, snY, font, 3);
  
  // Location - MEDIUM (scale 2 = 16px)
  if (location) {
    const locY = snY + 35;
    drawText(bitmap, width, rowBytes, location.substring(0, 25), textX, locY, font, 2);
  }
  
  // === TSRID LOGO (BOTTOM RIGHT) ===
  const logoX = width - LOGO_SIZE - 15;
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

  // Init
  for (let i = 0; i < 200; i++) data.push(0x00);
  data.push(0x1B, 0x40);
  data.push(0x1B, 0x69, 0x61, 0x01);
  data.push(0x1B, 0x69, 0x7A, 0x86, 0x0A, 0x3E, 0x00);
  data.push(height & 0xFF, (height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);
  data.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0x00);
  data.push(0x1B, 0x69, 0x4B, 0x08);
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rowBytes = Math.ceil(width / 8);
  
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
    typeLabel: 'ZEBRA TC78',
    serialNumber: '22105525802581',
    location: 'AACHEN',
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
