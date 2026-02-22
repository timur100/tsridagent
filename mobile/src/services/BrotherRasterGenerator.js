/**
 * Brother QL Raster Generator - FINAL VERSION
 * 
 * Label: 62mm x 23mm = 696 x 271 pixels @ 300dpi
 * 
 * Layout:
 * - QR Code: LEFT, full height
 * - Asset ID: TOP RIGHT, large text, FULL WIDTH
 * - Type + SN: MIDDLE RIGHT
 * - Logo: BOTTOM RIGHT, large
 */

import QRCode from 'qrcode';

const LABEL_WIDTH = 696;
const LABEL_HEIGHT = 271;

/**
 * Generate QR Code - Clean black/white modules
 */
async function makeQRCode(content, size) {
  try {
    const qr = await QRCode.create(content || 'TSRID', { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const count = modules.size;
    const quiet = 2; // quiet zone
    const total = count + quiet * 2;
    const pxPerMod = Math.floor(size / total);
    const realSize = pxPerMod * total;
    
    // Create clean bitmap
    const bmp = [];
    for (let py = 0; py < realSize; py++) {
      const row = [];
      const my = Math.floor(py / pxPerMod) - quiet;
      for (let px = 0; px < realSize; px++) {
        const mx = Math.floor(px / pxPerMod) - quiet;
        if (mx < 0 || mx >= count || my < 0 || my >= count) {
          row.push(0);
        } else {
          row.push(modules.data[my * count + mx] ? 1 : 0);
        }
      }
      bmp.push(row);
    }
    return { bmp, size: realSize };
  } catch (e) {
    console.error('QR Error:', e);
    return { bmp: [], size: 0 };
  }
}

/**
 * TSRID Logo - Fingerprint with scanner frame
 * Made MUCH LARGER and clearer
 */
function makeLogo(size) {
  const bmp = [];
  const frame = Math.floor(size * 0.2); // frame corner length
  const thick = Math.max(4, Math.floor(size * 0.06)); // frame thickness
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let p = 0;
      
      // Frame corners (L-shaped brackets)
      // Top-left
      if ((x < frame && y < thick) || (x < thick && y < frame)) p = 1;
      // Top-right
      if ((x >= size - frame && y < thick) || (x >= size - thick && y < frame)) p = 1;
      // Bottom-left
      if ((x < frame && y >= size - thick) || (x < thick && y >= size - frame)) p = 1;
      // Bottom-right
      if ((x >= size - frame && y >= size - thick) || (x >= size - thick && y >= size - frame)) p = 1;
      
      // Fingerprint (ellipse with ridge lines)
      const cx = size / 2;
      const cy = size / 2;
      const rx = size * 0.32;
      const ry = size * 0.42;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      
      if (d < 1.0) {
        // Ridge pattern - curved horizontal lines
        const curve = dx * 0.3;
        const wave = Math.sin((dy + curve + 0.5) * 5.5 * Math.PI);
        if (wave > 0.0 && wave < 0.7) p = 1;
      }
      
      row.push(p);
    }
    bmp.push(row);
  }
  return bmp;
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
 */
async function createBitmap(assetId, typeLabel, sn, loc, w, h) {
  const rb = Math.ceil(w / 8);
  const bmp = new Uint8Array(rb * h).fill(0);
  
  // === LAYOUT CALCULATION ===
  const P = 5; // minimal padding
  
  // QR Code - take up most of the height
  const qrSize = h - P * 2; // ~261px
  const qrX = P;
  
  // Logo - bottom right, BIG (130x130)
  const logoSize = 130;
  const logoX = w - logoSize - P;
  const logoY = h - logoSize - P;
  
  // Text area
  const textX = qrSize + P + 15;
  const textW = w - textX - P; // Full width for line 1
  const textWWithLogo = logoX - textX - 10; // Width for lines with logo
  
  // === 1. QR CODE ===
  const qr = await makeQRCode(assetId, qrSize);
  if (qr.bmp.length > 0) {
    const qrY = Math.floor((h - qr.size) / 2);
    for (let y = 0; y < qr.bmp.length; y++) {
      for (let x = 0; x < qr.bmp[y].length; x++) {
        if (qr.bmp[y][x]) setP(bmp, rb, qrX + x, qrY + y, h);
      }
    }
  }
  
  // === 2. TEXT ===
  // Line 1: Asset ID - LARGE, full width available
  const id = assetId || 'N/A';
  const sc1 = calcScale(id, textW, 5);
  const y1 = 12;
  drawTxt(bmp, rb, w, h, id, textX, y1, sc1);
  
  // Line 2: Type - medium, avoid logo area
  const y2 = y1 + sc1 * 8 + 12;
  const sc2 = calcScale(typeLabel, textWWithLogo, 4);
  drawTxt(bmp, rb, w, h, typeLabel || '', textX, y2, sc2);
  
  // Line 3: Serial Number - medium
  const snTxt = 'SN: ' + (sn || 'N/A');
  const y3 = y2 + sc2 * 8 + 10;
  const sc3 = calcScale(snTxt, textWWithLogo, 4);
  drawTxt(bmp, rb, w, h, snTxt, textX, y3, sc3);
  
  // Line 4: Location (optional)
  if (loc) {
    const y4 = y3 + sc3 * 8 + 8;
    const sc4 = calcScale(loc, textWWithLogo, 3);
    drawTxt(bmp, rb, w, h, loc, textX, y4, sc4);
  }
  
  // === 3. LOGO ===
  const logo = makeLogo(logoSize);
  for (let y = 0; y < logoSize; y++) {
    for (let x = 0; x < logoSize; x++) {
      if (logo[y] && logo[y][x]) setP(bmp, rb, logoX + x, logoY + y, h);
    }
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
  
  // Invalidate
  for (let i = 0; i < 200; i++) d.push(0);
  
  // Init
  d.push(0x1B, 0x40);
  
  // Raster mode
  d.push(0x1B, 0x69, 0x61, 0x01);
  
  // Print info
  d.push(0x1B, 0x69, 0x7A, 0x86, 0x0A, 0x3E, 0x00);
  d.push(height & 0xFF, (height >> 8) & 0xFF);
  d.push(0, 0, 0, 0);
  
  // Settings
  d.push(0x1B, 0x69, 0x4D, autoCut ? 0x40 : 0);
  d.push(0x1B, 0x69, 0x41, 0x01);
  d.push(0x1B, 0x69, 0x4B, 0x08);
  d.push(0x1B, 0x69, 0x64, 0, 0);

  // Bitmap
  const bmp = await createBitmap(assetId, typeLabel, serialNumber, location, width, height);
  const rb = Math.ceil(width / 8);
  
  // Send lines
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

export default { createBrotherRasterLabel, createTestLabel, createAssetLabel, LABEL_WIDTH, LABEL_HEIGHT };
