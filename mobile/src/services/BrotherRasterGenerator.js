/**
 * Brother QL Raster Generator
 * Korrekte Implementierung basierend auf Brother QL Raster Command Reference
 * Unterstützt QL-820NWB und 62mm Endlos-Etiketten (DK-22205)
 */

import QRCode from 'qrcode';

// Brother QL-820NWB: 62mm Endlos-Etikett = 696 Pixel Breite bei 300dpi
const LABEL_WIDTH = 696;
const LABEL_HEIGHT = 271;
const BYTES_PER_ROW = Math.ceil(LABEL_WIDTH / 8); // 87 bytes

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
};
// Kleinbuchstaben auf Großbuchstaben mappen
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => FONT[c] = FONT[c.toUpperCase()]);

/**
 * Setze ein Pixel in der Bitmap
 */
function setPixel(bmp, bytesPerRow, x, y, height) {
  if (x < 0 || y < 0 || y >= height || x >= bytesPerRow * 8) return;
  const byteIndex = y * bytesPerRow + Math.floor(x / 8);
  if (byteIndex >= 0 && byteIndex < bmp.length) {
    bmp[byteIndex] |= (0x80 >> (x % 8));
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
 * Erstelle Bitmap für Asset-Label
 */
async function createAssetBitmap(assetId, typeLabel, serialNumber, location, width, height) {
  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // QR Code - links
  const qrSize = 180;
  const qrX = 10;
  
  // Text-Bereich rechts vom QR
  const textX = qrSize + 25;
  const textW = width - textX - 10;
  
  // QR Code zeichnen
  const qr = await makeQRCode(assetId, qrSize);
  if (qr.bmp.length > 0) {
    const offsetY = Math.floor((height - qr.size) / 2);
    for (let y = 0; y < qr.bmp.length; y++) {
      for (let x = 0; x < qr.bmp[y].length; x++) {
        if (qr.bmp[y][x]) setPixel(bmp, bytesPerRow, qrX + x, offsetY + y, height);
      }
    }
  }
  
  // Text zeichnen
  const id = assetId || 'N/A';
  const sc1 = calcScale(id, textW, 4);
  drawText(bmp, bytesPerRow, width, height, id, textX, 25, sc1);
  
  const y2 = 25 + sc1 * 8 + 20;
  const sc2 = calcScale(typeLabel, textW, 4);
  drawText(bmp, bytesPerRow, width, height, typeLabel || '', textX, y2, sc2);
  
  const snTxt = 'SN: ' + (serialNumber || 'N/A');
  const y3 = y2 + sc2 * 8 + 20;
  const sc3 = calcScale(snTxt, textW, 4);
  drawText(bmp, bytesPerRow, width, height, snTxt, textX, y3, sc3);
  
  if (location) {
    const y4 = y3 + sc3 * 8 + 15;
    const sc4 = calcScale(location, textW, 3);
    drawText(bmp, bytesPerRow, width, height, location, textX, y4, sc4);
  }
  
  return bmp;
}

/**
 * Erstelle Brother QL Raster-Befehle
 * Basierend auf Brother QL Raster Command Reference
 */
function createRasterCommands(bitmap, width, height, autoCut = true) {
  const bytesPerRow = Math.ceil(width / 8);
  const commands = [];
  
  // 1. Invalidate - 400 Null-Bytes zum Zurücksetzen des Druckers
  for (let i = 0; i < 400; i++) commands.push(0x00);
  
  // 2. Initialize - ESC @
  commands.push(0x1B, 0x40);
  
  // 3. Switch to Raster Mode - ESC i a 1
  commands.push(0x1B, 0x69, 0x61, 0x01);
  
  // 4. Print Information Command - ESC i z
  // Für 62mm Endlos-Etikett (DK-22205)
  // Format: ESC i z {n1} {n2} {n3} {n4} {n5} {n6} {n7} {n8} {n9} {n10}
  commands.push(0x1B, 0x69, 0x7A);
  commands.push(0x8E);        // n1: Valid flags (Media type + width + quality)
  commands.push(0x0A);        // n2: Media type (0x0A = Continuous)
  commands.push(0x3E);        // n3: Media width (62mm = 0x3E)
  commands.push(0x00);        // n4: Media length (0 for continuous)
  // n5-n8: Raster number (Anzahl der Zeilen) - Little Endian
  commands.push(height & 0xFF);
  commands.push((height >> 8) & 0xFF);
  commands.push((height >> 16) & 0xFF);
  commands.push((height >> 24) & 0xFF);
  commands.push(0x00);        // n9: Starting page (0 = first page)
  commands.push(0x00);        // n10: Reserved
  
  // 5. Auto Cut - ESC i M
  commands.push(0x1B, 0x69, 0x4D);
  commands.push(autoCut ? 0x40 : 0x00);
  
  // 6. Cut Every - ESC i A (jedes Label schneiden)
  commands.push(0x1B, 0x69, 0x41, 0x01);
  
  // 7. Expanded Mode - ESC i K (Cut at end + 300dpi)
  commands.push(0x1B, 0x69, 0x4B);
  commands.push(0x08);  // Cut at end = bit 3
  
  // 8. Margins - ESC i d (0 für minimale Ränder)
  commands.push(0x1B, 0x69, 0x64);
  commands.push(0x00, 0x00);
  
  // 9. Raster Data
  // Jede Zeile: 'g' + Länge (1 Byte) + Daten
  // Bild muss horizontal gespiegelt werden für Brother!
  for (let y = 0; y < height; y++) {
    commands.push(0x67);  // 'g' = Raster graphics transfer
    commands.push(bytesPerRow);  // Anzahl Bytes in dieser Zeile
    
    // Zeile horizontal gespiegelt ausgeben (rechts nach links)
    for (let byteIdx = bytesPerRow - 1; byteIdx >= 0; byteIdx--) {
      let byte = bitmap[y * bytesPerRow + byteIdx] || 0;
      // Bits innerhalb jedes Bytes spiegeln
      let reversed = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) reversed |= (1 << (7 - bit));
      }
      commands.push(reversed);
    }
  }
  
  // 10. Print Command - 0x1A (End of transmission / Print)
  commands.push(0x1A);
  
  return new Uint8Array(commands);
}

/**
 * Erstelle Asset-Label
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

  const bitmap = await createAssetBitmap(assetId, typeLabel, serialNumber, location, width, height);
  return createRasterCommands(bitmap, width, height, autoCut);
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
 * Standort/Station-Label erstellen
 */
export async function createLocationLabel(location) {
  const locationCode = location.location_code || 'N/A';
  const stationName = location.station_name || '-';
  const street = location.street || '-';
  const cityLine = `${location.postal_code || ''} ${location.city || ''}`.trim() || '-';
  const phone = location.phone || '-';
  
  const width = LABEL_WIDTH;
  const height = 150;
  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // Einfacher Barcode zeichnen
  const drawBarcode = (text, startX, startY, barHeight, moduleWidth) => {
    let x = startX;
    const t = String(text || '').substring(0, 12);
    
    // Start-Muster
    for (let i = 0; i < 3; i++) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
      x += moduleWidth * 2;
    }
    
    // Daten-Bars (vereinfachte Codierung)
    for (let i = 0; i < t.length; i++) {
      const code = t.charCodeAt(i);
      for (let bit = 6; bit >= 0; bit--) {
        if ((code >> bit) & 1) {
          for (let bw = 0; bw < moduleWidth; bw++) {
            for (let bh = 0; bh < barHeight; bh++) {
              setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
            }
          }
        }
        x += moduleWidth;
      }
      x += moduleWidth; // Trennung zwischen Zeichen
    }
    
    // End-Muster
    for (let i = 0; i < 3; i++) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
      x += moduleWidth * 2;
    }
  };
  
  // Layout
  drawText(bmp, bytesPerRow, width, height, locationCode.substring(0, 10), 10, 5, 3);
  drawText(bmp, bytesPerRow, width, height, stationName.substring(0, 25), 10, 35, 2);
  drawText(bmp, bytesPerRow, width, height, street.substring(0, 35), 10, 55, 1);
  drawText(bmp, bytesPerRow, width, height, cityLine.substring(0, 30), 10, 68, 1);
  drawText(bmp, bytesPerRow, width, height, 'TEL: ' + phone.substring(0, 15), 10, 81, 1);
  
  // Barcode
  drawBarcode(locationCode, 10, 95, 35, 2);
  drawText(bmp, bytesPerRow, width, height, locationCode, 10, 133, 1);
  
  return createRasterCommands(bmp, width, height, true);
}

/**
 * Geräte-Label erstellen
 */
export async function createDeviceLabel(device) {
  const deviceId = device.device_id || 'N/A';
  const locationCode = device.locationcode || device.location_code || '-';
  const cityLine = `${device.zip || ''} ${device.city || ''}`.trim() || '-';
  const snPc = device.sn_pc || '-';
  const status = device.status || '-';
  
  const width = LABEL_WIDTH;
  const height = 150;
  const bytesPerRow = Math.ceil(width / 8);
  const bmp = new Uint8Array(bytesPerRow * height).fill(0);
  
  // Einfacher Barcode zeichnen
  const drawBarcode = (text, startX, startY, barHeight, moduleWidth) => {
    let x = startX;
    const t = String(text || '').substring(0, 15);
    
    // Start-Muster
    for (let i = 0; i < 3; i++) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
      x += moduleWidth * 2;
    }
    
    // Daten-Bars
    for (let i = 0; i < t.length; i++) {
      const code = t.charCodeAt(i);
      for (let bit = 6; bit >= 0; bit--) {
        if ((code >> bit) & 1) {
          for (let bw = 0; bw < moduleWidth; bw++) {
            for (let bh = 0; bh < barHeight; bh++) {
              setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
            }
          }
        }
        x += moduleWidth;
      }
      x += moduleWidth;
    }
    
    // End-Muster
    for (let i = 0; i < 3; i++) {
      for (let bw = 0; bw < moduleWidth; bw++) {
        for (let bh = 0; bh < barHeight; bh++) {
          setPixel(bmp, bytesPerRow, x + bw, startY + bh, height);
        }
      }
      x += moduleWidth * 2;
    }
  };
  
  // Layout
  drawText(bmp, bytesPerRow, width, height, deviceId.substring(0, 15), 10, 5, 2);
  drawText(bmp, bytesPerRow, width, height, status.toUpperCase() + ' | ' + locationCode, 10, 28, 2);
  drawText(bmp, bytesPerRow, width, height, cityLine.substring(0, 35), 10, 50, 1);
  drawText(bmp, bytesPerRow, width, height, 'SN: ' + snPc.substring(0, 25), 10, 63, 1);
  
  // Barcode
  drawBarcode(deviceId, 10, 80, 35, 2);
  drawText(bmp, bytesPerRow, width, height, deviceId, 10, 118, 1);
  
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
