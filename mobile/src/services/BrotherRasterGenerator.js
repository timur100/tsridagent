/**
 * Brother QL Raster Generator
 * Korrekte Implementierung basierend auf Brother QL Raster Command Reference
 * Unterstützt QL-820NWB und 62mm Endlos-Etiketten (DK-22205)
 */

import QRCode from 'qrcode';

// Brother QL-820NWB: 62mm Endlos-Etikett = 696 Pixel Breite bei 300dpi
const LABEL_WIDTH = 696;
const LABEL_HEIGHT = 271;
const BYTES_PER_ROW = 87; // 696 / 8 = 87 bytes

/**
 * Generate QR Code als Bitmap
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

// 8x8 Pixel Font
const FONT = {
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
  '/':[0x02,0x06,0x0C,0x18,0x30,0x60,0x40,0],
  '|':[0x18,0x18,0x18,0x18,0x18,0x18,0x18,0],
};
// Kleinbuchstaben auf Großbuchstaben mappen
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => FONT[c] = FONT[c.toUpperCase()]);

/**
 * Setze ein Pixel in der Bitmap (schwarz = 1)
 * Brother druckt: Bit=1 -> schwarz, Bit=0 -> weiß
 */
function setPixel(bmp, bytesPerRow, x, y, height) {
  if (x < 0 || y < 0 || y >= height || x >= bytesPerRow * 8) return;
  const byteIndex = y * bytesPerRow + Math.floor(x / 8);
  const bitPosition = 7 - (x % 8); // MSB first
  if (byteIndex >= 0 && byteIndex < bmp.length) {
    bmp[byteIndex] |= (1 << bitPosition);
  }
}

/**
 * Zeichne Text in die Bitmap
 */
function drawText(bmp, bytesPerRow, width, height, text, x, y, scale) {
  const str = (text || '').toUpperCase();
  let curX = x;
  for (const char of str) {
    const pattern = FONT[char] || FONT[' '];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (pattern[row] & (0x80 >> col)) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(bmp, bytesPerRow, curX + col * scale + sx, y + row * scale + sy, height);
            }
          }
        }
      }
    }
    curX += 8 * scale;
  }
}

/**
 * Zeichne Barcode in die Bitmap (Code128-ähnlich)
 */
function drawBarcode(bmp, bytesPerRow, width, height, text, startX, startY, barHeight, moduleWidth) {
  let x = startX;
  const t = String(text || '').substring(0, 20);
  
  // Start-Muster
  const startPattern = [1,1,0,1,0,0,1,1,0,1];
  for (let i = 0; i < startPattern.length; i++) {
    if (startPattern[i]) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
    }
    x += moduleWidth;
  }
  
  // Daten-Bars (vereinfachte Codierung)
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      if ((code >> bit) & 1) {
        for (let bw = 0; bw < moduleWidth; bw++) {
          for (let bh = 0; bh < barHeight; bh++) {
            setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
          }
        }
      }
      x += moduleWidth;
    }
  }
  
  // End-Muster
  const endPattern = [1,1,0,0,1,0,1,1,0,1,1];
  for (let i = 0; i < endPattern.length; i++) {
    if (endPattern[i]) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
    }
    x += moduleWidth;
  }
}

/**
 * Spiegelt Bitmap horizontal (für Brother QL Drucker)
 */
function mirrorBitmapHorizontal(bmp, bytesPerRow, height) {
  const mirrored = new Uint8Array(bmp.length);
  const width = bytesPerRow * 8;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Hole Pixel von Position x
      const srcByteIdx = y * bytesPerRow + Math.floor(x / 8);
      const srcBitPos = 7 - (x % 8);
      const pixel = (bmp[srcByteIdx] >> srcBitPos) & 1;
      
      // Setze Pixel an gespiegelter Position (width - 1 - x)
      const dstX = width - 1 - x;
      const dstByteIdx = y * bytesPerRow + Math.floor(dstX / 8);
      const dstBitPos = 7 - (dstX % 8);
      if (pixel) {
        mirrored[dstByteIdx] |= (1 << dstBitPos);
      }
    }
  }
  return mirrored;
}

/**
 * Berechne optimale Schriftgröße
 */
function calcScale(text, maxWidth, maxScale) {
  const len = (text || '').length || 1;
  for (let s = maxScale; s >= 1; s--) {
    if (len * 8 * s <= maxWidth) return s;
  }
  return 1;
}

/**
 * Erstelle Brother QL Raster-Befehle
 */
function createRasterCommands(bitmap, width, height, autoCut = true) {
  const bytesPerRow = BYTES_PER_ROW;
  
  // Bitmap horizontal spiegeln für Brother
  const srcBytesPerRow = Math.ceil(width / 8);
  const mirroredBmp = mirrorBitmapHorizontal(bitmap, srcBytesPerRow, height);
  
  const commands = [];
  
  // 1. Invalidate - 400 Null-Bytes
  for (let i = 0; i < 400; i++) commands.push(0x00);
  
  // 2. Initialize - ESC @
  commands.push(0x1B, 0x40);
  
  // 3. Switch to Raster Mode - ESC i a 1
  commands.push(0x1B, 0x69, 0x61, 0x01);
  
  // 4. Print Information Command - ESC i z
  commands.push(0x1B, 0x69, 0x7A);
  commands.push(0x8E);        // n1: Valid flags
  commands.push(0x0A);        // n2: Media type (Continuous)
  commands.push(0x3E);        // n3: Media width (62mm)
  commands.push(0x00);        // n4: Media length
  commands.push(height & 0xFF);
  commands.push((height >> 8) & 0xFF);
  commands.push((height >> 16) & 0xFF);
  commands.push((height >> 24) & 0xFF);
  commands.push(0x00);        // n9: Starting page
  commands.push(0x00);        // n10: Reserved
  
  // 5. Auto Cut
  commands.push(0x1B, 0x69, 0x4D);
  commands.push(autoCut ? 0x40 : 0x00);
  
  // 6. Cut Every
  commands.push(0x1B, 0x69, 0x41, 0x01);
  
  // 7. Expanded Mode
  commands.push(0x1B, 0x69, 0x4B, 0x08);
  
  // 8. Margins
  commands.push(0x1B, 0x69, 0x64, 0x00, 0x00);
  
  // 9. Raster Data
  for (let y = 0; y < height; y++) {
    commands.push(0x67);      // 'g'
    commands.push(0x00);      // Compression = 0
    commands.push(bytesPerRow); // 87 bytes
    
    for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
      const srcIdx = y * srcBytesPerRow + byteIdx;
      commands.push(srcIdx < mirroredBmp.length ? mirroredBmp[srcIdx] : 0);
    }
  }
  
  // 10. Print
  commands.push(0x1A);
  
  return new Uint8Array(commands);
}

/**
 * Erstelle Asset-Label (mit QR Code)
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

  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // QR Code - links
  const qrSize = 200;
  const qrX = 20;
  
  const qr = await makeQRCode(assetId, qrSize);
  if (qr.bmp.length > 0) {
    const offsetY = Math.floor((height - qr.size) / 2);
    for (let y = 0; y < qr.bmp.length; y++) {
      for (let x = 0; x < qr.bmp[y].length; x++) {
        if (qr.bmp[y][x]) setPixel(bmp, bytesPerRow, qrX + x, offsetY + y, height);
      }
    }
  }
  
  // Text-Bereich rechts vom QR
  const textX = qrSize + 50;
  const textW = width - textX - 20;
  
  const id = assetId || 'N/A';
  const sc1 = Math.min(calcScale(id, textW, 5), 5);
  drawText(bmp, bytesPerRow, width, height, id, textX, 30, sc1);
  
  const y2 = 30 + sc1 * 8 + 25;
  const sc2 = Math.min(calcScale(typeLabel, textW, 4), 4);
  drawText(bmp, bytesPerRow, width, height, typeLabel || '', textX, y2, sc2);
  
  const snTxt = 'SN: ' + (serialNumber || 'N/A');
  const y3 = y2 + sc2 * 8 + 25;
  const sc3 = Math.min(calcScale(snTxt, textW, 4), 4);
  drawText(bmp, bytesPerRow, width, height, snTxt, textX, y3, sc3);
  
  if (location) {
    const y4 = y3 + sc3 * 8 + 20;
    const sc4 = Math.min(calcScale(location, textW, 3), 3);
    drawText(bmp, bytesPerRow, width, height, location, textX, y4, sc4);
  }
  
  return createRasterCommands(bmp, width, height, autoCut);
}

/**
 * Test-Label erstellen
 */
export async function createTestLabel() {
  return createBrotherRasterLabel({
    assetId: 'TSRID-SCA-TSR-0001',
    typeLabel: 'TSRID SCANNER',
    serialNumber: '7E91145BA4244',
  });
}

/**
 * Asset-Label aus Asset-Objekt erstellen
 */
export async function createAssetLabel(asset) {
  return createBrotherRasterLabel({
    assetId: asset.warehouse_asset_id || asset.asset_id || 'N/A',
    typeLabel: asset.type_label || asset.type || 'Asset',
    serialNumber: asset.manufacturer_sn || asset.serial_number || 'N/A',
    location: asset.location_name || asset.location || '',
  });
}

/**
 * Standort/Station-Label erstellen - GROSS und LESBAR
 */
export async function createLocationLabel(location) {
  const locationCode = location.location_code || 'N/A';
  const stationName = location.station_name || '-';
  const street = location.street || '-';
  const cityLine = `${location.postal_code || ''} ${location.city || ''}`.trim() || '-';
  const phone = location.phone || '-';
  
  const width = LABEL_WIDTH;
  const height = 350; // Größere Höhe für bessere Lesbarkeit
  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // Layout mit GROSSEN Schriften
  // Zeile 1: Location Code - SEHR GROSS (scale 5)
  drawText(bmp, bytesPerRow, width, height, locationCode.substring(0, 12), 30, 20, 5);
  
  // Zeile 2: Stationsname - GROSS (scale 4)
  drawText(bmp, bytesPerRow, width, height, stationName.substring(0, 18), 30, 70, 4);
  
  // Zeile 3: Straße - Mittel (scale 3)
  drawText(bmp, bytesPerRow, width, height, street.substring(0, 25), 30, 110, 3);
  
  // Zeile 4: PLZ Stadt - Mittel (scale 3)
  drawText(bmp, bytesPerRow, width, height, cityLine.substring(0, 25), 30, 140, 3);
  
  // Zeile 5: Telefon - Mittel (scale 3)
  drawText(bmp, bytesPerRow, width, height, 'TEL: ' + phone.substring(0, 20), 30, 175, 3);
  
  // Barcode - GROSS
  drawBarcode(bmp, bytesPerRow, width, height, locationCode, 30, 220, 80, 3);
  
  // Barcode-Text darunter
  drawText(bmp, bytesPerRow, width, height, locationCode, 30, 310, 3);
  
  return createRasterCommands(bmp, width, height, true);
}

/**
 * Geräte-Label erstellen - GROSS und LESBAR
 */
export async function createDeviceLabel(device) {
  const deviceId = device.device_id || 'N/A';
  const locationCode = device.locationcode || device.location_code || '-';
  const cityLine = `${device.zip || ''} ${device.city || ''}`.trim() || '-';
  const snPc = device.sn_pc || '-';
  const status = device.status || '-';
  
  const width = LABEL_WIDTH;
  const height = 350; // Größere Höhe für bessere Lesbarkeit
  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // Layout mit GROSSEN Schriften
  // Zeile 1: Device ID - SEHR GROSS (scale 5)
  drawText(bmp, bytesPerRow, width, height, deviceId.substring(0, 14), 30, 20, 5);
  
  // Zeile 2: Status + Location Code - GROSS (scale 4)
  const statusLine = status.toUpperCase() + ' | ' + locationCode;
  drawText(bmp, bytesPerRow, width, height, statusLine.substring(0, 18), 30, 70, 4);
  
  // Zeile 3: Stadt - Mittel (scale 3)
  drawText(bmp, bytesPerRow, width, height, cityLine.substring(0, 25), 30, 115, 3);
  
  // Zeile 4: Seriennummer - Mittel (scale 3)
  drawText(bmp, bytesPerRow, width, height, 'SN: ' + snPc.substring(0, 20), 30, 150, 3);
  
  // Barcode - GROSS
  drawBarcode(bmp, bytesPerRow, width, height, deviceId, 30, 195, 80, 3);
  
  // Barcode-Text darunter
  drawText(bmp, bytesPerRow, width, height, deviceId, 30, 285, 3);
  
  return createRasterCommands(bmp, width, height, true);
}

export default { 
  createBrotherRasterLabel, 
  createTestLabel, 
  createAssetLabel, 
  createLocationLabel, 
  createDeviceLabel, 
  LABEL_WIDTH, 
  LABEL_HEIGHT 
};
