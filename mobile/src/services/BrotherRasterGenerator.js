/**
 * Brother QL Raster Generator for Mobile
 * TSRID Label - Optimized for full label utilization
 * 
 * Label: 62mm continuous = 696px width x 271px height
 */

import QRCode from 'qrcode';

const LABEL_WIDTH_PX = 696;
const LABEL_HEIGHT_PX = 271;

/**
 * Generate scannable QR Code matrix
 */
async function generateQRCodeMatrix(content, targetSize) {
  try {
    const qr = await QRCode.create(content, { errorCorrectionLevel: 'M' });
    const moduleCount = qr.modules.size;
    const quietZone = 2;
    const totalModules = moduleCount + (quietZone * 2);
    
    // Calculate pixel size per module to reach target size
    const modulePixelSize = Math.floor(targetSize / totalModules);
    const actualSize = modulePixelSize * totalModules;
    
    const matrix = [];
    for (let pixelY = 0; pixelY < actualSize; pixelY++) {
      const row = [];
      const moduleY = Math.floor(pixelY / modulePixelSize) - quietZone;
      
      for (let pixelX = 0; pixelX < actualSize; pixelX++) {
        const moduleX = Math.floor(pixelX / modulePixelSize) - quietZone;
        
        if (moduleX < 0 || moduleX >= moduleCount || moduleY < 0 || moduleY >= moduleCount) {
          row.push(0); // Quiet zone
        } else {
          const idx = moduleY * moduleCount + moduleX;
          row.push(qr.modules.data[idx] ? 1 : 0);
        }
      }
      matrix.push(row);
    }
    
    return { matrix, size: actualSize };
  } catch (error) {
    console.error('QR error:', error);
    return { matrix: [], size: 0 };
  }
}

/**
 * TSRID Logo - Fingerprint with scanner brackets
 */
function generateTSRIDLogo(size) {
  const bitmap = [];
  const bracketLen = Math.floor(size * 0.3);
  const bracketW = Math.max(3, Math.floor(size * 0.07));
  const m = Math.floor(size * 0.05);
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let px = 0;
      
      // Scanner brackets (all 4 corners)
      // Top-left
      if ((x >= m && x < m + bracketLen && y >= m && y < m + bracketW) ||
          (x >= m && x < m + bracketW && y >= m && y < m + bracketLen)) px = 1;
      // Top-right
      if ((x >= size-m-bracketLen && x < size-m && y >= m && y < m + bracketW) ||
          (x >= size-m-bracketW && x < size-m && y >= m && y < m + bracketLen)) px = 1;
      // Bottom-left
      if ((x >= m && x < m + bracketLen && y >= size-m-bracketW && y < size-m) ||
          (x >= m && x < m + bracketW && y >= size-m-bracketLen && y < size-m)) px = 1;
      // Bottom-right
      if ((x >= size-m-bracketLen && x < size-m && y >= size-m-bracketW && y < size-m) ||
          (x >= size-m-bracketW && x < size-m && y >= size-m-bracketLen && y < size-m)) px = 1;
      
      // Fingerprint inside brackets
      const fpM = m + bracketW + 2;
      const cx = size / 2;
      const cy = size / 2;
      const rx = (size - fpM * 2) / 2;
      const ry = (size - fpM * 2) / 2 * 1.2;
      
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      
      if (dist < 1.0 && x > fpM && x < size - fpM && y > fpM && y < size - fpM) {
        // Curved ridge lines
        const curve = nx * 0.4;
        const ridge = Math.sin((ny + curve) * 6 * Math.PI);
        if (ridge > 0.1 && ridge < 0.9) px = 1;
      }
      
      row.push(px);
    }
    bitmap.push(row);
  }
  return bitmap;
}

/**
 * 8x8 Font
 */
const FONT = {
  '0': [0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0x00],
  '1': [0x18,0x38,0x18,0x18,0x18,0x18,0x7E,0x00],
  '2': [0x3C,0x66,0x06,0x1C,0x30,0x60,0x7E,0x00],
  '3': [0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00],
  '4': [0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0x00],
  '5': [0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0x00],
  '6': [0x1C,0x30,0x60,0x7C,0x66,0x66,0x3C,0x00],
  '7': [0x7E,0x06,0x0C,0x18,0x30,0x30,0x30,0x00],
  '8': [0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00],
  '9': [0x3C,0x66,0x66,0x3E,0x06,0x0C,0x38,0x00],
  'A': [0x18,0x3C,0x66,0x66,0x7E,0x66,0x66,0x00],
  'B': [0x7C,0x66,0x66,0x7C,0x66,0x66,0x7C,0x00],
  'C': [0x3C,0x66,0x60,0x60,0x60,0x66,0x3C,0x00],
  'D': [0x78,0x6C,0x66,0x66,0x66,0x6C,0x78,0x00],
  'E': [0x7E,0x60,0x60,0x7C,0x60,0x60,0x7E,0x00],
  'F': [0x7E,0x60,0x60,0x7C,0x60,0x60,0x60,0x00],
  'G': [0x3C,0x66,0x60,0x6E,0x66,0x66,0x3C,0x00],
  'H': [0x66,0x66,0x66,0x7E,0x66,0x66,0x66,0x00],
  'I': [0x7E,0x18,0x18,0x18,0x18,0x18,0x7E,0x00],
  'J': [0x06,0x06,0x06,0x06,0x66,0x66,0x3C,0x00],
  'K': [0x66,0x6C,0x78,0x70,0x78,0x6C,0x66,0x00],
  'L': [0x60,0x60,0x60,0x60,0x60,0x60,0x7E,0x00],
  'M': [0x63,0x77,0x7F,0x6B,0x63,0x63,0x63,0x00],
  'N': [0x66,0x76,0x7E,0x7E,0x6E,0x66,0x66,0x00],
  'O': [0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0x00],
  'P': [0x7C,0x66,0x66,0x7C,0x60,0x60,0x60,0x00],
  'Q': [0x3C,0x66,0x66,0x66,0x6A,0x6C,0x36,0x00],
  'R': [0x7C,0x66,0x66,0x7C,0x6C,0x66,0x66,0x00],
  'S': [0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C,0x00],
  'T': [0x7E,0x18,0x18,0x18,0x18,0x18,0x18,0x00],
  'U': [0x66,0x66,0x66,0x66,0x66,0x66,0x3C,0x00],
  'V': [0x66,0x66,0x66,0x66,0x66,0x3C,0x18,0x00],
  'W': [0x63,0x63,0x63,0x6B,0x7F,0x77,0x63,0x00],
  'X': [0x66,0x66,0x3C,0x18,0x3C,0x66,0x66,0x00],
  'Y': [0x66,0x66,0x66,0x3C,0x18,0x18,0x18,0x00],
  'Z': [0x7E,0x06,0x0C,0x18,0x30,0x60,0x7E,0x00],
  '-': [0x00,0x00,0x00,0x7E,0x00,0x00,0x00,0x00],
  ':': [0x00,0x18,0x18,0x00,0x18,0x18,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x00],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '/': [0x06,0x0C,0x18,0x30,0x60,0xC0,0x80,0x00],
};
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => { FONT[c] = FONT[c.toUpperCase()]; });

function setPixel(bitmap, rowBytes, x, y, maxH) {
  if (x < 0 || y < 0 || y >= maxH) return;
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Draw text with specified scale
 */
function drawText(bitmap, rowBytes, maxW, maxH, text, x, y, scale) {
  const str = (text || '').toUpperCase();
  const charW = 8 * scale;
  let curX = x;
  
  for (const c of str) {
    if (curX + charW > maxW) break;
    const pattern = FONT[c] || FONT[' '];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(bitmap, rowBytes, curX + col*scale + sx, y + row*scale + sy, maxH);
            }
          }
        }
      }
    }
    curX += charW;
  }
  return curX;
}

/**
 * Calculate max scale that fits text in width
 */
function calcMaxScale(text, maxWidth, maxScale = 5) {
  const len = (text || '').length;
  if (len === 0) return maxScale;
  
  for (let s = maxScale; s >= 1; s--) {
    if (len * 8 * s <= maxWidth) return s;
  }
  return 1;
}

/**
 * Create label bitmap - FULL UTILIZATION LAYOUT
 * 
 * +-----------------------------------------------+
 * |                                               |
 * |   +-------+   TSRID-SCA-TSR-0001   (LARGE)   |
 * |   |  QR   |   TSRID SCANNER        (MEDIUM)  |
 * |   | CODE  |   SN: 7E91145BA4244    (MEDIUM)  |
 * |   +-------+                        [LOGO]    |
 * |                                               |
 * +-----------------------------------------------+
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  bitmap.fill(0);
  
  const PAD = 8;
  
  // === QR CODE - LEFT SIDE ===
  // Make QR as large as possible while leaving room for text
  const qrSize = height - PAD * 2; // Use full height minus padding
  const qrX = PAD;
  const qrY = PAD;
  
  const qrResult = await generateQRCodeMatrix(assetId || 'TSRID', qrSize);
  
  if (qrResult.matrix.length > 0) {
    // Center QR vertically if smaller than target
    const qrOffsetY = Math.floor((height - qrResult.size) / 2);
    
    for (let y = 0; y < qrResult.matrix.length; y++) {
      for (let x = 0; x < qrResult.matrix[y].length; x++) {
        if (qrResult.matrix[y][x] === 1) {
          setPixel(bitmap, rowBytes, qrX + x, qrOffsetY + y, height);
        }
      }
    }
  }
  
  // === TEXT AREA - RIGHT SIDE ===
  const textX = qrX + qrSize + 20;
  const logoSize = 80; // Bigger logo
  const textMaxWidth = width - textX - PAD;
  const textWidthForAssetId = width - textX - PAD; // Full width for asset ID (logo below)
  
  // Line 1: Asset ID - USE MAXIMUM POSSIBLE SCALE
  const assetIdText = assetId || 'N/A';
  const scale1 = calcMaxScale(assetIdText, textWidthForAssetId, 5);
  const line1Y = PAD + 5;
  drawText(bitmap, rowBytes, width, height, assetIdText, textX, line1Y, scale1);
  
  // Line 2: Type Label
  const line2Y = line1Y + (8 * scale1) + 15;
  const scale2 = calcMaxScale(typeLabel, textMaxWidth - logoSize, 4);
  drawText(bitmap, rowBytes, width - logoSize - PAD, height, typeLabel || '', textX, line2Y, scale2);
  
  // Line 3: Serial Number
  const snText = 'SN: ' + (serialNumber || 'N/A');
  const line3Y = line2Y + (8 * scale2) + 12;
  const scale3 = calcMaxScale(snText, textMaxWidth - logoSize, 4);
  drawText(bitmap, rowBytes, width - logoSize - PAD, height, snText, textX, line3Y, scale3);
  
  // Line 4: Location (if provided)
  if (location) {
    const line4Y = line3Y + (8 * scale3) + 10;
    const scale4 = calcMaxScale(location, textMaxWidth - logoSize, 3);
    drawText(bitmap, rowBytes, width - logoSize - PAD, height, location, textX, line4Y, scale4);
  }
  
  // === LOGO - BOTTOM RIGHT ===
  const logoX = width - logoSize - PAD;
  const logoY = height - logoSize - PAD;
  const logoBitmap = generateTSRIDLogo(logoSize);
  
  for (let y = 0; y < logoSize; y++) {
    for (let x = 0; x < logoSize; x++) {
      if (logoBitmap[y] && logoBitmap[y][x] === 1) {
        setPixel(bitmap, rowBytes, logoX + x, logoY + y, height);
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

  // Invalidate
  for (let i = 0; i < 200; i++) data.push(0x00);
  
  // Initialize
  data.push(0x1B, 0x40);
  
  // Raster mode
  data.push(0x1B, 0x69, 0x61, 0x01);
  
  // Print info (62mm continuous)
  data.push(0x1B, 0x69, 0x7A, 0x86, 0x0A, 0x3E, 0x00);
  data.push(height & 0xFF, (height >> 8) & 0xFF);
  data.push(0x00, 0x00, 0x00, 0x00);
  
  // Auto cut
  data.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0x00);
  data.push(0x1B, 0x69, 0x41, 0x01);
  data.push(0x1B, 0x69, 0x4B, 0x08);
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // Generate bitmap
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rowBytes = Math.ceil(width / 8);
  
  // Send raster lines
  for (let y = 0; y < height; y++) {
    data.push(0x67, 0x00, rowBytes);
    
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      let rev = 0;
      for (let b = 0; b < 8; b++) {
        if (byte & (1 << b)) rev |= (1 << (7 - b));
      }
      data.push(rev);
    }
  }

  data.push(0x1A);
  
  return new Uint8Array(data);
}

export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'TSRID-SCA-TSR-0001',
    typeLabel: 'TSRID SCANNER',
    serialNumber: '7E91145BA4244',
    location: '',
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
