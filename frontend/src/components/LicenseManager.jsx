import React, { useState, useEffect } from 'react';
import { Key, Package, Check, X, Calendar, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';
import PackageConfigurator from './PackageConfigurator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const LicenseManager = ({ deviceId }) => {
  const [currentLicense, setCurrentLicense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [showActivation, setShowActivation] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    loadCurrentLicense();
    loadAvailableFeatures();
    loadPackages();
  }, [deviceId]);

  const loadCurrentLicense = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/license/current/${deviceId}`);
      const data = await response.json();
      
      if (data.success && data.licensed) {
        setCurrentLicense(data);
      }
    } catch (error) {
      console.error('Error loading license:', error);
    }
  };

  const loadAvailableFeatures = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/license/features`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableFeatures(data.features);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/license/packages`);
      const data = await response.json();
      
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Bitte Lizenzschlüssel eingeben');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          license_key: licenseKey,
          device_id: deviceId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Lizenz erfolgreich aktiviert!');
        setLicenseKey('');
        setShowActivation(false);
        loadCurrentLicense();
      } else {
        toast.error(data.message || 'Fehler bei der Aktivierung');
      }
    } catch (error) {
      toast.error('Fehler bei der Aktivierung');
      console.error('Activation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isFeatureActive = (featureId) => {
    if (!currentLicense || !currentLicense.licensed) return false;
    return currentLicense.license?.features?.includes(featureId) || false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!currentLicense?.licensed && (
          <Button onClick={() => setShowActivation(!showActivation)}>
            <Key className="mr-2 h-4 w-4" />
            Lizenz aktivieren
          </Button>
        )}
      </div>

      {/* License Activation */}
      {showActivation && (
        <Card className="p-6 border-primary/50">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" />
            Lizenz aktivieren
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Lizenzschlüssel
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="TSRID-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: TSRID-XXXX-XXXX-XXXX-XXXX
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleActivateLicense}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Aktiviere...' : 'Aktivieren'}
              </Button>
              <Button
                onClick={() => setShowActivation(false)}
                variant="outline"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Current License Info */}
      {currentLicense?.licensed ? (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Aktive Lizenz</h3>
              <Badge variant="default" className="bg-green-600">Aktiv</Badge>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Lizenzschlüssel</p>
                <p className="text-sm font-mono font-semibold">{currentLicense.license.license_key}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geräte-ID</p>
                <p className="text-sm font-mono font-semibold">{currentLicense.license.device_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Aktiviert am</p>
                <p className="text-sm font-semibold">{formatDate(currentLicense.license.activated_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gültig bis</p>
                <p className="text-sm font-semibold">{formatDate(currentLicense.license.expires_at)}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Verbleibende Tage</p>
              <p className="text-2xl font-bold text-primary">{currentLicense.expires_in_days}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Keine aktive Lizenz</h3>
              <p className="text-sm text-muted-foreground">
                Bitte aktivieren Sie eine Lizenz, um alle Funktionen nutzen zu können.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Licensed Features */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="h-5 w-5" />
          Verfügbare Funktionen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableFeatures.map((feature) => {
            const isActive = isFeatureActive(feature.id);
            return (
              <div
                key={feature.id}
                className={`p-3 rounded-lg border ${
                  isActive
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Package Configurator - Admin Only */}
      <Card className="p-6 bg-muted/30">
        <PackageConfigurator 
          availableFeatures={availableFeatures}
          onPackageCreated={loadPackages}
        />
      </Card>
    </div>
  );
};

export default LicenseManager;
