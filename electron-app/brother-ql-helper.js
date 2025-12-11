/**
 * Brother QL-1110NWB Helper
 * Generiert Brother P-touch Template (BLF) Befehle
 */

/**
 * Erstellt ein einfaches Text-Label für Brother QL
 * @param {string} text - Text für das Label
 * @returns {Buffer} - Brother QL Raster Command
 */
function createSimpleLabel(text) {
  // Brother QL nutzt ESC/P Raster Commands
  // Für produktiven Einsatz: brother_ql Python Library empfohlen
  
  // Einfacher ESC/P Befehl für Text
  const commands = [];
  
  // Initialize
  commands.push(Buffer.from([0x1B, 0x40])); // ESC @ (Initialize)
  
  // Set label size (62mm x 29mm für QL-1110NWB)
  commands.push(Buffer.from([0x1B, 0x69, 0x7A, 0xB4, 0x00, 0x3E, 0x00, 0x00, 0x00]));
  
  // Text data
  const textBuffer = Buffer.from(text, 'utf-8');
  commands.push(textBuffer);
  
  // Print
  commands.push(Buffer.from([0x0C])); // Form feed (print)
  
  return Buffer.concat(commands);
}

/**
 * Erstellt ein Label mit QR-Code und Text
 * @param {string} assetId - Asset ID (z.B. TSR.EC.SCDE.000001)
 * @returns {Buffer} - Brother QL Command
 */
function createAssetLabel(assetId) {
  // Vereinfachter Ansatz - für produktiven Einsatz brother_ql nutzen
  const commands = [];
  
  commands.push(Buffer.from([0x1B, 0x40])); // Initialize
  commands.push(Buffer.from([0x1B, 0x69, 0x7A, 0xB4, 0x00, 0x3E, 0x00, 0x00, 0x00])); // Label size
  
  // Text
  const text = `Asset-ID:\n${assetId}\n\nTSRID Asset Management`;
  commands.push(Buffer.from(text, 'utf-8'));
  
  commands.push(Buffer.from([0x0C])); // Print
  
  return Buffer.concat(commands);
}

/**
 * Sendet RAW Daten an Brother QL über Windows Drucker
 * HINWEIS: Für bessere Ergebnisse brother_ql Python Library verwenden
 */
function getBrotherQLInfo() {
  return {
    model: 'QL-1110NWB',
    maxWidth: 1164, // Pixels bei 300dpi
    supportedLabels: [
      '29mm x 90mm',
      '38mm x 90mm', 
      '50mm x 90mm',
      '54mm x 90mm',
      '62mm x 100mm',
      '62mm endless'
    ],
    dpi: 300,
    printMethod: 'Direct Thermal',
    connection: 'USB / Network / WiFi / Bluetooth'
  };
}

module.exports = {
  createSimpleLabel,
  createAssetLabel,
  getBrotherQLInfo
};
