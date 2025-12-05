import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Building2, Globe, MapPin, Save, X, ChevronDown } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

// Import Europcar countries list
const EUROPCAR_COUNTRIES = [
  // Europe
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "PT", name: "Portugal", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "BE", name: "Belgium", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  { code: "AT", name: "Austria", region: "Europe" },
  // Add more as needed or fetch from backend
];

const TenantHierarchySettings = ({ tenantId, currentData, onSave, onCancel }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    parent_tenant_id: currentData?.parent_tenant_id || '',
    tenant_type: currentData?.tenant_type || 'location',
    country_code: currentData?.country_code || '',
    allow_cross_location_search: currentData?.allow_cross_location_search || false
  });
  const [parentTenants, setParentTenants] = useState([]);
  const [siblings, setSiblings] = useState([]);
  const [saving, setSaving] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchParentTenants();
    if (tenantId) {
      fetchSiblings();
    }
  }, [tenantId]);

  const fetchParentTenants = async () => {
    try {
      // Fetch all tenants that could be parents (organizations or countries)
      const response = await fetch(`${BACKEND_URL}/api/tenants/?skip=0&limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Filter potential parents (not self, and type organization or country)
        const potentialParents = data.filter(t => 
          t.tenant_id !== tenantId &&
          (t.tenant_type === 'organization' || t.tenant_type === 'country')
        );
        setParentTenants(potentialParents);
      }
    } catch (error) {
      console.error('Error fetching parent tenants:', error);
    }
  };

  const fetchSiblings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/${tenantId}/siblings?same_country_only=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSiblings(data.siblings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching siblings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Hierarchie-Einstellungen gespeichert');
        if (onSave) onSave(formData);
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving hierarchy settings:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const getTenantTypeIcon = (type) => {
    switch (type) {
      case 'organization':
        return <Building2 className="w-4 h-4" />;
      case 'country':
        return <Globe className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
      <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Hierarchie & Standort-Einstellungen
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Type */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Tenant-Typ
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['organization', 'continent', 'country', 'city', 'location'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({...formData, tenant_type: type})}
                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  formData.tenant_type === type
                    ? 'border-[#c00000] bg-[#c00000] bg-opacity-10'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {getTenantTypeIcon(type)}
                <span className={`text-sm font-medium ${
                  formData.tenant_type === type
                    ? 'text-[#c00000]'
                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {type === 'organization' ? 'Organisation' : type === 'country' ? 'Land' : 'Standort'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Parent Tenant */}
        {formData.tenant_type !== 'organization' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Übergeordneter Tenant
            </label>
            <select
              value={formData.parent_tenant_id}
              onChange={(e) => setFormData({...formData, parent_tenant_id: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Kein übergeordneter Tenant</option>
              {parentTenants.map(parent => (
                <option key={parent.tenant_id} value={parent.tenant_id}>
                  {parent.display_name} ({parent.tenant_type === 'organization' ? 'Organisation' : 'Land'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Country Code */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Land
          </label>
          <select
            value={formData.country_code}
            onChange={(e) => setFormData({...formData, country_code: e.target.value})}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Kein Land ausgewählt</option>
            {EUROPCAR_COUNTRIES.map(country => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Erforderlich für standortübergreifende Fahrzeugsuche
          </p>
        </div>

        {/* Cross-Location Search */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allow_cross_location_search}
              onChange={(e) => setFormData({...formData, allow_cross_location_search: e.target.checked})}
              className="w-5 h-5 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000]"
            />
            <div>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Standortübergreifende Fahrzeugsuche aktivieren
              </span>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Ermöglicht die Suche nach verfügbaren Fahrzeugen bei anderen Standorten im gleichen Land
              </p>
            </div>
          </label>
        </div>

        {/* Sibling Locations Info */}
        {siblings.length > 0 && formData.allow_cross_location_search && (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'}`}>
            <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
              Verfügbare Standorte für Fahrzeugsuche:
            </h4>
            <div className="flex flex-wrap gap-2">
              {siblings.map(sibling => (
                <span
                  key={sibling.tenant_id}
                  className={`px-3 py-1 rounded-full text-xs ${
                    theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {sibling.display_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default TenantHierarchySettings;
