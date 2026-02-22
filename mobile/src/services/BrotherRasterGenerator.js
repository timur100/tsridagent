/**
 * Brother QL Raster Generator - LARGER TEXT VERSION
 * QR smaller to allow bigger text
 */

import QRCode from 'qrcode';

const LABEL_WIDTH = 696;
const LABEL_HEIGHT = 271;

/**
 * Generate clean QR Code
 */
async function makeQRCode(content, size) {
  try {
    const qr = await QRCode.create(content || 'TSRID', { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const quiet = 2;
    const total = count + quiet * 2;
    const pxPerMod = Math.floor(size / total);
    const realSize = pxPerMod * total;
    
    const bmp = [];
    for (let py = 0; py < realSize; py++) {
      const row = [];
      const my = Math.floor(py / pxPerMod) - quiet;
      for (let px = 0; px < realSize; px++) {
        const mx = Math.floor(px / pxPerMod) - quiet;
        if (mx < 0 || mx >= count || my < 0 || my >= count) {
          row.push(0);
        } else {
          row.push(qr.modules.data[my * count + mx] ? 1 : 0);
        }
      }
      bmp.push(row);
    }
    return { bmp, size: realSize };
  } catch (e) {
    return { bmp: [], size: 0 };
  }
}

// 8x8 Font
const F = {
  '0':[0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0], '1':[0x18,0x38,0x18,0x18,0x18,0x18,0x7E,0],
  '2':[0x3C,0x66,0x06,0x1C,0x30,0x60,0x7E,0], '3':[0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0],
  '4':[0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0], '5':[0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0],
  '6':[0x1C,0x30,0x60,0x7C,0x66,0x66,0x3C,0], '7':[0x7E,0x06,0x0C,0x18,0x30,0x30,0x30,0],
  '8':[0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0], '9':[0x3C,0x66,0x66,0x3E,0x06,0x0C,0x38,0],
  'A':[0x18,0x3C,0x66,0x66,0x7E,0x66,0x66,0], 'B':[0x7C,0x66,0x66,0x7C,0x66,0x66,0x7C,0],
  'C':[0x3C,0x66,0x60,0x60,0x60,0x66,0x3C,0], 'D':[0x78,0x6C,0x66,0x66,0x66,0x6C,0x78,0],
  'E':[0x7E,0x60,0x60,0x7C,0x60,0x60,0x7E,0], 'F':[0x7E,0x60,0x60,0x7C,0x60,0x60,0x60,0],
  'G':[0x3C,0x66,0x60,0x6E,0x66,0x66,0x3C,0], 'H':[0x66,0x66,0x66,0x7E,0x66,0x66,0x66,0],
  'I':[0x7E,0x18,0x18,0x18,0x18,0x18,0x7E,0], 'J':[0x06,0x06,0x06,0x06,0x66,0x66,0x3C,0],
  'K':[0x66,0x6C,0x78,0x70,0x78,0x6C,0x66,0], 'L':[0x60,0x60,0x60,0x60,0x60,0x60,0x7E,0],
  'M':[0x63,0x77,0x7F,0x6B,0x63,0x63,0x63,0], 'N':[0x66,0x76,0x7E,0x7E,0x6E,0x66,0x66,0],
  'O':[0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0], 'P':[0x7C,0x66,0x66,0x7C,0x60,0x60,0x60,0],
  'Q':[0x3C,0x66,0x66,0x66,0x6A,0x6C,0x36,0], 'R':[0x7C,0x66,0x66,0x7C,0x6C,0x66,0x66,0],
  'S':[0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C,0], 'T':[0x7E,0x18,0x18,0x18,0x18,0x18,0x18,0],
  'U':[0x66,0x66,0x66,0x66,0x66,0x66,0x3C,0], 'V':[0x66,0x66,0x66,0x66,0x66,0x3C,0x18,0],
  'W':[0x63,0x63,0x63,0x6B,0x7F,0x77,0x63,0], 'X':[0x66,0x66,0x3C,0x18,0x3C,0x66,0x66,0],
  'Y':[0x66,0x66,0x66,0x3C,0x18,0x18,0x18,0], 'Z':[0x7E,0x06,0x0C,0x18,0x30,0x60,0x7E,0],
  '-':[0,0,0,0x7E,0,0,0,0], ':':[0,0x18,0x18,0,0x18,0x18,0,0],
  '.':[0,0,0,0,0,0x18,0x18,0], ' ':[0,0,0,0,0,0,0,0],
};
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => F[c] = F[c.toUpperCase()]);

function setP(bmp, rb, x, y, h) {
  if (x < 0 || y < 0 || y >= h) return;
  const bi = y * rb + Math.floor(x / 8);
  if (bi >= 0 && bi < bmp.length) bmp[bi] |= (1 << (7 - (x % 8)));
}

function drawTxt(bmp, rb, w, h, txt, x, y, sc) {
  const s = (txt || '').toUpperCase();
  let cx = x;
  for (const c of s) {
    const p = F[c] || F[' '];
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 8; col++) {
        if (p[r] & (0x80 >> col)) {
          for (let sy = 0; sy < sc; sy++) {
            for (let sx = 0; sx < sc; sx++) {
              setP(bmp, rb, cx + col * sc + sx, y + r * sc + sy, h);
            }
          }
        }
      }
    }
    cx += 8 * sc;
  }
}

function calcScale(txt, maxW, maxSc) {
  const len = (txt || '').length || 1;
  for (let s = maxSc; s >= 1; s--) {
    if (len * 8 * s <= maxW) return s;
  }
  return 1;
}

/**
 * Create Label Bitmap
 * QR: 180px (smaller to allow bigger text)
 * Text: Uses remaining ~500px width
 */
async function createBitmap(assetId, typeLabel, sn, loc, w, h) {
  const rb = Math.ceil(w / 8);
  const bmp = new Uint8Array(rb * h).fill(0);
  
  // QR Code - smaller to give more room for text
  const qrSize = 180;
  const qrX = 10;
  const qrY = Math.floor((h - qrSize) / 2);
  
  // Text area - much wider now
  const textX = qrSize + 25;
  const textW = w - textX - 10; // ~480px available
  
  // === QR CODE ===
  const qr = await makeQRCode(assetId, qrSize);
  if (qr.bmp.length > 0) {
    const offsetY = Math.floor((h - qr.size) / 2);
    for (let y = 0; y < qr.bmp.length; y++) {
      for (let x = 0; x < qr.bmp[y].length; x++) {
        if (qr.bmp[y][x]) setP(bmp, rb, qrX + x, offsetY + y, h);
      }
    }
  }
  
  // === TEXT - BIGGER ===
  
  // Line 1: Asset ID - Scale 4 = 32px height (fits 18 chars in 480px)
  const id = assetId || 'N/A';
  const sc1 = calcScale(id, textW, 4);
  const y1 = 25;
  drawTxt(bmp, rb, w, h, id, textX, y1, sc1);
  
  // Line 2: Type Label - Scale 4
  const y2 = y1 + sc1 * 8 + 20;
  const sc2 = calcScale(typeLabel, textW, 4);
  drawTxt(bmp, rb, w, h, typeLabel || '', textX, y2, sc2);
  
  // Line 3: Serial Number - Scale 4
  const snTxt = 'SN: ' + (sn || 'N/A');
  const y3 = y2 + sc2 * 8 + 20;
  const sc3 = calcScale(snTxt, textW, 4);
  drawTxt(bmp, rb, w, h, snTxt, textX, y3, sc3);
  
  // Line 4: Location (if provided)
  if (loc) {
    const y4 = y3 + sc3 * 8 + 15;
    const sc4 = calcScale(loc, textW, 3);
    drawTxt(bmp, rb, w, h, loc, textX, y4, sc4);
  }
  
  return bmp;
}

/**
 * Create Brother QL Raster Command
 */
export async function createBrotherRasterLabel(opts = {}) {
  const {
    assetId = 'TEST-001',
    typeLabel = 'Asset',
    serialNumber = 'N/A',
    location = '',
    width = LABEL_WIDTH,
    height = LABEL_HEIGHT,
    autoCut = true,
  } = opts;

  const d = [];
  
  for (let i = 0; i < 200; i++) d.push(0);
  d.push(0x1B, 0x40);
  d.push(0x1B, 0x69, 0x61, 0x01);
  d.push(0x1B, 0x69, 0x7A, 0x86, 0x0A, 0x3E, 0x00);
  d.push(height & 0xFF, (height >> 8) & 0xFF);
  d.push(0, 0, 0, 0);
  d.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0);
  d.push(0x1B, 0x69, 0x41, 0x01);
  d.push(0x1B, 0x69, 0x4B, 0x08);
  d.push(0x1B, 0x69, 0x64, 0, 0);

  const bmp = await createBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rb = Math.ceil(width / 8);
  
  for (let y = 0; y < height; y++) {
    d.push(0x67, 0x00, rb);
    for (let bi = rb - 1; bi >= 0; bi--) {
      let b = bmp[y * rb + bi] || 0;
      let r = 0;
      for (let i = 0; i < 8; i++) if (b & (1 << i)) r |= (1 << (7 - i));
      d.push(r);
    }
  }

  d.push(0x1A);
  return new Uint8Array(d);
}

export async function createTestLabel() {
  return createBrotherRasterLabel({
    assetId: 'TSRID-SCA-TSR-0001',
    typeLabel: 'TSRID SCANNER',
    serialNumber: '7E91145BA4244',
  });
}

export async function createAssetLabel(asset) {
  return createBrotherRasterLabel({
    assetId: asset.warehouse_asset_id || asset.asset_id || 'N/A',
    typeLabel: asset.type_label || asset.type || 'Asset',
    serialNumber: asset.manufacturer_sn || asset.serial_number || 'N/A',
    location: asset.location_name || asset.location || '',
  });
}

/**
 * Create location/station label with barcode
 * Barcode contains location_code for scanning
 */
export async function createLocationLabel(location) {
  const locationCode = location.location_code || 'N/A';
  const stationName = location.station_name || '-';
  const street = location.street || '-';
  const cityLine = `${location.postal_code || ''} ${location.city || ''}`.trim() || '-';
  const phone = location.phone || '-';
  const manager = location.manager || '-';
  const deviceInfo = `Geräte: ${location.device_count || 0}`;
  
  const width = LABEL_WIDTH;
  const height = LABEL_HEIGHT;
  const bmp = new Uint8Array(Math.ceil(width / 8) * height);
  const rb = Math.ceil(width / 8);
  
  // Helper to set pixel
  const setPixel = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const byteIndex = y * rb + Math.floor(x / 8);
    const bitIndex = 7 - (x % 8);
    bmp[byteIndex] |= (1 << bitIndex);
  };
  
  // Draw text using font
  const drawText = (text, x, y, scale = 1) => {
    let cx = x;
    for (const char of text) {
      const g = F[char.toUpperCase()] || F[' '];
      if (g) {
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (g[row] & (0x80 >> col)) {
              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  setPixel(cx + col * scale + sx, y + row * scale + sy);
                }
              }
            }
          }
        }
      }
      cx += 8 * scale + scale;
    }
  };
  
  // Generate barcode (Code128-like pattern for location_code)
  const generateBarcode = (text, startX, startY, height, moduleWidth = 2) => {
    // Simple barcode pattern - alternating bars based on character values
    let x = startX;
    
    // Start pattern
    for (let i = 0; i < 3; i++) {
      for (let w = 0; w < moduleWidth; w++) {
        for (let h = 0; h < height; h++) setPixel(x + w, startY + h);
      }
      x += moduleWidth * 2;
    }
    
    // Encode each character
    for (const char of text) {
      const code = char.charCodeAt(0);
      // Create bar pattern based on character code
      for (let bit = 7; bit >= 0; bit--) {
        const isBar = (code >> bit) & 1;
        if (isBar) {
          for (let w = 0; w < moduleWidth; w++) {
            for (let h = 0; h < height; h++) setPixel(x + w, startY + h);
          }
        }
        x += moduleWidth;
      }
    }
    
    // End pattern
    for (let i = 0; i < 3; i++) {
      for (let w = 0; w < moduleWidth; w++) {
        for (let h = 0; h < height; h++) setPixel(x + w, startY + h);
      }
      x += moduleWidth * 2;
    }
  };
  
  // Layout:
  // Row 1: Location Code (large) - scale 4
  drawText(locationCode.substring(0, 10), 10, 5, 4);
  
  // Row 2: Station Name - scale 2
  drawText(stationName.substring(0, 30).toUpperCase(), 10, 45, 2);
  
  // Row 3: Street - scale 2
  drawText(street.substring(0, 35).toUpperCase(), 10, 70, 2);
  
  // Row 4: City - scale 2
  drawText(cityLine.substring(0, 35).toUpperCase(), 10, 95, 2);
  
  // Row 5: Phone and Manager - scale 1
  drawText(`TEL: ${phone.substring(0, 20)}`, 10, 120, 1);
  drawText(`MANAGER: ${manager.substring(0, 15)}`.toUpperCase(), 250, 120, 1);
  
  // Row 6: Device count - scale 1
  drawText(deviceInfo.toUpperCase(), 10, 135, 1);
  
  // Barcode at bottom (location_code encoded)
  generateBarcode(locationCode, 10, 155, 60, 3);
  
  // Barcode text below
  drawText(locationCode, 10, 220, 2);
  
  // Build raster data
  const d = [];
  d.push(...[0x00].concat(Array(199).fill(0)));
  d.push(0x1B, 0x40);
  d.push(0x1B, 0x69, 0x61, 0x01);
  d.push(0x1B, 0x69, 0x21, 0x00);
  d.push(0x1B, 0x69, 0x7A, 0x0A, 0x0A, 62, 0, 0, 0, height & 0xFF, (height >> 8) & 0xFF, 0, 0);
  d.push(0x1B, 0x69, 0x4D, 0x40); // Auto-cut
  d.push(0x1B, 0x69, 0x41, 0x01);
  d.push(0x1B, 0x69, 0x4B, 0x08);
  d.push(0x1B, 0x69, 0x64, 0, 0);
  
  // Add raster lines (mirrored)
  for (let y = 0; y < height; y++) {
    d.push(0x67, 0x00, rb);
    for (let bi = rb - 1; bi >= 0; bi--) {
      let b = bmp[y * rb + bi] || 0;
      let r = 0;
      for (let i = 0; i < 8; i++) if (b & (1 << i)) r |= (1 << (7 - i));
      d.push(r);
    }
  }
  
  d.push(0x1A);
  return new Uint8Array(d);
}

export default { createBrotherRasterLabel, createTestLabel, createAssetLabel, createLocationLabel, LABEL_WIDTH, LABEL_HEIGHT };
