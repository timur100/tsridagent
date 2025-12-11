# 🖨️ Brother QL-1110NWBC Troubleshooting

## 🎯 Problem: Drucker wird nicht erkannt

Der Brother QL-1110NWBC wird im USB Device Manager nicht angezeigt.

---

## 📋 Schnell-Checks

### 1. Verbindungsart prüfen

Der QL-1110**NWB**C unterstützt:
- ✅ USB
- ✅ Netzwerk (LAN)
- ✅ WiFi
- ✅ Bluetooth

**Aktuelle Electron-App unterstützt nur USB!**

---

## 🔌 USB-Verbindung Troubleshooting

### Schritt 1: Kabel & Anschluss prüfen

```
✓ USB-Kabel am Drucker angeschlossen?
✓ USB-Kabel am PC angeschlossen? (USB-A Port, nicht USB-C)
✓ Drucker eingeschaltet?
✓ Anderes USB-Kabel testen?
✓ Anderen USB-Port am PC testen?
```

### Schritt 2: Windows Geräte-Manager prüfen

**Windows:**
1. Windows-Taste drücken
2. "Geräte-Manager" eingeben
3. Öffnen
4. Suchen nach:
   - **"Drucker"** oder
   - **"USB-Geräte"** oder
   - **"Anschlüsse (COM & LPT)"**

**Was Sie sehen sollten:**
```
Anschlüsse (COM & LPT)
├── COM1
├── COM3
└── USB Serial Port (COM4)  ← Brother Drucker sollte hier sein
```

**Oder:**
```
Drucker
└── Brother QL-1110NWBC
```

**Wenn nicht sichtbar:**
- ❌ Drucker wird vom Windows nicht erkannt
- → Treiber installieren (siehe unten)

### Schritt 3: Brother Treiber installieren

**Download:**
https://support.brother.com/g/b/downloadlist.aspx?c=de&lang=de&prod=lpql1110nwbeuk&os=10068

**Was installieren:**
1. **Printer Driver** - Grundlegender Druckertreiber
2. **P-touch Editor** - Software für Label-Design
3. **Printers Setting Tool** - Drucker-Konfiguration

**Nach Installation:**
- Drucker neu starten
- PC neu starten
- Geräte-Manager erneut prüfen

### Schritt 4: Brother in Editor Mode versetzen

Der QL-1110NWBC hat verschiedene Modi:

**Editor Mode (für PC-Steuerung):**
1. Drucker einschalten
2. "Editor" Button drücken (falls vorhanden)
3. LED sollte dauerhaft leuchten

**Raster Mode (für Standalone):**
- LED blinkt
- Für unsere Zwecke **NICHT** geeignet

### Schritt 5: Test mit Brother Software

**P-touch Editor testen:**
1. P-touch Editor öffnen (nach Treiber-Installation)
2. Neues Label erstellen
3. "Drucken" klicken
4. Drucker auswählen

**Wenn das funktioniert:**
→ Drucker ist OK, Problem liegt in der Electron-App

**Wenn das NICHT funktioniert:**
→ Treiber-/Verbindungsproblem

---

## 📡 Netzwerk-Verbindung (Alternative)

Falls der Drucker per **LAN/WiFi** verbunden ist, funktioniert die aktuelle USB-Implementierung **nicht**.

### Netzwerk-Drucker erkennen

**Brother IP-Adresse finden:**
1. Drucker: "i" Button lange drücken (Status-Blatt drucken)
2. IP-Adresse notieren (z.B. 192.168.1.100)

**Oder:**
```bash
# Windows CMD
arp -a | findstr /i "brother"

# Oder Brother Tool nutzen
# Brother iPrint&Scan App installieren
```

### Netzwerk-Druck implementieren (würde Code-Änderung erfordern)

Die aktuelle App nutzt nur **Serial Port** (USB).
Für Netzwerk-Druck brauchen wir **TCP Socket** Verbindung.

---

## 🐛 Electron-App Debug

### Debug-Modus aktivieren

**Datei:** `/app/electron-app/main.js`

Nach Zeile 76 einfügen:
```javascript
// Debug: Alle USB-Geräte ausgeben
ipcMain.handle('usb:getDevices', async () => {
  try {
    const devices = usb.getDeviceList();
    console.log('=== USB DEVICES DEBUG ===');
    console.log('Anzahl gefunden:', devices.length);
    devices.forEach((device, i) => {
      console.log(`\nDevice ${i + 1}:`);
      console.log('  Vendor ID:', '0x' + device.deviceDescriptor.idVendor.toString(16));
      console.log('  Product ID:', '0x' + device.deviceDescriptor.idProduct.toString(16));
      console.log('  Manufacturer:', device.deviceDescriptor.iManufacturer);
      console.log('  Product:', device.deviceDescriptor.iProduct);
    });
    console.log('========================');
    
    return devices.map(device => ({
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct,
      manufacturer: device.deviceDescriptor.iManufacturer,
      product: device.deviceDescriptor.iProduct
    }));
  } catch (error) {
    console.error('[USB] Error:', error);
    return [];
  }
});
```

**App neu starten und Console prüfen:**
```bash
yarn start
# F12 drücken → Console Tab
# "Aktualisieren" klicken im USB Device Manager
# Ausgabe prüfen
```

### Serial Ports Debug

Nach Zeile 79 einfügen:
```javascript
// Debug: Alle Serial Ports ausgeben
ipcMain.handle('usb:getSerialPorts', async () => {
  try {
    const ports = await SerialPort.list();
    console.log('=== SERIAL PORTS DEBUG ===');
    console.log('Anzahl gefunden:', ports.length);
    ports.forEach((port, i) => {
      console.log(`\nPort ${i + 1}:`);
      console.log('  Path:', port.path);
      console.log('  Manufacturer:', port.manufacturer || 'Unknown');
      console.log('  Serial Number:', port.serialNumber || 'None');
      console.log('  Product ID:', port.productId || 'None');
      console.log('  Vendor ID:', port.vendorId || 'None');
    });
    console.log('==========================');
    return ports;
  } catch (error) {
    console.error('[USB] Error:', error);
    return [];
  }
});
```

---

## 🔍 Brother QL-1110NWBC Spezifikationen

**Vendor ID:** 0x04f9 (Brother Industries)
**Product ID:** 0x20af (QL-1110NWBC)

Falls der Drucker USB-verbunden ist, sollte er als:
```
Vendor ID: 0x04f9
Product ID: 0x20af
```
erscheinen.

---

## ✅ Lösungen

### Lösung 1: USB-Direktverbindung

1. ✅ USB-Kabel direkt verbinden (USB-A Kabel)
2. ✅ Brother Treiber installieren
3. ✅ Editor Mode aktivieren
4. ✅ Geräte-Manager prüfen
5. ✅ Electron-App neu starten
6. ✅ "Aktualisieren" klicken

### Lösung 2: Über Windows Drucker-Queue

Falls USB nicht erkannt wird, aber Windows-Drucker funktioniert:

**Alternative Implementierung notwendig:**
- Nutzt Windows Print Spooler
- Über `printer` npm Package
- Nicht mehr "direkt" USB, aber funktioniert

### Lösung 3: Netzwerk-Druck

Falls Drucker per Netzwerk verbunden:

**Neue Implementierung notwendig:**
- TCP Socket zu Drucker-IP
- ZPL/EPL direkt über Port 9100 senden
- Erfordert Code-Änderung in `main.js`

---

## 📝 Was jetzt tun?

**Bitte prüfen Sie:**

1. **Verbindungsart:**
   - USB-Kabel angeschlossen? Welcher Port?
   - Oder über Netzwerk verbunden?

2. **Windows Geräte-Manager:**
   - Sehen Sie den Brother Drucker dort?
   - Unter welcher Kategorie?
   - COM Port Nummer?

3. **Brother Software:**
   - Ist der Treiber installiert?
   - Funktioniert Druck über P-touch Editor?

4. **Electron-App Console:**
   - F12 drücken in der App
   - Was steht im Console Tab beim "Aktualisieren"?

**Mit diesen Infos kann ich die App spezifisch für Ihren Drucker anpassen!**

---

## 🚀 Quick Fix: Drucker über Netzwerk (falls nicht USB)

Falls der Drucker per **Netzwerk** verbunden ist und Sie schnell drucken möchten:

**Temporäre Lösung ohne Electron:**
```python
# Python Script: brother_print.py
import socket

def print_label(ip, text):
    # Brother QL-1110NWBC erwartet ESC/P Befehle oder Raster-Daten
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((ip, 9100))
    
    # Einfacher Text (ESC/P)
    command = f"\x1b\x69\x61\x01{text}\x0c"  # Simplified
    sock.send(command.encode())
    sock.close()

# Nutzung
print_label("192.168.1.100", "Test Label")
```

**Für produktiven Einsatz:** Ich kann die Electron-App für Netzwerk-Druck erweitern.

---

## 📞 Nächste Schritte

**Bitte senden Sie mir:**
1. Screenshot vom Windows Geräte-Manager
2. Verbindungsart (USB oder Netzwerk?)
3. Electron-App Console Ausgabe (F12)

Dann kann ich die App präzise anpassen! 🔧
