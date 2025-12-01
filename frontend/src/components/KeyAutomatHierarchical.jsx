import React, { useState, useEffect } from 'react';
import { ChevronRight, Building2, MapPin, Monitor, Key, Lock, ArrowLeft, Users, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { toast } from 'react-hot-toast';
import KeyAutomatManagementEnhanced from './KeyAutomatManagementEnhanced';
import LocationEditorModal from './LocationEditorModal';
import AutomatEditorModal from './AutomatEditorModal';

const KeyAutomatHierarchical = ({ theme }) => {
  const { apiCall, user } = useAuth();
  const { selectedTenantId, selectedTenantName, isSuperAdmin } = useTenant();
  
  const [navigationLevel, setNavigationLevel] = useState('tenant'); // tenant, location, system
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  
  const [tenants, setTenants] = useState([]);
  const [locations, setLocations] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [automats, setAutomats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAutomatModal, setShowAutomatModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingAutomat, setEditingAutomat] = useState(null);

  useEffect(() => {
    // Check if user is super admin
    if (user?.email === 'admin@tsrid.com' || isSuperAdmin) {
      // Super admin starts at tenant selection
      setNavigationLevel('tenant');
      loadAllTenants();
    } else {
      // Regular customer: auto-select their tenant
      if (selectedTenantId && selectedTenantId !== 'all') {
        setSelectedTenant({
          tenant_id: selectedTenantId,
          name: selectedTenantName
        });
        setNavigationLevel('location');
        loadLocationsForTenant(selectedTenantId);
      }
    }
  }, [user, selectedTenantId, isSuperAdmin]);

  const loadAllTenants = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/tenants/', { method: 'GET' });
      if (response.success) {
        setTenants(response.data || []);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Fehler beim Laden der Tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationsForTenant = async (tenantId) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/key-automat/locations/list?tenant_id=${tenantId}`, { method: 'GET' });
      if (response.success) {
        setLocations(response.locations || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Fehler beim Laden der Standorte');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemsForLocation = async (locationId) => {
    try {
      setLoading(true);
      
      // Load kiosks for this location
      const kioskResponse = await apiCall('/api/kiosks/list', { method: 'GET' });
      const locationKiosks = kioskResponse.success 
        ? (kioskResponse.data?.kiosks || []).filter(k => k.location_id === locationId)
        : [];
      
      // Load automats for this location
      const automatResponse = await apiCall(`/api/key-automat/automats/list?location_id=${locationId}`, { method: 'GET' });
      const locationAutomats = automatResponse.success ? (automatResponse.automats || []) : [];
      
      setKiosks(locationKiosks);
      setAutomats(locationAutomats);
    } catch (error) {
      console.error('Error loading systems:', error);
      toast.error('Fehler beim Laden der Systeme');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant) => {
    setSelectedTenant(tenant);
    setNavigationLevel('location');
    loadLocationsForTenant(tenant.tenant_id || tenant.id);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setNavigationLevel('system');
    loadSystemsForLocation(location.location_id);
  };

  const handleSystemSelect = (system, type) => {
    setSelectedSystem({ ...system, type });
    setNavigationLevel('management');
  };

  const handleBack = () => {
    if (navigationLevel === 'management') {
      setNavigationLevel('system');
      setSelectedSystem(null);
    } else if (navigationLevel === 'system') {
      setNavigationLevel('location');
      setSelectedLocation(null);
      setKiosks([]);
      setAutomats([]);
    } else if (navigationLevel === 'location') {
      if (user?.email === 'admin@tsrid.com' || isSuperAdmin) {
        setNavigationLevel('tenant');
        setSelectedTenant(null);
        setLocations([]);
      }
    }
  };

  const renderBreadcrumb = () => {
    const items = [];
    
    if (selectedTenant) {
      items.push(
        <div key="tenant" className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#c00000]" />
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {selectedTenant.name}
          </span>
        </div>
      );
    }
    
    if (selectedLocation) {
      items.push(
        <ChevronRight key="arrow1" className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />,
        <div key="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#c00000]" />
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {selectedLocation.name}
          </span>
        </div>
      );
    }
    
    if (selectedSystem) {
      items.push(
        <ChevronRight key="arrow2" className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />,
        <div key="system" className="flex items-center gap-2">
          {selectedSystem.type === 'automat' ? (
            <Lock className="h-4 w-4 text-[#c00000]" />
          ) : (
            <Monitor className="h-4 w-4 text-[#c00000]" />
          )}
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {selectedSystem.name}
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {items}
      </div>
    );
  };

  if (loading && navigationLevel !== 'management') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-4">
            {navigationLevel !== 'tenant' && (
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
            )}
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Schlüsselautomat & Kiosksysteme
            </h2>
          </div>
          {(selectedTenant || selectedLocation || selectedSystem) && (
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {renderBreadcrumb()}
            </div>
          )}
        </div>
      </div>

      {/* Tenant Selection (Super Admin only) */}
      {navigationLevel === 'tenant' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#c00000]" />
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tenant auswählen
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <button
                key={tenant.id || tenant.tenant_id}
                onClick={() => handleTenantSelect(tenant)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-700 hover:border-[#c00000] hover:bg-[#333333]'
                    : 'bg-white border-gray-200 hover:border-[#c00000] hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-8 w-8 text-[#c00000]" />
                  <div>
                    <h4 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.name || tenant.company}
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {tenant.domain || 'Tenant'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Standorte verwalten
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#c00000]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Selection */}
      {navigationLevel === 'location' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#c00000]" />
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Standorte - {selectedTenant?.name}
              </h3>
            </div>
            <button
              onClick={() => {
                // TODO: Open create location modal
                toast.info('Standort erstellen - wird implementiert');
              }}
              className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors text-sm"
            >
              + Neuer Standort
            </button>
          </div>

          {locations.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <Globe className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine Standorte vorhanden
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Erstellen Sie den ersten Standort für diesen Tenant
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <button
                  key={location.location_id}
                  onClick={() => handleLocationSelect(location)}
                  className={`p-6 rounded-xl border text-left transition-all ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] border-gray-700 hover:border-[#c00000] hover:bg-[#333333]'
                      : 'bg-white border-gray-200 hover:border-[#c00000] hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-8 w-8 text-[#c00000]" />
                    <div>
                      <h4 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.name}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {location.city}, {location.country}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
                    {location.address}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Systeme anzeigen
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#c00000]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Selection (Kiosk or Automat) */}
      {navigationLevel === 'system' && (
        <div className="space-y-6">
          {/* Schlüsselautomaten */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#c00000]" />
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Schlüsselautomaten
                </h3>
              </div>
              <button
                onClick={() => {
                  toast.info('Schlüsselautomat erstellen - wird implementiert');
                }}
                className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors text-sm"
              >
                + Neuer Automat
              </button>
            </div>

            {automats.length === 0 ? (
              <div className={`text-center py-8 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <Lock className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Keine Schlüsselautomaten an diesem Standort
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {automats.map((automat) => (
                  <button
                    key={automat.automat_id}
                    onClick={() => handleSystemSelect(automat, 'automat')}
                    className={`p-6 rounded-xl border text-left transition-all ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 hover:border-[#c00000] hover:bg-[#333333]'
                        : 'bg-white border-gray-200 hover:border-[#c00000] hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          automat.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                        <div>
                          <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {automat.name}
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {automat.occupied_slots || 0} / {automat.total_slots} belegt
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#c00000]" />
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#c00000]"
                        style={{ width: `${((automat.occupied_slots || 0) / automat.total_slots) * 100}%` }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kiosksysteme */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-[#c00000]" />
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kiosksysteme
                </h3>
              </div>
              <button
                onClick={() => {
                  toast.info('Kiosk erstellen - wird implementiert');
                }}
                className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors text-sm"
              >
                + Neuer Kiosk
              </button>
            </div>

            {kiosks.length === 0 ? (
              <div className={`text-center py-8 rounded-xl border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <Monitor className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Keine Kiosksysteme an diesem Standort
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kiosks.map((kiosk) => (
                  <button
                    key={kiosk.kiosk_id}
                    onClick={() => handleSystemSelect(kiosk, 'kiosk')}
                    className={`p-6 rounded-xl border text-left transition-all ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 hover:border-[#c00000] hover:bg-[#333333]'
                        : 'bg-white border-gray-200 hover:border-[#c00000] hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-8 w-8 text-[#c00000]" />
                        <div>
                          <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {kiosk.name}
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {kiosk.type || 'Self-Service'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#c00000]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Management View - Full Key Management */}
      {navigationLevel === 'management' && selectedSystem && (
        <KeyAutomatManagementEnhanced 
          theme={theme}
          tenantId={selectedTenant?.tenant_id || selectedTenant?.id}
          locationId={selectedLocation?.location_id}
          automatId={selectedSystem.type === 'automat' ? selectedSystem.automat_id : null}
          kioskId={selectedSystem.type === 'kiosk' ? selectedSystem.kiosk_id : null}
        />
      )}
    </div>
  );
};

export default KeyAutomatHierarchical;
