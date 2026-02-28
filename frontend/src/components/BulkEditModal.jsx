import React, { useState } from 'react';
import { 
  Edit2, Calendar, Building2, Package, FileText, Key, Shield, 
  X, Check, AlertTriangle, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const BulkEditModal = ({ 
  isOpen, 
  onClose, 
  selectedAssets = [], 
  theme = 'dark',
  onSuccess 
}) => {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-300';
  const accentColor = '#d50c2d';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    supplier: '',
    purchase_date: '',
    warranty_months: '',
    warranty_end: '',
    installation_date: '',
    license_activated: '',
    license_expires: '',
    license_type: '',
    license_key: '',
    country: '',
    notes: '',
    technician: ''
  });

  // Track which fields are enabled for update
  const [enabledFields, setEnabledFields] = useState({
    manufacturer: false,
    model: false,
    supplier: false,
    purchase_date: false,
    warranty: false,
    installation_date: false,
    license: false,
    country: false,
    notes: false
  });

  const toggleField = (field) => {
    setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Keine Assets ausgewählt');
      return;
    }

    // Build request with only enabled fields
    const requestData = {
      asset_ids: selectedAssets.map(a => a.asset_id || a.warehouse_asset_id),
      technician: formData.technician || 'System'
    };

    if (enabledFields.manufacturer && formData.manufacturer) {
      requestData.manufacturer = formData.manufacturer;
    }
    if (enabledFields.model && formData.model) {
      requestData.model = formData.model;
    }
    if (enabledFields.supplier && formData.supplier) {
      requestData.supplier = formData.supplier;
    }
    if (enabledFields.purchase_date && formData.purchase_date) {
      requestData.purchase_date = formData.purchase_date;
    }
    if (enabledFields.warranty) {
      if (formData.warranty_months) {
        requestData.warranty_months = parseInt(formData.warranty_months);
        if (formData.purchase_date) {
          requestData.purchase_date = formData.purchase_date;
        }
      }
      if (formData.warranty_end) {
        requestData.warranty_end = formData.warranty_end;
      }
    }
    if (enabledFields.installation_date && formData.installation_date) {
      requestData.installation_date = formData.installation_date;
    }
    if (enabledFields.license) {
      if (formData.license_activated) {
        requestData.license_activated = formData.license_activated;
      }
      if (formData.license_expires) {
        requestData.license_expires = formData.license_expires;
      }
      if (formData.license_type) {
        requestData.license_type = formData.license_type;
      }
      if (formData.license_key) {
        requestData.license_key = formData.license_key;
      }
    }
    if (enabledFields.country && formData.country) {
      requestData.country = formData.country;
    }
    if (enabledFields.notes && formData.notes) {
      requestData.notes = formData.notes;
    }

    // Check if any fields are enabled
    const hasUpdates = Object.keys(requestData).length > 2; // More than just asset_ids and technician
    if (!hasUpdates) {
      toast.error('Bitte mindestens ein Feld aktivieren und ausfüllen');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/inventory/bulk-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${data.updated_count} Assets aktualisiert`);
        if (data.failed_count > 0) {
          toast(`${data.failed_count} Assets konnten nicht aktualisiert werden`, { icon: '⚠️' });
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.detail || 'Fehler bei der Bulk-Bearbeitung');
      }
    } catch (e) {
      console.error('Bulk edit error:', e);
      toast.error('Fehler bei der Bulk-Bearbeitung');
    } finally {
      setLoading(false);
    }
  };

  const FieldGroup = ({ id, icon: Icon, title, enabled, children }) => (
    <div className={`p-4 rounded-lg border ${enabled ? 'border-green-500/50' : isDark ? 'border-gray-700' : 'border-gray-200'} ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer mb-3"
        onClick={() => toggleField(id)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${enabled ? 'text-green-400' : 'text-gray-400'}`} />
          <span className={`font-medium ${enabled ? 'text-white' : 'text-gray-400'}`}>{title}</span>
        </div>
        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
          enabled 
            ? 'bg-green-500 border-green-500' 
            : isDark ? 'border-gray-600' : 'border-gray-300'
        }`}>
          {enabled && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      {enabled && (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#2d2d2d] text-white border-gray-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" style={{ color: accentColor }} />
            Bulk-Bearbeitung ({selectedAssets.length} Assets)
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Selected Assets Preview */}
          <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
            <p className="text-sm text-gray-400 mb-2">Ausgewählte Assets:</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedAssets.slice(0, 20).map((asset, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {asset.asset_id || asset.warehouse_asset_id}
                </Badge>
              ))}
              {selectedAssets.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedAssets.length - 20} weitere
                </Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              Aktivieren Sie die Felder, die Sie aktualisieren möchten. Nur aktivierte Felder werden geändert.
            </span>
          </div>

          <div className="space-y-4">
            {/* Technician */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <label className="text-sm text-gray-400 block mb-2">Bearbeiter</label>
              <Input
                placeholder="Name des Bearbeiters"
                value={formData.technician}
                onChange={(e) => handleChange('technician', e.target.value)}
                className={inputBg}
              />
            </div>

            {/* Manufacturer & Model */}
            <FieldGroup id="manufacturer" icon={Building2} title="Hersteller" enabled={enabledFields.manufacturer}>
              <Input
                placeholder="Hersteller eingeben..."
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            <FieldGroup id="model" icon={Package} title="Modell" enabled={enabledFields.model}>
              <Input
                placeholder="Modell eingeben..."
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            {/* Supplier */}
            <FieldGroup id="supplier" icon={Building2} title="Lieferant" enabled={enabledFields.supplier}>
              <Input
                placeholder="Lieferant eingeben..."
                value={formData.supplier}
                onChange={(e) => handleChange('supplier', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            {/* Purchase Date */}
            <FieldGroup id="purchase_date" icon={Calendar} title="Kaufdatum" enabled={enabledFields.purchase_date}>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            {/* Warranty */}
            <FieldGroup id="warranty" icon={Shield} title="Garantie" enabled={enabledFields.warranty}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Garantie (Monate)</label>
                  <Input
                    type="number"
                    placeholder="z.B. 24"
                    value={formData.warranty_months}
                    onChange={(e) => handleChange('warranty_months', e.target.value)}
                    className={inputBg}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Oder: Ablaufdatum</label>
                  <Input
                    type="date"
                    value={formData.warranty_end}
                    onChange={(e) => handleChange('warranty_end', e.target.value)}
                    className={inputBg}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Tipp: Bei Angabe von Monaten wird das Ablaufdatum automatisch berechnet (Kaufdatum + Monate)
              </p>
            </FieldGroup>

            {/* Installation Date */}
            <FieldGroup id="installation_date" icon={Calendar} title="Installationsdatum" enabled={enabledFields.installation_date}>
              <Input
                type="date"
                value={formData.installation_date}
                onChange={(e) => handleChange('installation_date', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            {/* License */}
            <FieldGroup id="license" icon={Key} title="Lizenz" enabled={enabledFields.license}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Aktiviert am</label>
                  <Input
                    type="date"
                    value={formData.license_activated}
                    onChange={(e) => handleChange('license_activated', e.target.value)}
                    className={inputBg}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Läuft ab am</label>
                  <Input
                    type="date"
                    value={formData.license_expires}
                    onChange={(e) => handleChange('license_expires', e.target.value)}
                    className={inputBg}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Lizenztyp</label>
                  <Input
                    placeholder="z.B. Windows 11 Pro"
                    value={formData.license_type}
                    onChange={(e) => handleChange('license_type', e.target.value)}
                    className={inputBg}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Lizenzschlüssel</label>
                  <Input
                    placeholder="XXXXX-XXXXX-XXXXX"
                    value={formData.license_key}
                    onChange={(e) => handleChange('license_key', e.target.value)}
                    className={inputBg}
                  />
                </div>
              </div>
            </FieldGroup>

            {/* Country */}
            <FieldGroup id="country" icon={Building2} title="Land" enabled={enabledFields.country}>
              <Input
                placeholder="z.B. Deutschland"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className={inputBg}
              />
            </FieldGroup>

            {/* Notes */}
            <FieldGroup id="notes" icon={FileText} title="Notizen" enabled={enabledFields.notes}>
              <textarea
                placeholder="Zusätzliche Notizen..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-md border ${inputBg}`}
              />
            </FieldGroup>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className={isDark ? 'border-gray-600 hover:bg-gray-700' : ''}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: accentColor }}
            className="hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird aktualisiert...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {selectedAssets.length} Assets aktualisieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditModal;
