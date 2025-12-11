import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Printer, Usb, CheckCircle, XCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const USBDeviceManager = () => {
  const { theme } = useTheme();
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [usbDevices, setUsbDevices] = useState([]);
  const [serialPorts, setSerialPorts] = useState([]);
  const [hidDevices, setHidDevices] = useState([]);
  const [windowsPrinters, setWindowsPrinters] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [selectedWindowsPrinter, setSelectedWindowsPrinter] = useState('');
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState('');

  useEffect(() => {
    checkDesktopApp();
  }, []);

  const checkDesktopApp = async () => {
    if (window.isDesktopApp) {
      setIsDesktopApp(true);
      setAppVersion(window.desktopVersion || 'unknown');
      loadAllDevices();
    } else {
      setIsDesktopApp(false);
    }
  };

  const loadAllDevices = async () => {
    setLoading(true);
    try {
      // Load USB Devices
      if (window.usbAPI) {
        const devices = await window.usbAPI.getDevices();
        setUsbDevices(devices || []);
      }

      // Load Serial Ports
      if (window.usbAPI) {
        const ports = await window.usbAPI.getSerialPorts();
        setSerialPorts(ports || []);
        if (ports.length > 0 && !selectedPort) {
          setSelectedPort(ports[0].path);
        }
      }

      // Load HID Devices
      if (window.usbAPI) {
        const hid = await window.usbAPI.getHIDDevices();
        setHidDevices(hid || []);
      }

      // Load Windows Printers (NEW!)
      if (window.printerAPI && window.printerAPI.getSystemPrinters) {
        const printers = await window.printerAPI.getSystemPrinters();
        setWindowsPrinters(printers || []);
        if (printers.length > 0 && !selectedWindowsPrinter) {
          setSelectedWindowsPrinter(printers[0].name);
        }
      }

      toast.success('Geräte geladen');
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Fehler beim Laden der Geräte');
    } finally {
      setLoading(false);
    }
  };

  const testPrinterConnection = async () => {
    if (!selectedPort) {
      toast.error('Bitte Drucker auswählen');
      return;
    }

    try {
      const result = await window.printerAPI.test(selectedPort);
      if (result.success) {
        toast.success('Drucker verbunden!');
      } else {
        toast.error('Drucker nicht erreichbar');
      }
    } catch (error) {
      toast.error('Fehler beim Testen: ' + error.message);
    }
  };

  const printTestLabel = async () => {
    if (!selectedPort) {
      toast.error('Bitte Drucker auswählen');
      return;
    }

    try {
      // Test ZPL Label für Zebra Drucker
      const zpl = `
^XA
^FO50,30^A0N,40,40^FDTSRID Test Label^FS
^FO50,90^A0N,60,60^FDTSR.EC.TEST.000001^FS
^FO50,180^BQN,2,8^FDQA,TSR.EC.TEST.000001^FS
^FO50,400^A0N,30,30^FDTest erfolgreich!^FS
^XZ
      `;

      toast.loading('Drucke Test-Label...', { id: 'print-test' });
      const result = await window.printerAPI.printZPL(selectedPort, zpl);

      if (result.success) {
        toast.success('Test-Label gedruckt!', { id: 'print-test' });
      } else {
        toast.error('Druckfehler: ' + result.error, { id: 'print-test' });
      }
    } catch (error) {
      toast.error('Fehler: ' + error.message, { id: 'print-test' });
    }
  };

  const printCustomText = async () => {
    if (!selectedPort) {
      toast.error('Bitte Drucker auswählen');
      return;
    }

    if (!testData) {
      toast.error('Bitte Text eingeben');
      return;
    }

    try {
      const result = await window.printerAPI.print(selectedPort, testData + '\n');
      
      if (result.success) {
        toast.success('Text gesendet!');
      } else {
        toast.error('Fehler: ' + result.error);
      }
    } catch (error) {
      toast.error('Fehler: ' + error.message);
    }
  };

  if (!isDesktopApp) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <XCircle className="h-12 w-12 text-yellow-500" />
          <div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              USB-Funktionen nicht verfügbar
            </h3>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Diese Funktionen sind nur in der TSRID Desktop App verfügbar.
            </p>
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Starten Sie die Electron Desktop App um USB-Geräte zu nutzen.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                USB Device Manager
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Desktop App Version: {appVersion}
              </p>
            </div>
          </div>
          <Button
            onClick={loadAllDevices}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </Card>

      {/* Windows Printers (NEW!) */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Printer className="h-6 w-6 text-green-500" />
          <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Windows-Drucker ({windowsPrinters.length})
          </h4>
        </div>

        {windowsPrinters.length === 0 ? (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Windows-Drucker gefunden.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Printer Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Drucker auswählen:
              </label>
              <select
                value={selectedWindowsPrinter}
                onChange={(e) => setSelectedWindowsPrinter(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {windowsPrinters.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.isDefault ? '(Standard)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Print Button */}
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  if (!selectedWindowsPrinter) {
                    toast.error('Bitte Drucker auswählen');
                    return;
                  }
                  
                  try {
                    toast.loading('Drucke Test-Label...', { id: 'win-print' });
                    
                    // Einfacher Test-Text
                    const testLabel = [
                      '',
                      '================================',
                      '    TSRID USB DEVICE MANAGER    ',
                      '================================',
                      '',
                      'Test-Druck erfolgreich!',
                      '',
                      'Drucker: ' + selectedWindowsPrinter,
                      'Zeit: ' + new Date().toLocaleString('de-DE'),
                      '',
                      'Brother QL-1110NWB',
                      'Asset Management System',
                      '',
                      '================================',
                      ''
                    ].join('\n');
                    
                    console.log('[USB-MGR] Sending print job to:', selectedWindowsPrinter);
                    console.log('[USB-MGR] Data length:', testLabel.length);
                    
                    const result = await window.printerAPI.printToWindows(
                      selectedWindowsPrinter,
                      testLabel,
                      'TEXT'
                    );
                    
                    console.log('[USB-MGR] Print result:', result);
                    
                    if (result.success) {
                      toast.success('Test-Druck gesendet! Job-ID: ' + result.jobId, { id: 'win-print' });
                    } else {
                      toast.error('Druckfehler: ' + (result.error || 'Unbekannter Fehler'), { id: 'win-print' });
                    }
                  } catch (error) {
                    console.error('[USB-MGR] Print error:', error);
                    toast.error('Fehler: ' + error.message, { id: 'win-print' });
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Test-Druck über Windows
              </Button>
            </div>

            {/* Printer List */}
            <div>
              <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Verfügbare Windows-Drucker:
              </h5>
              <div className="space-y-2">
                {windowsPrinters.map(p => (
                  <div
                    key={p.name}
                    className={`p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {p.name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {p.driver || 'Unknown Driver'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.isDefault && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-600">
                            Standard
                          </span>
                        )}
                        {p.name === selectedWindowsPrinter && (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-600">
                            Ausgewählt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Serial Ports / Printers */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Printer className="h-6 w-6 text-[#c00000]" />
          <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            USB Serial Ports ({serialPorts.length})
          </h4>
        </div>

        {serialPorts.length === 0 ? (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Serial Ports gefunden. Bitte USB-Drucker anschließen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Port Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Drucker auswählen:
              </label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {serialPorts.map(port => (
                  <option key={port.path} value={port.path}>
                    {port.path} - {port.manufacturer || 'Unknown'} 
                    {port.serialNumber && ` (SN: ${port.serialNumber})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={testPrinterConnection}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Verbindung testen
              </Button>
              <Button
                onClick={printTestLabel}
                className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Test-Label drucken (ZPL)
              </Button>
            </div>

            {/* Custom Text Print */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Test-Druck (Raw Text):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testData}
                  onChange={(e) => setTestData(e.target.value)}
                  placeholder="Text zum Drucken..."
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1f1f1f] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <Button onClick={printCustomText}>
                  Senden
                </Button>
              </div>
            </div>

            {/* Port List */}
            <div>
              <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Verfügbare Ports:
              </h5>
              <div className="space-y-2">
                {serialPorts.map(port => (
                  <div
                    key={port.path}
                    className={`p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {port.path}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {port.manufacturer || 'Unknown'} 
                          {port.vendorId && ` | VID: ${port.vendorId}`}
                          {port.productId && ` | PID: ${port.productId}`}
                        </p>
                      </div>
                      {port.path === selectedPort && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-600">
                          Ausgewählt
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* USB Devices */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Usb className="h-6 w-6 text-blue-500" />
          <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            USB Geräte ({usbDevices.length})
          </h4>
        </div>

        {usbDevices.length === 0 ? (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine USB-Geräte gefunden.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {usbDevices.map((device, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}
              >
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Vendor ID: 0x{device.vendorId?.toString(16).padStart(4, '0')} | 
                  Product ID: 0x{device.productId?.toString(16).padStart(4, '0')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* HID Devices */}
      {hidDevices.length > 0 && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Usb className="h-6 w-6 text-purple-500" />
            <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              HID Geräte ({hidDevices.length})
            </h4>
          </div>

          <div className="space-y-2">
            {hidDevices.slice(0, 10).map((device, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}
              >
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {device.product || 'Unknown Device'}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {device.manufacturer || 'Unknown'} | VID: 0x{device.vendorId?.toString(16)} | PID: 0x{device.productId?.toString(16)}
                </p>
              </div>
            ))}
            {hidDevices.length > 10 && (
              <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                ... und {hidDevices.length - 10} weitere
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default USBDeviceManager;
