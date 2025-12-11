/**
 * Test-Script für Drucker-Erkennung
 * Führen Sie aus: node test-printer-detection.js
 */

const printerWindows = require('./printer-windows');

console.log('==============================================');
console.log('  TSRID Drucker-Erkennungs-Test');
console.log('==============================================\n');

async function test() {
  console.log('Starte Drucker-Erkennung...\n');
  
  try {
    const printers = await printerWindows.getWindowsPrinters();
    
    console.log('\n==============================================');
    console.log(`  ERGEBNIS: ${printers.length} Drucker gefunden`);
    console.log('==============================================\n');
    
    if (printers.length === 0) {
      console.log('⚠️  KEINE DRUCKER GEFUNDEN!');
      console.log('\nMögliche Ursachen:');
      console.log('1. Keine Drucker installiert');
      console.log('2. Berechtigungsproblem');
      console.log('3. Windows-Version nicht unterstützt');
      console.log('\nVersuchen Sie manuell:');
      console.log('  wmic printer list brief');
    } else {
      printers.forEach((printer, i) => {
        console.log(`${i + 1}. ${printer.name}`);
        console.log(`   Treiber: ${printer.driver}`);
        console.log(`   Status: ${printer.status}`);
        console.log(`   Standard: ${printer.isDefault ? 'Ja' : 'Nein'}`);
        console.log('');
      });
      
      // Finde Brother QL
      const brotherQL = printers.find(p => p.name.includes('Brother QL'));
      if (brotherQL) {
        console.log('✓ Brother QL-1110NWB gefunden!');
        console.log(`  Name: ${brotherQL.name}`);
      } else {
        console.log('⚠️  Brother QL-1110NWB NICHT gefunden!');
        console.log('   Bitte prüfen Sie den exakten Namen in der Liste oben.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack:', error.stack);
  }
  
  console.log('\n==============================================');
  console.log('  Test abgeschlossen');
  console.log('==============================================\n');
}

test();
