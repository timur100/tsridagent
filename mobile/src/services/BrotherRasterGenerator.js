/**
 * Brother QL Raster Generator for Mobile
 * 
 * TSRID Standard Label Layout:
 * - QR Code (LEFT) - ~40% width, scannable
 * - Text (RIGHT) - Large, readable
 * - Logo (BOTTOM RIGHT) - TSRID fingerprint
 */

import QRCode from 'qrcode';

// Brother QL-820NWB label dimensions for 62mm endless
const LABEL_WIDTH_PX = 696;  // 62mm at 300dpi
const LABEL_HEIGHT_PX = 271; // ~23mm height

/**
 * Generate a REAL scannable QR Code matrix
 */
async function generateQRCodeMatrix(content, modulePixelSize = 5) {
  try {
    // Create QR code
    const qr = await QRCode.create(content, {
      errorCorrectionLevel: 'M',
    });
    
    const moduleCount = qr.modules.size;
    const quietZone = 2; // White border around QR
    const totalModules = moduleCount + (quietZone * 2);
    const totalSize = totalModules * modulePixelSize;
    
    // Create pixel matrix
    const matrix = [];
    
    for (let pixelY = 0; pixelY < totalSize; pixelY++) {
      const row = [];
      const moduleY = Math.floor(pixelY / modulePixelSize) - quietZone;
      
      for (let pixelX = 0; pixelX < totalSize; pixelX++) {
        const moduleX = Math.floor(pixelX / modulePixelSize) - quietZone;
        
        // Quiet zone = white
        if (moduleX < 0 || moduleX >= moduleCount || moduleY < 0 || moduleY >= moduleCount) {
          row.push(0);
        } else {
          // Get QR module value
          const idx = moduleY * moduleCount + moduleX;
          const isDark = qr.modules.data[idx] ? 1 : 0;
          row.push(isDark);
        }
      }
      matrix.push(row);
    }
    
    return { matrix, size: totalSize, moduleCount, modulePixelSize };
  } catch (error) {
    console.error('QR generation error:', error);
    return { matrix: [], size: 0, moduleCount: 0, modulePixelSize: 0 };
  }
}

/**
 * Generate TSRID Logo - Fingerprint with scanner brackets
 * Matches the actual TSRID branding
 */
function generateTSRIDLogo(size) {
  const bitmap = [];
  const bracketLen = Math.floor(size * 0.25);
  const bracketWidth = Math.max(2, Math.floor(size * 0.06));
  const margin = Math.floor(size * 0.08);
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let pixel = 0;
      
      // === SCANNER BRACKETS ===
      // Top-left corner
      if (x >= margin && x < margin + bracketLen && y >= margin && y < margin + bracketWidth) pixel = 1;
      if (x >= margin && x < margin + bracketWidth && y >= margin && y < margin + bracketLen) pixel = 1;
      
      // Top-right corner  
      if (x >= size - margin - bracketLen && x < size - margin && y >= margin && y < margin + bracketWidth) pixel = 1;
      if (x >= size - margin - bracketWidth && x < size - margin && y >= margin && y < margin + bracketLen) pixel = 1;
      
      // Bottom-left corner
      if (x >= margin && x < margin + bracketLen && y >= size - margin - bracketWidth && y < size - margin) pixel = 1;
      if (x >= margin && x < margin + bracketWidth && y >= size - margin - bracketLen && y < size - margin) pixel = 1;
      
      // Bottom-right corner
      if (x >= size - margin - bracketLen && x < size - margin && y >= size - margin - bracketWidth && y < size - margin) pixel = 1;
      if (x >= size - margin - bracketWidth && x < size - margin && y >= size - margin - bracketLen && y < size - margin) pixel = 1;
      
      // === FINGERPRINT (vertical ellipse with ridges) ===
      const fpMargin = margin + bracketLen * 0.3;
      const fpWidth = size - fpMargin * 2;
      const fpHeight = size - fpMargin * 2;
      const fpCenterX = size / 2;
      const fpCenterY = size / 2;
      
      // Normalized coordinates
      const nx = (x - fpCenterX) / (fpWidth * 0.35);
      const ny = (y - fpCenterY) / (fpHeight * 0.45);
      const dist = Math.sqrt(nx * nx + ny * ny);
      
      // Inside fingerprint ellipse
      if (dist < 1.0) {
        // Create ridge pattern - curved horizontal lines that get closer together toward edges
        const ridgeFreq = 4.5 + dist * 2;
        const ridgeOffset = nx * 0.3; // Slight curve
        const ridge = Math.sin((ny + ridgeOffset) * ridgeFreq * Math.PI);
        
        if (ridge > 0.15 && ridge < 0.85) {
          pixel = 1;
        }
      }
      
      row.push(pixel);
    }
    bitmap.push(row);
  }
  
  return bitmap;
}

/**
 * 8x8 bitmap font for text rendering
 */
const FONT_8X8 = {
  '0': [0x3C, 0x66, 0x6E, 0x76, 0x66, 0x66, 0x3C, 0x00],
  '1': [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00],
  '2': [0x3C, 0x66, 0x06, 0x1C, 0x30, 0x60, 0x7E, 0x00],
  '3': [0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0x00],
  '4': [0x0C, 0x1C, 0x3C, 0x6C, 0x7E, 0x0C, 0x0C, 0x00],
  '5': [0x7E, 0x60, 0x7C, 0x06, 0x06, 0x66, 0x3C, 0x00],
  '6': [0x1C, 0x30, 0x60, 0x7C, 0x66, 0x66, 0x3C, 0x00],
  '7': [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x30, 0x30, 0x00],
  '8': [0x3C, 0x66, 0x66, 0x3C, 0x66, 0x66, 0x3C, 0x00],
  '9': [0x3C, 0x66, 0x66, 0x3E, 0x06, 0x0C, 0x38, 0x00],
  'A': [0x18, 0x3C, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00],
  'B': [0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00],
  'C': [0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00],
  'D': [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00],
  'E': [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x7E, 0x00],
  'F': [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x60, 0x00],
  'G': [0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3C, 0x00],
  'H': [0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00],
  'I': [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00],
  'J': [0x06, 0x06, 0x06, 0x06, 0x66, 0x66, 0x3C, 0x00],
  'K': [0x66, 0x6C, 0x78, 0x70, 0x78, 0x6C, 0x66, 0x00],
  'L': [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0x00],
  'M': [0x63, 0x77, 0x7F, 0x6B, 0x63, 0x63, 0x63, 0x00],
  'N': [0x66, 0x76, 0x7E, 0x7E, 0x6E, 0x66, 0x66, 0x00],
  'O': [0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00],
  'P': [0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0x00],
  'Q': [0x3C, 0x66, 0x66, 0x66, 0x6A, 0x6C, 0x36, 0x00],
  'R': [0x7C, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0x66, 0x00],
  'S': [0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0x00],
  'T': [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00],
  'U': [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00],
  'V': [0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00],
  'W': [0x63, 0x63, 0x63, 0x6B, 0x7F, 0x77, 0x63, 0x00],
  'X': [0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00],
  'Y': [0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0x00],
  'Z': [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x7E, 0x00],
  '-': [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00],
  ':': [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

// Add lowercase as uppercase
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => {
  FONT_8X8[c] = FONT_8X8[c.toUpperCase()];
});

/**
 * Set a pixel in the bitmap
 */
function setPixel(bitmap, rowBytes, x, y, maxHeight) {
  if (x < 0 || y < 0 || y >= maxHeight) return;
  const byteIdx = y * rowBytes + Math.floor(x / 8);
  const bitIdx = 7 - (x % 8);
  if (byteIdx >= 0 && byteIdx < bitmap.length) {
    bitmap[byteIdx] |= (1 << bitIdx);
  }
}

/**
 * Draw text at specified position and scale
 */
function drawText(bitmap, rowBytes, maxWidth, maxHeight, text, x, y, scale) {
  const upperText = (text || '').toUpperCase();
  const charWidth = 8 * scale;
  let curX = x;
  
  for (const char of upperText) {
    if (curX + charWidth > maxWidth) break; // Stop at edge
    
    const pattern = FONT_8X8[char] || FONT_8X8[' '];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
          // Draw scaled pixel
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(bitmap, rowBytes, curX + col * scale + sx, y + row * scale + sy, maxHeight);
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
 * Create the label bitmap
 * 
 * Layout:
 * +------------------------------------------+
 * |         |  TSRID-SCA-TSR-0001 (BIG)      |
 * |   QR    |  TSRID SCANNER (medium)        |
 * |  CODE   |  SN: 7E91145BA4244 (medium)    |
 * |         |                         [LOGO] |
 * +------------------------------------------+
 */
async function createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const bitmap = new Uint8Array(rowBytes * height);
  bitmap.fill(0);
  
  // Layout parameters
  const padding = 10;
  const qrAreaWidth = Math.floor(height * 0.95); // QR code takes ~square area based on height
  const textStartX = qrAreaWidth + 20;
  const logoSize = 60;
  const textMaxWidth = width - textStartX - logoSize - 20;
  
  // === 1. QR CODE (LEFT SIDE) ===
  // Calculate module size to fit in available height
  const qrContent = assetId || 'TSRID-TEST';
  const targetQRSize = height - padding * 2;
  const modulePixelSize = Math.floor(targetQRSize / 37); // QR v3 = ~33 modules + quiet zone
  
  const qrResult = await generateQRCodeMatrix(qrContent, Math.max(4, modulePixelSize));
  
  if (qrResult.matrix.length > 0) {
    const qrX = padding;
    const qrY = Math.floor((height - qrResult.size) / 2);
    
    for (let y = 0; y < qrResult.matrix.length && qrY + y < height; y++) {
      for (let x = 0; x < qrResult.matrix[y].length && qrX + x < width; x++) {
        if (qrResult.matrix[y][x] === 1) {
          setPixel(bitmap, rowBytes, qrX + x, qrY + y, height);
        }
      }
    }
  }
  
  // === 2. TEXT (RIGHT SIDE) ===
  
  // Line 1: Asset ID - BIGGEST (scale 4 = 32px height)
  const line1Y = 15;
  const scale1 = 4;
  drawText(bitmap, rowBytes, width, height, assetId || 'N/A', textStartX, line1Y, scale1);
  
  // Line 2: Type Label - Large (scale 3 = 24px height)
  const line2Y = line1Y + (8 * scale1) + 12;
  const scale2 = 3;
  drawText(bitmap, rowBytes, width, height, typeLabel || '', textStartX, line2Y, scale2);
  
  // Line 3: Serial Number - Large (scale 3 = 24px height)
  const line3Y = line2Y + (8 * scale2) + 10;
  const scale3 = 3;
  drawText(bitmap, rowBytes, width, height, 'SN: ' + (serialNumber || 'N/A'), textStartX, line3Y, scale3);
  
  // Line 4: Location (optional) - Medium (scale 2 = 16px height)
  if (location) {
    const line4Y = line3Y + (8 * scale3) + 8;
    drawText(bitmap, rowBytes, width, height, location, textStartX, line4Y, 2);
  }
  
  // === 3. TSRID LOGO (BOTTOM RIGHT) ===
  const logoX = width - logoSize - padding;
  const logoY = height - logoSize - padding;
  const logoBitmap = generateTSRIDLogo(logoSize);
  
  for (let y = 0; y < logoSize && logoY + y < height; y++) {
    for (let x = 0; x < logoSize && logoX + x < width; x++) {
      if (logoBitmap[y] && logoBitmap[y][x] === 1) {
        setPixel(bitmap, rowBytes, logoX + x, logoY + y, height);
      }
    }
  }
  
  return bitmap;
}

/**
 * Create Brother QL Raster Command Data
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

  // === BROTHER QL INITIALIZATION ===
  
  // Invalidate (clear buffer)
  for (let i = 0; i < 200; i++) data.push(0x00);
  
  // Initialize printer
  data.push(0x1B, 0x40); // ESC @
  
  // Enter raster mode
  data.push(0x1B, 0x69, 0x61, 0x01); // ESC i a 1
  
  // Print information command (62mm continuous)
  data.push(0x1B, 0x69, 0x7A);
  data.push(0x86);        // Valid flag
  data.push(0x0A);        // Media type: continuous
  data.push(0x3E);        // Media width: 62mm
  data.push(0x00);        // Media length (0 for continuous)
  data.push(height & 0xFF, (height >> 8) & 0xFF); // Raster lines
  data.push(0x00, 0x00, 0x00, 0x00); // Page/start page
  
  // Auto cut setting
  data.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0x00);
  
  // Cut every N labels (1)
  data.push(0x1B, 0x69, 0x41, 0x01);
  
  // Expanded mode
  data.push(0x1B, 0x69, 0x4B, 0x08);
  
  // Margins
  data.push(0x1B, 0x69, 0x64, 0x00, 0x00);

  // === GENERATE AND SEND BITMAP ===
  const bitmap = await createLabelBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rowBytes = Math.ceil(width / 8);
  
  // Send raster data line by line
  for (let y = 0; y < height; y++) {
    // Raster graphics command
    data.push(0x67, 0x00, rowBytes);
    
    // Send row data (Brother expects MSB first, rightmost byte first)
    for (let byteIdx = rowBytes - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * rowBytes + byteIdx] || 0x00;
      // Reverse bits
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) reversed |= (1 << (7 - bit));
      }
      data.push(reversed);
    }
  }

  // Print command
  data.push(0x1A);
  
  return new Uint8Array(data);
}

/**
 * Create test label
 */
export async function createTestLabel() {
  return await createBrotherRasterLabel({
    assetId: 'TSRID-SCA-TSR-0001',
    typeLabel: 'TSRID SCANNER',
    serialNumber: '7E91145BA4244',
    location: '',
  });
}

/**
 * Create label from asset object
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
