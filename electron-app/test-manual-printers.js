/**
 * Test ob printers-manual.json geladen werden kann
 */

const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('  Test: Manuelle Drucker-Liste laden');
console.log('==============================================\n');

const configPath = path.join(__dirname, 'printers-manual.json');

console.log('1. Suche nach Datei:', configPath);

if (fs.existsSync(configPath)) {
  console.log('   ✓ Datei gefunden!\n');
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    console.log('2. Datei-Inhalt gelesen:', content.length, 'bytes\n');
    
    const config = JSON.parse(content);
    console.log('3. JSON geparst\n');
    
    console.log('4. Drucker in der Liste:', config.printers.length, '\n');
    
    config.printers.forEach((printer, i) => {
      console.log(`   ${i + 1}. ${printer.name}`);
    });
    
    console.log('\n✅ SUCCESS: printers-manual.json funktioniert!');
    console.log('\nDie App sollte diese Drucker anzeigen.\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER beim Parsen der JSON:', error.message);
    console.error('\nBitte prüfen Sie die JSON-Syntax!\n');
  }
  
} else {
  console.log('   ❌ Datei NICHT gefunden!\n');
  console.log('Lösungen:');
  console.log('1. Laden Sie printers-manual.json herunter');
  console.log('2. Speichern Sie es in:', __dirname);
  console.log('3. Prüfen Sie den Dateinamen (exakt: printers-manual.json)\n');
  
  console.log('Alternative: Erstelle Beispiel-Datei...\n');
  
  const example = {
    "printers": [
      {
        "name": "Brother QL-1110NWB",
        "driver": "Brother QL-1110NWB",
        "status": "OK",
        "isDefault": false
      }
    ]
  };
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(example, null, 2));
    console.log('✓ printers-manual.json erstellt!');
    console.log('\nBitte bearbeiten Sie die Datei mit Ihren Drucker-Namen:\n');
    console.log('  ', configPath);
    console.log('\nFühren Sie dann dieses Script erneut aus.\n');
  } catch (err) {
    console.error('Fehler beim Erstellen:', err.message);
  }
}

console.log('==============================================\n');
