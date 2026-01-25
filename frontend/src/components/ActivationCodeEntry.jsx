import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Keyboard, Check, AlertTriangle, Loader2, Building2, MapPin, Monitor, Key, User, Phone, Mail, Calendar, Shield } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * ActivationCodeEntry - QR-Code Scanner und manuelle Code-Eingabe
 * Ermöglicht die Aktivierung von Geräten über Aktivierungscodes
 */
const ActivationCodeEntry = ({ onActivationComplete }) => {
  const [mode, setMode] = useState('choose'); // 'choose', 'qr', 'manual'
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Cleanup QR Scanner beim Unmounten
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.clear().catch(console.error);
      }
    };
  }, []);

  // QR-Code Scanner initialisieren
  const startQrScanner = () => {
    setMode('qr');
    setError('');
    
    setTimeout(() => {
      if (scannerRef.current && !html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          false
        );
        
        html5QrCodeRef.current.render(
          (decodedText) => {
            // QR-Code erfolgreich gescannt
            console.log('QR Code gescannt:', decodedText);
            
            // Extrahiere Code aus URL oder verwende direkten Text
            let extractedCode = decodedText;
            if (decodedText.includes('code=')) {
              const url = new URL(decodedText);
              extractedCode = url.searchParams.get('code') || decodedText;
            }
            
            setCode(extractedCode);
            html5QrCodeRef.current.clear().catch(console.error);
            html5QrCodeRef.current = null;
            validateCode(extractedCode);
          },
          (error) => {
            // Ignoriere Scan-Fehler (normal wenn kein QR-Code im Bild)
          }
        );
      }
    }, 100);
  };

  // Manuelle Eingabe starten
  const startManualEntry = () => {
    setMode('manual');
    setError('');
    setValidationResult(null);
  };

  // Aktivierungscode validieren
  const validateCode = async (codeToValidate) => {
    const trimmedCode = (codeToValidate || code).trim().toUpperCase();
    if (!trimmedCode) {
      setError('Bitte geben Sie einen Aktivierungscode ein');
      return;
    }

    setValidating(true);
    setError('');
    setValidationResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/activation/validate/${trimmedCode}`);
      const data = await response.json();

      if (data.success && data.valid) {
        if (data.already_activated) {
          setError(`Dieser Code wurde bereits am ${new Date(data.activated_at).toLocaleDateString('de-DE')} aktiviert`);
        } else {
          setValidationResult(data.activation_data);
          toast.success('Code gültig! Überprüfen Sie die Daten und klicken Sie auf Aktivieren.');
        }
      } else {
        setError(data.message || 'Ungültiger Aktivierungscode');
      }
    } catch (e) {
      console.error('Validierungsfehler:', e);
      setError('Fehler bei der Validierung. Bitte versuchen Sie es erneut.');
    } finally {
      setValidating(false);
    }
  };

  // Gerät aktivieren
  const activateDevice = async () => {
    if (!validationResult) return;

    setActivating(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/activation/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validationResult.code })
      });
      const data = await response.json();

      if (data.success) {
        // Speichere Konfiguration in localStorage
        localStorage.setItem('deviceConfig', JSON.stringify(data.device_config));
        
        toast.success(`Gerät ${data.device_config.device_id} erfolgreich aktiviert!`);
        
        if (onActivationComplete) {
          onActivationComplete(data.device_config);
        }
      } else {
        setError(data.message || 'Aktivierung fehlgeschlagen');
      }
    } catch (e) {
      console.error('Aktivierungsfehler:', e);
      setError('Fehler bei der Aktivierung. Bitte versuchen Sie es erneut.');
    } finally {
      setActivating(false);
    }
  };

  // Zurücksetzen
  const resetForm = () => {
    setMode('choose');
    setCode('');
    setValidationResult(null);
    setError('');
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.clear().catch(console.error);
      html5QrCodeRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Titel */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-full">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Geräteaktivierung</h3>
            <p className="text-sm text-muted-foreground">
              Scannen Sie den QR-Code oder geben Sie den Aktivierungscode manuell ein
            </p>
          </div>
        </div>
      </Card>

      {/* Modus-Auswahl */}
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary"
            onClick={startQrScanner}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">QR-Code scannen</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Kamera verwenden um den QR-Code zu scannen
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary"
            onClick={startManualEntry}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Keyboard className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Code eingeben</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Aktivierungscode manuell eingeben
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* QR-Code Scanner */}
      {mode === 'qr' && !validationResult && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                QR-Code scannen
              </h4>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
            
            <div id="qr-reader" ref={scannerRef} className="w-full" />
            
            <p className="text-sm text-muted-foreground text-center">
              Halten Sie den QR-Code vor die Kamera
            </p>
          </div>
        </Card>
      )}

      {/* Manuelle Eingabe */}
      {mode === 'manual' && !validationResult && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                Aktivierungscode eingeben
              </h4>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z.B. EC-ABCD-1234"
                className="font-mono text-lg tracking-wider"
                onKeyDown={(e) => e.key === 'Enter' && validateCode()}
              />
              <Button 
                onClick={() => validateCode()} 
                disabled={validating || !code.trim()}
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Prüfen'
                )}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Der Aktivierungscode steht auf dem Aufkleber oder wurde Ihnen per E-Mail zugeschickt.
            </p>
          </div>
        </Card>
      )}

      {/* Fehler-Anzeige */}
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </Card>
      )}

      {/* Validierungsergebnis - Gerätedaten */}
      {validationResult && (
        <div className="space-y-4">
          {/* Erfolgs-Header */}
          <Card className="p-4 bg-green-500/10 border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-full">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-green-600">Code gültig!</p>
                <p className="text-sm text-muted-foreground">
                  Überprüfen Sie die Daten und klicken Sie auf "Aktivieren"
                </p>
              </div>
            </div>
          </Card>

          {/* Daten-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tenant Info */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Kunde / Tenant</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium text-foreground">{validationResult.tenant?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-foreground">{validationResult.tenant?.id || '-'}</span>
                </div>
              </div>
            </Card>

            {/* Gerät Info */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Gerät</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device-ID:</span>
                  <span className="font-mono font-bold text-primary">{validationResult.device?.device_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial-PC:</span>
                  <span className="font-mono text-foreground">{validationResult.device?.sn_pc || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial-SC:</span>
                  <span className="font-mono text-foreground">{validationResult.device?.sn_sc || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TV-ID:</span>
                  <span className="font-mono text-foreground">{validationResult.device?.teamviewer_id || '-'}</span>
                </div>
              </div>
            </Card>

            {/* Standort Info */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Standort</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code:</span>
                  <span className="font-mono font-bold text-primary">{validationResult.location?.code || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="text-foreground">{validationResult.location?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse:</span>
                  <span className="text-foreground text-right">
                    {validationResult.location?.street || '-'}<br/>
                    {validationResult.location?.postal_code} {validationResult.location?.city}
                  </span>
                </div>
              </div>
            </Card>

            {/* Kontakt & Lizenz */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Kontakt & Lizenz</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Manager:
                  </span>
                  <span className="text-foreground">{validationResult.location?.manager || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefon:
                  </span>
                  <span className="text-foreground">{validationResult.location?.phone || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> E-Mail:
                  </span>
                  <span className="text-foreground text-xs break-all">{validationResult.location?.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Lizenz:
                  </span>
                  <span className={`font-medium ${validationResult.license?.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                    {validationResult.license?.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                    {validationResult.license?.valid_until && ` bis ${validationResult.license.valid_until}`}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Aktivieren Button */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Abbrechen
            </Button>
            <Button 
              onClick={activateDevice} 
              disabled={activating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aktiviere...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Gerät aktivieren
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivationCodeEntry;
