import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PackageConfigurator = ({ availableFeatures, onPackageCreated }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    features: [],
    duration_days: 365,
    price: 0
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/license/packages`);
      const data = await response.json();
      
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      features: [],
      duration_days: 365,
      price: 0
    });
    setEditingPackage(null);
    setShowForm(false);
  };

  const handleFeatureToggle = (featureId) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(id => id !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleSelectAll = () => {
    if (formData.features.length === availableFeatures.length) {
      setFormData(prev => ({ ...prev, features: [] }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        features: availableFeatures.map(f => f.id) 
      }));
    }
  };

  const handleSavePackage = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte Paketnamen eingeben');
      return;
    }

    if (formData.features.length === 0) {
      toast.error('Bitte mindestens eine Funktion auswählen');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (editingPackage) {
        // Update existing package
        response = await fetch(`${BACKEND_URL}/api/license/packages/${editingPackage.package_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new package
        response = await fetch(`${BACKEND_URL}/api/license/packages/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingPackage ? 'Paket aktualisiert' : 'Paket erstellt');
        resetForm();
        loadPackages();
        if (onPackageCreated) onPackageCreated();
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPackage = (pkg) => {
    setFormData({
      name: pkg.name,
      description: pkg.description,
      features: pkg.features,
      duration_days: pkg.duration_days,
      price: pkg.price || 0
    });
    setEditingPackage(pkg);
    setShowForm(true);
  };

  const handleDeletePackage = async (packageId) => {
    if (!window.confirm('Paket wirklich löschen?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/license/packages/${packageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Paket gelöscht');
        loadPackages();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
      console.error('Delete error:', error);
    }
  };

  const getDurationLabel = (days) => {
    if (days === 30) return '1 Monat';
    if (days === 90) return '3 Monate';
    if (days === 180) return '6 Monate';
    if (days === 365) return '1 Jahr';
    if (days === 0) return 'Lebenslang';
    return `${days} Tage`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Package className="h-6 w-6" />
          Paket-Konfigurator
        </h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Paket
          </Button>
        )}
      </div>

      {/* Package Form */}
      {showForm && (
        <Card className="p-6 border-primary/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">
              {editingPackage ? 'Paket bearbeiten' : 'Neues Paket erstellen'}
            </h4>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Package Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Paketname *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Standard, Premium, Enterprise"
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Beschreibung
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Kurze Beschreibung des Pakets"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Gültigkeitsdauer
                </label>
                <select
                  value={formData.duration_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value={30}>1 Monat</option>
                  <option value={90}>3 Monate</option>
                  <option value={180}>6 Monate</option>
                  <option value={365}>1 Jahr</option>
                  <option value={0}>Lebenslang</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Preis (€)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
            </div>

            {/* Features Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground">
                  Funktionen auswählen * ({formData.features.length} von {availableFeatures.length})
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {formData.features.length === availableFeatures.length ? 'Alle abwählen' : 'Alle auswählen'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto p-4 border border-border rounded-lg bg-muted/20">
                {availableFeatures.map((feature) => (
                  <label
                    key={feature.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.features.includes(feature.id)}
                      onChange={() => handleFeatureToggle(feature.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSavePackage}
                disabled={loading}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Speichere...' : 'Speichern'}
              </Button>
              <Button
                onClick={resetForm}
                variant="outline"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Packages */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Vorhandene Pakete ({packages.length})</h4>
        
        {packages.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Noch keine Pakete erstellt</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.package_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="text-lg font-semibold text-foreground">{pkg.name}</h5>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  </div>
                  <Badge variant="secondary">{getDurationLabel(pkg.duration_days)}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Funktionen:</span>
                    <span className="font-semibold">{pkg.features.length}</span>
                  </div>
                  {pkg.price > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Preis:</span>
                      <span className="font-semibold">{pkg.price.toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditPackage(pkg)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-3 w-3" />
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeletePackage(pkg.package_id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageConfigurator;
