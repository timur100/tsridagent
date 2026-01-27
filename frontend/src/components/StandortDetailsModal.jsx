import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, Save, MapPin, Phone, Mail, Building2, User, Monitor, Network, MessageSquare, Globe, Ban, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import { getFullBundeslandName } from '../utils/bundesland';

const StandortDetailsModal = ({ standort, onClose, onUpdate }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [formData, setFormData] = useState({
    status: standort?.status || '',
    preparation_status: standort?.preparation_status || 'ready',
    main_code: standort?.main_code || '',
    plz: standort?.plz || '',
    ort: standort?.ort || '',
    str: standort?.str || '',
    telefon: standort?.telefon || '',
    telefon_intern: standort?.telefon_intern || '',
    email: standort?.email || '',
    main_typ: standort?.main_typ || '',
    stationsname: standort?.stationsname || '',
    mgr: standort?.mgr || '',
    bundesl: standort?.bundesl || '',
    lc_alt: standort?.lc_alt || '',
    id_checker: standort?.id_checker || 0,
    online: standort?.online || false,
    switch: standort?.switch || '',
    port: standort?.port || '',
    richtiges_vlan: standort?.richtiges_vlan || '',
    it_kommentar: standort?.it_kommentar || '',
    tsr_remarks: standort?.tsr_remarks || '',
    sn_pc: standort?.sn_pc || '',
    sn_sc: standort?.sn_sc || '',
    pp: standort?.pp || '',
    sw: standort?.sw || '',
    fw: standort?.fw || '',
    kommentar: standort?.kommentar || ''
  });

  useEffect(() => {
    if (standort) {
      fetchDevicesForStation();
    }
  }, [standort]);

  const fetchDevicesForStation = async () => {
    setLoadingDevices(true);
    try {
      const result = await apiCall('/api/portal/europcar-devices');
      
      if (result.success && result.data) {
        // The API returns { success: true, data: { devices: [...] } }
        // But apiCall wraps it, so result.data is the API response
        const apiResponse = result.data;
        
        if (apiResponse.success && apiResponse.data && apiResponse.data.devices) {
          // Filter devices for this station
          const stationDevices = apiResponse.data.devices.filter(
            device => device.locationcode === standort.main_code
          );
          setDevices(stationDevices);
        } else {
          setDevices([]);
        }
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const isStationOnline = () => {
    return devices.some(device => device.status === 'online');
  };

  if (!standort) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/customer-data/europcar-stations/${standort.main_code}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        toast.success('Standort erfolgreich aktualisiert');
        setIsEditing(false);
        
        if (onUpdate) {
          onUpdate(result.data?.station || formData);
        }
      } else {
        toast.error(result.data?.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Möchten Sie den Standort "${standort.stationsname}" wirklich deaktivieren?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/customer-data/europcar-stations/${standort.main_code}/deactivate`, {
        method: 'PATCH'
      });
      
      if (result.success) {
        toast.success('Standort deaktiviert');
        if (onUpdate) {
          onUpdate({ ...standort, status: 'inactive' });
        }
        onClose();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Deaktivieren');
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      toast.error('Fehler beim Deaktivieren');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`ACHTUNG: Möchten Sie den Standort "${standort.stationsname}" wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      return;
    }
    
    // Double confirm
    if (!window.confirm('Sind Sie absolut sicher? Alle Daten werden unwiderruflich gelöscht.')) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/customer-data/europcar-stations/${standort.main_code}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Standort gelöscht');
        if (onUpdate) {
          onUpdate(null, 'deleted'); // Signal deletion
        }
        onClose();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      status: standort?.status || '',
      preparation_status: standort?.preparation_status || 'ready',
      main_code: standort?.main_code || '',
      plz: standort?.plz || '',
      ort: standort?.ort || '',
      str: standort?.str || '',
      telefon: standort?.telefon || '',
      telefon_intern: standort?.telefon_intern || '',
      email: standort?.email || '',
      main_typ: standort?.main_typ || '',
      stationsname: standort?.stationsname || '',
      mgr: standort?.mgr || '',
      bundesl: standort?.bundesl || '',
      lc_alt: standort?.lc_alt || '',
      id_checker: standort?.id_checker || 0,
      online: standort?.online || false,
      switch: standort?.switch || '',
      port: standort?.port || '',
      richtiges_vlan: standort?.richtiges_vlan || '',
      it_kommentar: standort?.it_kommentar || '',
      tsr_remarks: standort?.tsr_remarks || '',
      sn_pc: standort?.sn_pc || '',
      sn_sc: standort?.sn_sc || '',
      pp: standort?.pp || '',
      sw: standort?.sw || '',
      fw: standort?.fw || '',
      kommentar: standort?.kommentar || ''
    });
    setIsEditing(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-100'
        }`}>
          {/* Customer Name */}
          <div className="mb-4">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Kunde
            </p>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Europcar Autovermietung GmbH
            </p>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'
              }`}>
                <MapPin className="h-8 w-8 text-[#c00000]" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {standort.stationsname}
                  </h2>
                  {/* Online Status Indicator - nur grün */}
                  {isStationOnline() ? (
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full bg-red-500"></span>
                  )}
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {standort.main_code} · {standort.ort}
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Top Right */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Bearbeiten
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Speichert...' : 'Speichern'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        status: standort?.status || '',
                        preparation_status: standort?.preparation_status || 'ready',
                        main_code: standort?.main_code || '',
                        plz: standort?.plz || '',
                        ort: standort?.ort || '',
                        str: standort?.str || '',
                        telefon: standort?.telefon || '',
                        telefon_intern: standort?.telefon_intern || '',
                        email: standort?.email || '',
                        main_typ: standort?.main_typ || '',
                        stationsname: standort?.stationsname || '',
                        mgr: standort?.mgr || '',
                        bundesl: standort?.bundesl || '',
                        lc_alt: standort?.lc_alt || '',
                        id_checker: standort?.id_checker || 0,
                        online: standort?.online || false,
                        switch: standort?.switch || '',
                        port: standort?.port || '',
                        richtiges_vlan: standort?.richtiges_vlan || '',
                        it_kommentar: standort?.it_kommentar || '',
                        tsr_remarks: standort?.tsr_remarks || '',
                        sn_pc: standort?.sn_pc || '',
                        sn_sc: standort?.sn_sc || '',
                        pp: standort?.pp || '',
                        sw: standort?.sw || '',
                        fw: standort?.fw || '',
                        kommentar: standort?.kommentar || ''
                      });
                    }}
                    variant="outline"
                    className={theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                  >
                    Abbrechen
                  </Button>
                </>
              )}
              
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Badge / Status Editor */}
          <div className="space-y-3">
            {!isEditing ? (
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  formData.status?.includes('READY')
                    ? theme === 'dark'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-green-100 text-green-700 border border-green-200'
                    : theme === 'dark'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                }`}>
                  {formData.status || 'Kein Status'}
                </span>
                {isStationOnline() && (
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    theme === 'dark'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    Online
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Standort Status
                </label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'READY', preparation_status: 'ready' }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.status === 'READY'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✓ READY
                  </Button>
                  <input
                    type="text"
                    name="status"
                    value={formData.status !== 'READY' ? formData.status : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    placeholder="z.B. Teile müssen abgeholt werden"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#c00000] focus:border-transparent`}
                  />
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Klicken Sie auf "READY" oder geben Sie einen benutzerdefinierten Status ein (z.B. "Teile müssen abgeholt werden", "Wartung erforderlich")
                </p>
              </div>
            )}
          </div>

          {/* Standort Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Adressinformationen */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Building2 className="h-5 w-5 mr-2 text-[#c00000]" />
                Adressinformationen
              </h3>
              <div className="space-y-3">
                <InfoField label="Stationsname" value={formData.stationsname} name="stationsname" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="Straße" value={formData.str} name="str" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="PLZ" value={formData.plz} name="plz" isEditing={isEditing} onChange={handleChange} theme={theme} />
                  <InfoField label="Stadt" value={formData.ort} name="ort" isEditing={isEditing} onChange={handleChange} theme={theme} />
                </div>
                <InfoField 
                  label="Bundesland" 
                  value={isEditing ? formData.bundesl : getFullBundeslandName(formData.bundesl)} 
                  name="bundesl" 
                  isEditing={isEditing} 
                  onChange={handleChange} 
                  theme={theme} 
                />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField 
                    label="Land" 
                    value="Germany" 
                    theme={theme} 
                    isEditing={false} 
                  />
                  <InfoField 
                    label="Kontinent" 
                    value="Europa" 
                    theme={theme} 
                    isEditing={false} 
                  />
                </div>
                <InfoField label="Typ" value={formData.main_typ} name="main_typ" isEditing={isEditing} onChange={handleChange} theme={theme} />
              </div>
            </Card>

            {/* Google Maps Standortkarte */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <MapPin className="h-5 w-5 mr-2 text-[#c00000]" />
                Standortkarte
              </h3>
              <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
                    `${standort.str}, ${standort.plz} ${standort.ort}, Germany`
                  )}&zoom=15`}
                  allowFullScreen
                  title="Standortkarte"
                />
              </div>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {standort.str}, {standort.plz} {standort.ort}
              </p>
            </Card>

            {/* Kontaktinformationen */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Phone className="h-5 w-5 mr-2 text-[#c00000]" />
                Kontaktinformationen
              </h3>
              <div className="space-y-3">
                <InfoField label="Manager" value={formData.mgr} name="mgr" isEditing={isEditing} onChange={handleChange} theme={theme} icon={User} />
                <InfoField label="Telefon" value={formData.telefon} name="telefon" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="Telefon Intern" value={formData.telefon_intern} name="telefon_intern" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="E-Mail" value={formData.email} name="email" isEditing={isEditing} onChange={handleChange} theme={theme} icon={Mail} />
              </div>
            </Card>

            {/* Öffnungszeiten - Platzhalter */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <svg className="h-5 w-5 mr-2 text-[#c00000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Öffnungszeiten
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Daten werden automatisch von der Europcar Website bezogen
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Montag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>08:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dienstag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>08:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Mittwoch:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>08:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Donnerstag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>08:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Freitag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>08:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Samstag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>09:00 - 13:00</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sonntag:</span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Geschlossen</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Weitere interessante Firmen - Platzhalter */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Building2 className="h-5 w-5 mr-2 text-[#c00000]" />
                Weitere interessante Firmen
              </h3>
              <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Andere Autovermietungen in unmittelbarer Nähe
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Sixt Autovermietung', distance: '0.3 km', address: 'Zugspitzstr. 189' },
                  { name: 'Avis Rent a Car', distance: '0.5 km', address: 'Bürgermeister-Ackermann-Str. 55' },
                  { name: 'Hertz Autovermietung', distance: '0.8 km', address: 'Neuburger Str. 121' }
                ].map((company, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } transition-colors cursor-pointer`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {company.name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {company.address}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {company.distance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-3 italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                * Platzhalter-Daten - werden automatisch via Google Places API aktualisiert
              </p>
            </Card>

            {/* Technische Details */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Network className="h-5 w-5 mr-2 text-[#c00000]" />
                Technische Details
              </h3>
              <div className="space-y-3">
                <InfoField label="ID Checker" value={formData.id_checker} name="id_checker" type="number" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="Switch" value={formData.switch} name="switch" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="Port" value={formData.port} name="port" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="VLAN" value={formData.richtiges_vlan} name="richtiges_vlan" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="6LC Alt" value={formData.lc_alt} name="lc_alt" isEditing={isEditing} onChange={handleChange} theme={theme} />
              </div>
            </Card>

            {/* Hardware Details */}
            <Card className={`p-5 rounded-xl ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
            }`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Monitor className="h-5 w-5 mr-2 text-[#c00000]" />
                Hardware Details
              </h3>
              <div className="space-y-3">
                <InfoField label="SN-PC" value={formData.sn_pc} name="sn_pc" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="SN-SC" value={formData.sn_sc} name="sn_sc" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="PP" value={formData.pp} name="pp" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="SW" value={formData.sw} name="sw" isEditing={isEditing} onChange={handleChange} theme={theme} />
                <InfoField label="FW" value={formData.fw} name="fw" isEditing={isEditing} onChange={handleChange} theme={theme} />
              </div>
            </Card>
          </div>

          {/* IT Kommentare */}
          <Card className={`p-5 rounded-xl ${
            theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
          }`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <MessageSquare className="h-5 w-5 mr-2 text-[#c00000]" />
              Kommentare & Bemerkungen
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  IT Kommentar
                </label>
                {isEditing ? (
                  <textarea
                    name="it_kommentar"
                    value={formData.it_kommentar}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-red-500`}
                  />
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formData.it_kommentar || 'Kein Kommentar'}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  TSR Bemerkungen
                </label>
                {isEditing ? (
                  <textarea
                    name="tsr_remarks"
                    value={formData.tsr_remarks}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-red-500`}
                  />
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formData.tsr_remarks || 'Keine Bemerkungen'}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  Eigene Notizen
                </label>
                {isEditing ? (
                  <textarea
                    name="kommentar"
                    value={formData.kommentar}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Fügen Sie hier Ihre eigenen Notizen hinzu..."
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-red-500`}
                  />
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formData.kommentar || 'Keine Notizen'}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-3 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? 'Speichert...' : 'Speichern'}</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] flex items-center space-x-2"
              >
                <Edit2 className="h-5 w-5" />
                <span>Bearbeiten</span>
              </Button>
            )}
          </div>

          {/* Assigned Devices Section */}
          <Card className={`p-6 ${
            theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Monitor className="h-5 w-5" />
              Zugewiesene Geräte ({devices.length})
            </h3>
            
            {loadingDevices ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : devices.length === 0 ? (
              <p className={`text-sm text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Keine Geräte zugewiesen
              </p>
            ) : (
              <div className="space-y-3">
                {devices.map((device, index) => (
                  <div
                    key={device.device_id || index}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-[#2a2a2a] border-gray-700' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                        }`}>
                          <Monitor className={`h-5 w-5 ${
                            device.status === 'online' ? 'text-green-500' : 'text-red-500'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {device.device_id}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {device.hardware_model || 'Unbekanntes Modell'}
                          </p>
                        </div>
                      </div>
                      
                      {/* TeamViewer Connect Button & Device Online Status */}
                      <div className="flex items-center gap-2">
                        {/* TeamViewer Connect Button */}
                        {device.tvid && (
                          <a
                            href={`teamviewer10://control?device=${device.tvid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0E72ED] hover:bg-[#0A5AC7] text-white transition-colors cursor-pointer"
                            title={`Mit TeamViewer verbinden (ID: ${device.tvid})`}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.5 13.5l-1.5-1.5-4 4v-13h-2v13l-4-4-1.5 1.5 6.5 6.5 6.5-6.5zm-13 0l-1.5-1.5-4 4v-13h-2v13l-4-4L-3.5 13.5 3 20l6.5-6.5z"/>
                            </svg>
                            Connect
                          </a>
                        )}
                        
                        {/* Device Online Status */}
                        {device.status === 'online' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                            <span className="h-2 w-2 rounded-full bg-red-500"></span>
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Device Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          Straße
                        </p>
                        <p className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.street || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          PLZ / Stadt
                        </p>
                        <p className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.zip || '-'} {device.city || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          SN-PC
                        </p>
                        <p className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.sn_pc || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          SN-SC
                        </p>
                        <p className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.sn_sc || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          TeamViewer ID
                        </p>
                        <p className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.tvid || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          IP-Adresse
                        </p>
                        <p className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.ip || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          SW Version
                        </p>
                        <p className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.sw_vers || '-'}
                        </p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          Land
                        </p>
                        <p className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {device.country || 'Germany'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Footer with Deactivate and Delete Buttons */}
        <div className={`sticky bottom-0 p-6 border-t flex justify-between items-center ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-100'
        }`}>
          <div className="flex gap-3">
            <Button
              onClick={handleDeactivate}
              disabled={loading || standort?.status === 'inactive'}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
            >
              <Ban className="h-4 w-4" />
              {standort?.status === 'inactive' ? 'Bereits deaktiviert' : 'Deaktivieren'}
            </Button>
            
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
          </div>

          <Button
            onClick={onClose}
            className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}
          >
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper component for info fields
const InfoField = ({ label, value, name, type = 'text', isEditing, onChange, theme, icon: Icon }) => (
  <div>
    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
      {Icon && <Icon className="h-3 w-3 inline mr-1" />}
      {label}
    </label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 rounded-lg border text-sm ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] border-gray-700 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        } focus:outline-none focus:ring-2 focus:ring-red-500`}
      />
    ) : (
      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {value || '-'}
      </p>
    )}
  </div>
);

export default StandortDetailsModal;
