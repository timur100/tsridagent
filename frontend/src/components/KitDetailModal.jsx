import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, History, RefreshCw, AlertTriangle, Check, X,
  ArrowRight, Wrench, ChevronDown, ChevronRight, Calendar, User,
  Truck, Building, Box, Plus, Users, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const KIT_STATUS_CONFIG = {
  incomplete: { label: 'Unvollständig', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  complete: { label: 'Vollständig', color: 'bg-green-500', textColor: 'text-green-500' },
  ready: { label: 'Bereit', color: 'bg-green-500', textColor: 'text-green-500' },
  in_storage: { label: 'Lager', color: 'bg-blue-500', textColor: 'text-blue-500' },
  assigned: { label: 'Zugewiesen', color: 'bg-purple-500', textColor: 'text-purple-500' },
  defective: { label: 'Defekt', color: 'bg-red-500', textColor: 'text-red-500' }
};

const KitDetailModal = ({ kit, isOpen, onClose, onRefresh, theme }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [kitDetails, setKitDetails] = useState(null);
  const [kitHistory, setKitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tenant state
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(false);
  
  // Assignment state
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationKits, setLocationKits] = useState([]);
  const [loadingLocationKits, setLoadingLocationKits] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [technician, setTechnician] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Move state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveReason, setMoveReason] = useState('');
  const [moving, setMoving] = useState(false);
  
  // Replace component state
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [componentToReplace, setComponentToReplace] = useState(null);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [selectedNewComponent, setSelectedNewComponent] = useState('');
  const [defectReason, setDefectReason] = useState('');
  const [replacing, setReplacing] = useState(false);

  const cardBg = isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#1a1a1a] border-gray-700 text-white' : '';

  // Fetch kit details
  const fetchKitDetails = useCallback(async () => {
    if (!kit?.asset_id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/${kit.asset_id}`);
      const data = await res.json();
      if (data.success) {
        setKitDetails(data.kit);
      }
    } catch (e) {
      console.error('Error fetching kit details:', e);
      toast.error('Fehler beim Laden der Kit-Details');
    } finally {
      setLoading(false);
    }
  }, [kit?.asset_id]);

  // Fetch kit history
  const fetchKitHistory = useCallback(async () => {
    if (!kit?.asset_id) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/${kit.asset_id}/history`);
      const data = await res.json();
      if (data.success) {
        setKitHistory(data.kit_history || []);
      }
    } catch (e) {
      console.error('Error fetching kit history:', e);
    }
  }, [kit?.asset_id]);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/tenants?limit=500`);
      const data = await res.json();
      if (data.tenants) {
        setTenants(data.tenants);
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/locations?limit=500`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  }, []);

  // Filter locations by selected tenant
  useEffect(() => {
    if (selectedTenant && locations.length > 0) {
      const filtered = locations.filter(loc => 
        loc.tenant_id === selectedTenant || 
        loc.customer === selectedTenant ||
        loc.tenant_name === selectedTenant
      );
      setFilteredLocations(filtered);
      // Reset selected location when tenant changes
      setSelectedLocation('');
    } else {
      setFilteredLocations([]);
    }
  }, [selectedTenant, locations]);

  // Fetch kits at selected location
  const fetchLocationKits = useCallback(async (locationId) => {
    if (!locationId) {
      setLocationKits([]);
      return;
    }
    
    setLoadingLocationKits(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/locations/${locationId}/kits`);
      const data = await res.json();
      if (data.success) {
        setLocationKits(data.kits || []);
      }
    } catch (e) {
      console.error('Error fetching location kits:', e);
    } finally {
      setLoadingLocationKits(false);
    }
  }, []);

  // Fetch available components for replacement
  const fetchAvailableComponents = useCallback(async (componentType) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/available-components`);
      const data = await res.json();
      if (data.success) {
        // Filter by type
        const filtered = data.components.filter(c => c.type === componentType);
        setAvailableComponents(filtered);
      }
    } catch (e) {
      console.error('Error fetching available components:', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen && kit) {
      fetchKitDetails();
      fetchKitHistory();
      fetchLocations();
      fetchTenants();
    }
  }, [isOpen, kit, fetchKitDetails, fetchKitHistory, fetchLocations, fetchTenants]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLocationKits(selectedLocation);
    }
  }, [selectedLocation, fetchLocationKits]);

  // Assign kit to location
  const handleAssignToLocation = async () => {
    if (!selectedLocation) {
      toast.error('Bitte wählen Sie eine Location aus');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/${kit.asset_id}/assign-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocation,
          technician,
          notes: assignmentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Kit zugewiesen: ${data.new_kit_id}`);
        onRefresh?.();
        onClose();
      } else {
        toast.error(data.detail || 'Fehler bei der Zuweisung');
      }
    } catch (e) {
      console.error('Error assigning kit:', e);
      toast.error('Fehler bei der Zuweisung');
    } finally {
      setAssigning(false);
    }
  };

  // Move kit to new location
  const handleMoveKit = async () => {
    if (!selectedLocation) {
      toast.error('Bitte wählen Sie eine neue Location aus');
      return;
    }

    setMoving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/${kit.asset_id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_location_id: selectedLocation,
          reason: moveReason,
          technician,
          notes: assignmentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Kit umgezogen: ${data.new_kit_id}`);
        setShowMoveDialog(false);
        onRefresh?.();
        onClose();
      } else {
        toast.error(data.detail || 'Fehler beim Umziehen');
      }
    } catch (e) {
      console.error('Error moving kit:', e);
      toast.error('Fehler beim Umziehen');
    } finally {
      setMoving(false);
    }
  };

  // Replace component
  const handleReplaceComponent = async () => {
    if (!componentToReplace || !selectedNewComponent || !defectReason) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    setReplacing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/asset-mgmt/kits/${kit.asset_id}/replace-component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_component_id: componentToReplace.asset_id,
          new_component_id: selectedNewComponent,
          defect_reason: defectReason,
          technician,
          notes: assignmentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Komponente erfolgreich ausgetauscht');
        setShowReplaceDialog(false);
        setComponentToReplace(null);
        setSelectedNewComponent('');
        setDefectReason('');
        fetchKitDetails();
        fetchKitHistory();
      } else {
        toast.error(data.detail || 'Fehler beim Austausch');
      }
    } catch (e) {
      console.error('Error replacing component:', e);
      toast.error('Fehler beim Austausch');
    } finally {
      setReplacing(false);
    }
  };

  const openReplaceDialog = (component) => {
    setComponentToReplace(component);
    fetchAvailableComponents(component.type);
    setShowReplaceDialog(true);
  };

  if (!kit) return null;

  const status = kitDetails?.kit_status || kit.kit_status || 'incomplete';
  const statusConfig = KIT_STATUS_CONFIG[status] || KIT_STATUS_CONFIG.incomplete;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Package className="h-6 w-6 text-red-500" />
              <span>{kit.asset_id}</span>
              <Badge className={`${statusConfig.color} text-white`}>
                {statusConfig.label}
              </Badge>
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {kit.type_label || kit.type} • {kitDetails?.component_details?.length || 0} Komponenten
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Übersicht
              </TabsTrigger>
              <TabsTrigger value="assign" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zuweisung
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historie
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Kit Info */}
                  <Card className={`p-4 ${cardBg}`}>
                    <h4 className="font-semibold mb-3">Kit-Informationen</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Kit-ID:</span>
                        <span className="ml-2 font-mono">{kit.asset_id}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Original-ID:</span>
                        <span className="ml-2 font-mono">{kitDetails?.original_kit_id || '-'}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Vorlage:</span>
                        <span className="ml-2">{kitDetails?.kit_template_id || '-'}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                        <span className="ml-2">{kit.location_id || 'Nicht zugewiesen (Lager)'}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Erstellt:</span>
                        <span className="ml-2">{kit.created_at ? new Date(kit.created_at).toLocaleDateString('de-DE') : '-'}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
                        <Badge className={`ml-2 ${statusConfig.color} text-white`}>{statusConfig.label}</Badge>
                      </div>
                    </div>
                  </Card>

                  {/* Components */}
                  <Card className={`p-4 ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Komponenten ({kitDetails?.component_details?.length || 0})</h4>
                      {status !== 'assigned' && (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Kann bearbeitet werden
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {kitDetails?.component_details?.map((comp, idx) => (
                        <div 
                          key={comp.asset_id || idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
                              <Package className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">{comp.type_label || comp.type}</p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {comp.asset_id || comp.manufacturer_sn}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {comp.status === 'defect' && (
                              <Badge variant="destructive">Defekt</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReplaceDialog(comp)}
                              className="text-orange-500 border-orange-500 hover:bg-orange-500/10"
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Austauschen
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {(!kitDetails?.component_details || kitDetails.component_details.length === 0) && (
                        <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Keine Komponenten zugewiesen
                        </p>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Assignment Tab */}
            <TabsContent value="assign" className="space-y-4">
              {status === 'assigned' && kit.location_id ? (
                <>
                  <Card className={`p-4 ${cardBg}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold">Aktuell zugewiesen</h4>
                    </div>
                    <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Dieses Kit ist derzeit Location <strong>{kit.location_id}</strong> zugewiesen.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowMoveDialog(true)}
                      className="text-orange-500 border-orange-500"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Kit umziehen
                    </Button>
                  </Card>
                </>
              ) : (
                <>
                  <Card className={`p-4 ${cardBg}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Building className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">Location auswählen</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Location *</label>
                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                          <SelectTrigger className={inputBg}>
                            <SelectValue placeholder="Location auswählen..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {locations.map(loc => (
                              <SelectItem key={loc.location_id} value={loc.location_id}>
                                {loc.location_id} - {loc.city} ({loc.customer || loc.tenant_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Techniker</label>
                        <Input
                          value={technician}
                          onChange={(e) => setTechnician(e.target.value)}
                          placeholder="Name des Technikers..."
                          className={inputBg}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Notizen</label>
                        <Textarea
                          value={assignmentNotes}
                          onChange={(e) => setAssignmentNotes(e.target.value)}
                          placeholder="Optionale Notizen..."
                          className={inputBg}
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Existing Kits at Location */}
                  {selectedLocation && (
                    <Card className={`p-4 ${cardBg}`}>
                      <h4 className="font-semibold mb-3">
                        Vorhandene Kits an {selectedLocation}
                      </h4>
                      
                      {loadingLocationKits ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        </div>
                      ) : locationKits.length > 0 ? (
                        <div className="space-y-2">
                          {locationKits.map(lk => (
                            <div 
                              key={lk.asset_id}
                              className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}
                            >
                              <span className="font-mono text-sm">{lk.asset_id}</span>
                              <Badge variant="outline">{lk.type_label}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Keine Kits an dieser Location vorhanden.
                        </p>
                      )}
                    </Card>
                  )}

                  {/* New Kit ID Preview */}
                  {selectedLocation && (
                    <Card className={`p-4 border-2 border-dashed ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'}`}>
                      <p className={`text-xs font-medium mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        Neue Kit-ID nach Zuweisung:
                      </p>
                      <p className={`font-mono text-lg font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                        {selectedLocation}-{String(locationKits.length + 1).padStart(2, '0')}-KIT
                      </p>
                    </Card>
                  )}

                  <Button
                    onClick={handleAssignToLocation}
                    disabled={!selectedLocation || assigning}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {assigning ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Kit zuweisen
                  </Button>
                </>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card className={`p-4 ${cardBg}`}>
                <h4 className="font-semibold mb-4">Kit-Historie</h4>
                
                <div className="space-y-3">
                  {kitHistory.length > 0 ? (
                    kitHistory.slice().reverse().map((entry, idx) => (
                      <div 
                        key={idx}
                        className={`flex gap-3 p-3 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          entry.event_type === 'created' ? 'bg-green-500/20 text-green-500' :
                          entry.event_type === 'assigned_to_location' ? 'bg-blue-500/20 text-blue-500' :
                          entry.event_type === 'moved' ? 'bg-orange-500/20 text-orange-500' :
                          entry.event_type === 'component_replaced' ? 'bg-purple-500/20 text-purple-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {entry.event_type === 'created' && <Package className="h-5 w-5" />}
                          {entry.event_type === 'assigned_to_location' && <MapPin className="h-5 w-5" />}
                          {entry.event_type === 'moved' && <Truck className="h-5 w-5" />}
                          {entry.event_type === 'component_replaced' && <Wrench className="h-5 w-5" />}
                          {!['created', 'assigned_to_location', 'moved', 'component_replaced'].includes(entry.event_type) && <History className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{entry.event}</p>
                          <div className={`flex items-center gap-4 text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(entry.date).toLocaleString('de-DE')}
                            </span>
                            {entry.technician && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.technician}
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Keine Historie vorhanden
                    </p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className={isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              Kit umziehen
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : ''}>
              Kit von {kit.location_id} zu einer neuen Location verschieben
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Neue Location *</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className={inputBg}>
                  <SelectValue placeholder="Location auswählen..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {locations.filter(l => l.location_id !== kit.location_id).map(loc => (
                    <SelectItem key={loc.location_id} value={loc.location_id}>
                      {loc.location_id} - {loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Umzugsgrund *</label>
              <Input
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                placeholder="z.B. Station geschlossen, Kapazitätsanpassung..."
                className={inputBg}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Techniker</label>
              <Input
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Name..."
                className={inputBg}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleMoveKit}
              disabled={!selectedLocation || !moveReason || moving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {moving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
              Umziehen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Component Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className={isDark ? 'bg-[#1a1a1a] border-gray-700' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-500" />
              Komponente austauschen
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : ''}>
              {componentToReplace?.type_label} ({componentToReplace?.asset_id}) ersetzen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                Defekte Komponente:
              </p>
              <p className="font-mono">{componentToReplace?.asset_id}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Defektgrund *</label>
              <Input
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                placeholder="z.B. Display defekt, Akku leer..."
                className={inputBg}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Ersatzkomponente *</label>
              <Select value={selectedNewComponent} onValueChange={setSelectedNewComponent}>
                <SelectTrigger className={inputBg}>
                  <SelectValue placeholder="Komponente auswählen..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {availableComponents.map(comp => (
                    <SelectItem key={comp.asset_id || comp.manufacturer_sn} value={comp.asset_id || comp.manufacturer_sn}>
                      {comp.asset_id || comp.manufacturer_sn} - {comp.type_label}
                    </SelectItem>
                  ))}
                  {availableComponents.length === 0 && (
                    <SelectItem value="" disabled>Keine verfügbaren Komponenten</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Techniker</label>
              <Input
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Name..."
                className={inputBg}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleReplaceComponent}
              disabled={!selectedNewComponent || !defectReason || replacing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {replacing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
              Austauschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KitDetailModal;
