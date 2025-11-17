import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Building2, Mail, Users, Monitor, MapPin, Package, Shield, Edit2, Save, Trash2, Calendar, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const CustomerDetailsModal = ({ customer, onClose, stats, onUpdate, onDelete }) => {
  const { theme } = useTheme();
  const { apiCall, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customerStats, setCustomerStats] = useState({
    devices: 0,
    locations: 0,
    employees: 0,
    licenses: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    company: customer?.company || '',
    email: customer?.email || ''
  });

  if (!customer) {
    return null;
  }

  // Load customer statistics
  useEffect(() => {
    const loadCustomerStats = async () => {
      setLoadingStats(true);
      try {
        console.log('[CustomerDetails] Loading stats for company:', customer.company);
        
        // Load devices count for this customer
        const devicesResult = await apiCall(`/api/portal/europcar-devices?customer_filter=${encodeURIComponent(customer.company)}`);
        console.log('[CustomerDetails] Devices API result:', devicesResult);
        console.log('[CustomerDetails] devicesResult.success:', devicesResult?.success);
        console.log('[CustomerDetails] devicesResult.data:', devicesResult?.data);
        
        // Parse device count from API response
        // apiCall wraps response: { success: true, data: {...}, status: 200 }
        // Backend returns: { success: true, summary: { total, online, offline, in_vorbereitung }, devices: [...] }
        let devicesCount = 0;
        if (devicesResult?.success && devicesResult?.data) {
          console.log('[CustomerDetails] devicesResult.data.summary:', devicesResult.data.summary);
          console.log('[CustomerDetails] devicesResult.data.devices:', devicesResult.data.devices?.length);
          
          if (devicesResult.data.summary?.total !== undefined) {
            devicesCount = devicesResult.data.summary.total;
            console.log('[CustomerDetails] Using summary.total:', devicesCount);
          } else if (Array.isArray(devicesResult.data.devices)) {
            devicesCount = devicesResult.data.devices.length;
            console.log('[CustomerDetails] Using devices.length:', devicesCount);
          }
        } else {
          console.log('[CustomerDetails] devicesResult check failed - success:', devicesResult?.success, 'data:', devicesResult?.data);
        }
        
        console.log('[CustomerDetails] Final devices count:', devicesCount);
        
        // Load locations count (if applicable)
        // Check if company name contains "Europcar" (case-insensitive)
        let locationsCount = 0;
        if (customer.company && customer.company.toLowerCase().includes('europcar')) {
          console.log('[CustomerDetails] Loading locations for Europcar customer');
          const locationsResult = await apiCall('/api/portal/customer-data/europcar-stations');
          console.log('[CustomerDetails] Locations API result:', locationsResult);
          locationsCount = locationsResult?.data?.stations?.length || 0;
          console.log('[CustomerDetails] Locations count:', locationsCount);
        } else {
          console.log('[CustomerDetails] Skipping locations - not Europcar customer:', customer.company);
        }
        
        setCustomerStats({
          devices: devicesCount,
          locations: locationsCount,
          employees: 0, // TODO: Implement when employees feature is added
          licenses: 0  // TODO: Implement when licenses feature is added
        });
      } catch (error) {
        console.error('Error loading customer stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadCustomerStats();
  }, [customer.company, apiCall]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await apiCall(`/api/portal/users/${customer.email}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (result.success) {
        toast.success('Kundendaten erfolgreich aktualisiert');
        setIsEditing(false);
        if (onUpdate) {
          onUpdate(); // Refresh customer list
        }
      } else {
        toast.error(result.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: customer.name,
      company: customer.company,
      email: customer.email
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    
    const token = localStorage.getItem('portal_token');
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
    
    if (!token) {
      toast.error('Nicht authentifiziert');
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/portal/users/${customer.email}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      let data = null;
      if (responseText && responseText.trim().length > 0) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      }

      if (response.ok) {
        toast.success('Kunde erfolgreich gelöscht');
        setShowDeleteConfirm(false);
        if (onDelete) {
          onDelete(customer.email);
        }
        onClose();
      } else {
        const errorMsg = data?.detail || data?.message || `Fehler ${response.status}`;
        toast.error(`Löschen fehlgeschlagen: ${errorMsg}`);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Fehler: ${error.message}`);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // Safe render wrapper
  try {
    return (
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          // Only close if clicking the backdrop, not the modal content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className={`w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-[#2a2a2a] border-none' : 'bg-white border border-gray-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex justify-between items-center p-6 border-b ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'
            }`}>
              <Building2 className="h-8 w-8 text-[#c00000]" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {customer.company}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Kundendetails & Statistiken
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Delete Button (Admin only, not in edit mode) */}
            {isAdmin && !isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
                title="Kunde löschen"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : null}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <Card className={`p-6 rounded-2xl ${
            theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Basisinformationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Building2 className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Firma</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border border-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  ) : (
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {customer.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>E-Mail</p>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border border-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  ) : (
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {customer.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Kontaktperson</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border border-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  ) : (
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {customer.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Status</p>
                  <p className={`text-sm font-semibold ${customer.active ? 'text-green-500' : 'text-red-500'}`}>
                    {customer.active ? 'Aktiv' : 'Inaktiv'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Statistics Grid */}
          <div>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Übersicht
            </h3>
            {loadingStats ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Devices */}
                <Card className={`p-4 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
                }`}>
                  <Monitor className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {customerStats.devices}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Geräte</p>
                </Card>

                {/* Locations */}
                <Card className={`p-4 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
                }`}>
                  <MapPin className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {customerStats.locations}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Standorte</p>
                </Card>

                {/* Licenses */}
                <Card className={`p-4 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
                }`}>
                  <Package className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {customerStats.licenses}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Lizenzen</p>
                </Card>

                {/* Users */}
                <Card className={`p-4 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-white border border-gray-100'
                }`}>
                  <Users className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {customerStats.employees}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Mitarbeiter</p>
                </Card>
              </div>
            )}
          </div>

          {/* Historie/Log Section */}
          <Card className={`p-6 rounded-2xl ${
            theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Historie & Informationen
            </h3>
            <div className="space-y-3">
              {customer.created_at && (
                <div className="flex items-center gap-3">
                  <Calendar className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Kunde angelegt
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(customer.created_at).toLocaleString('de-DE', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              {customer.updated_at && (
                <div className="flex items-center gap-3">
                  <Clock className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Letzte Änderung
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(customer.updated_at).toLocaleString('de-DE', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                      {customer.updated_by && ` von ${customer.updated_by}`}
                    </p>
                  </div>
                </div>
              )}

              {!customer.created_at && !customer.updated_at && (
                <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Keine Historie verfügbar
                </p>
              )}
            </div>
          </Card>

          {/* Placeholder for future content */}
          <Card className={`p-8 rounded-2xl text-center ${
            theme === 'dark' ? 'bg-[#1a1a1a] border-none' : 'bg-gray-50 border border-gray-100'
          }`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Weitere Informationen werden hier nach und nach hinzugefügt...
            </p>
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
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#c00000] hover:bg-[#a00000] text-white px-6 py-3 rounded-lg flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Speichern...' : 'Speichern'}</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className="bg-[#c00000] hover:bg-[#a00000] text-white px-6 py-3 rounded-lg"
              >
                Schließen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <Card className={`w-full max-w-md rounded-2xl ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kunde löschen?
              </h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Möchten Sie den Kunden <span className="font-semibold">{customer.company}</span> wirklich löschen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className={`${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Wird gelöscht...' : 'Löschen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
  } catch (renderError) {
    console.error('CustomerDetailsModal render error:', renderError);
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-red-100 border-4 border-red-500 rounded-2xl p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-red-900 mb-4">❌ Modal Render Error</h2>
          <p className="text-red-800 mb-4">{renderError.message}</p>
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }
};

export default CustomerDetailsModal;
