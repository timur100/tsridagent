import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { Lock, Save, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ScannerPinSettings = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    pin: '1234'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/scanner-pin/settings`);
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate PIN
    if (settings.pin.length !== 4 || !/^\d{4}$/.test(settings.pin)) {
      toast.error('PIN muss aus genau 4 Ziffern bestehen');
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${BACKEND_URL}/api/scanner-pin/settings`, settings);
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scanner PIN-Schutz</h2>
        <p className="text-muted-foreground">
          Schützen Sie die Scanner-Oberfläche mit einer PIN
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>PIN-Einstellungen</CardTitle>
          </div>
          <CardDescription>
            Wenn aktiviert, müssen Benutzer eine PIN eingeben, um die Scanner-Oberfläche zu nutzen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pin-enabled" className="text-base">
                PIN-Schutz aktivieren
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.enabled 
                  ? 'PIN-Eingabe ist erforderlich beim Start der Scanner-App'
                  : 'Scanner-App ist ohne PIN zugänglich'
                }
              </p>
            </div>
            <Switch
              id="pin-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
            />
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <Label htmlFor="pin">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                PIN (4 Ziffern)
              </div>
            </Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              value={settings.pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Only digits
                setSettings({...settings, pin: value});
              }}
              placeholder="1234"
              className="max-w-xs font-mono text-lg tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Die PIN muss aus genau 4 Ziffern bestehen
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Hinweise zum PIN-Schutz:
                </p>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Die PIN wird beim Start der Scanner-Oberfläche abgefragt</li>
                  <li>• Benutzer-PIN: 3842 (Standard-Zugang)</li>
                  <li>• Admin-PIN: 9988 (Vollzugriff auf Systeminfos)</li>
                  <li>• Ändern Sie die PIN regelmäßig für mehr Sicherheit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Speichern...' : 'Einstellungen speichern'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={fetchSettings}
              disabled={saving}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {settings.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Vorschau</CardTitle>
            <CardDescription>
              So sieht die PIN-Eingabe für Benutzer aus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center space-y-4">
              <Lock className="w-12 h-12 text-gray-400" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">PIN eingeben</h3>
                <p className="text-sm text-muted-foreground">
                  Bitte geben Sie die 4-stellige PIN ein
                </p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-2xl font-mono"
                  >
                    •
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScannerPinSettings;
