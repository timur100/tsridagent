import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/card';
import LocationsTabEnhanced from '../components/LocationsTabEnhanced';
import LocationModal from '../components/LocationModal';
import { 
  ArrowLeft, 
  Users, 
  Server, 
  HardDrive, 
  TrendingUp,
  Edit2,
  Save,
  X,
  MapPin,
  Wifi,
  WifiOff,
  Settings,
  ScanLine,
  CheckCircle,
  HelpCircle,
  XCircle,
  ShoppingCart,
  AlertCircle,
  Calendar,
  Clock,
  Building2,
  Upload,
  FileText,
  Eye,
  Trash2,
  Download,
  Plus,
  Map,
  Phone,
  Mail,
  User,
  Edit,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantDetailPage = ({ tenantId, onBack }) => {
  const { theme } = useTheme();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditing, setIsEditing] = useState(false);
  
  // Document upload states
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('contract');
  const [uploadDescription, setUploadDescription] = useState('');
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Location states
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationFormData, setLocationFormData] = useState({
    location_code: '',
    station_name: '',
    postal_code: '',
    city: '',
    street: '',
    state: '',
    manager: '',
    phone: '',
    phone_internal: '',
    email: '',
    main_type: 'A',
    id_checker: '',
    switch_info: '',
    port: '',
    it_comment: '',
    tsr_remarks: '',
    sn_pc: '',
    sn_sc: '',
    tv_id: '',
    latitude: '',
    longitude: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'overview', label: 'Übersicht' },
    { id: 'subscription', label: 'Vertrag & Subscription' },
    { id: 'locations', label: 'Standorte' },
    { id: 'branding', label: 'Branding' },
    { id: 'statistics', label: 'Statistik' },
    { id: 'billing', label: 'Abrechnung' }
  ];

  useEffect(() => {
    fetchTenantDetails();
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'subscription') {
      fetchDocuments();
    }
  }, [activeTab, tenantId]);

  useEffect(() => {
    if (activeTab === 'locations') {
      fetchLocations();
    }
  }, [activeTab, tenantId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setTenant(data);
      } else {
        console.error('Tenant not found');
        if (onBack) onBack();
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/documents/tenant/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type) && 
          !file.name.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
        toast.error('Ungültiger Dateityp. Erlaubt: PDF, DOC, DOCX, XLS, XLSX');
        return;
      }

      // Check file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Datei ist zu groß. Maximum: 50MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('tenant_id', tenantId);
    formData.append('category', uploadCategory);
    if (uploadDescription) {
      formData.append('description', uploadDescription);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Dokument erfolgreich hochgeladen');
        setSelectedFile(null);
        setUploadDescription('');
        document.getElementById('file-input').value = '';
        fetchDocuments();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/documents/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download gestartet');
      } else {
        toast.error('Download fehlgeschlagen');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download fehlgeschlagen');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Dokument gelöscht');
        fetchDocuments();
      } else {
        toast.error('Löschen fehlgeschlagen');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      contract: 'Vertrag',
      invoice: 'Rechnung',
      other: 'Sonstiges'
    };
    return labels[category] || category;
  };

  // Location Management Functions
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-locations/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Fehler beim Laden der Standorte');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleLocationSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingLocation
        ? `${BACKEND_URL}/api/tenant-locations/${tenantId}/${editingLocation.location_id}`
        : `${BACKEND_URL}/api/tenant-locations/${tenantId}`;
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      // Clean up form data - remove empty strings
      const cleanData = Object.fromEntries(
        Object.entries(locationFormData).filter(([_, v]) => v !== '')
      );
      
      // Convert numeric fields
      if (cleanData.id_checker) cleanData.id_checker = parseInt(cleanData.id_checker);
      if (cleanData.latitude) cleanData.latitude = parseFloat(cleanData.latitude);
      if (cleanData.longitude) cleanData.longitude = parseFloat(cleanData.longitude);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanData)
      });

      if (response.ok) {
        toast.success(editingLocation ? 'Standort aktualisiert' : 'Standort erstellt');
        setShowLocationModal(false);
        setEditingLocation(null);
        resetLocationForm();
        fetchLocations();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Location save error:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleLocationEdit = (location) => {
    setEditingLocation(location);
    setLocationFormData({
      location_code: location.location_code || '',
      station_name: location.station_name || '',
      postal_code: location.postal_code || '',
      city: location.city || '',
      street: location.street || '',
      state: location.state || '',
      manager: location.manager || '',
      phone: location.phone || '',
      phone_internal: location.phone_internal || '',
      email: location.email || '',
      main_type: location.main_type || 'A',
      id_checker: location.id_checker?.toString() || '',
      switch_info: location.switch_info || '',
      port: location.port || '',
      it_comment: location.it_comment || '',
      tsr_remarks: location.tsr_remarks || '',
      sn_pc: location.sn_pc || '',
      sn_sc: location.sn_sc || '',
      tv_id: location.tv_id || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || ''
    });
    setShowLocationModal(true);
  };

  const handleLocationDelete = async (locationId) => {
    if (!window.confirm('Möchten Sie diesen Standort wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tenant-locations/${tenantId}/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Standort gelöscht');
        fetchLocations();
      } else {
        toast.error('Löschen fehlgeschlagen');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const resetLocationForm = () => {
    setLocationFormData({
      location_code: '',
      station_name: '',
      postal_code: '',
      city: '',
      street: '',
      state: '',
      manager: '',
      phone: '',
      phone_internal: '',
      email: '',
      main_type: 'A',
      id_checker: '',
      switch_info: '',
      port: '',
      it_comment: '',
      tsr_remarks: '',
      sn_pc: '',
      sn_sc: '',
      tv_id: '',
      latitude: '',
      longitude: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.inactive}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {tenant.display_name}
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {tenant.name}
            </p>
          </div>
          {getStatusBadge(tenant.status)}
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 ${
            isEditing
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
              : 'border border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" />
              Speichern
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Bearbeiten
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-300 hover:bg-[#2a2a2a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Benutzer
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.user_count}
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_users}
                    </p>
                  </div>
                  <Users className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Geräte
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.device_count}
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_devices}
                    </p>
                  </div>
                  <Server className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Standorte */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Standorte
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      5
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      von {tenant.limits.max_locations || 10}
                    </p>
                  </div>
                  <MapPin className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Online */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Online
                    </p>
                    <p className={`text-3xl font-bold text-green-500`}>
                      3
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Geräte aktiv
                    </p>
                  </div>
                  <Wifi className={`h-12 w-12 text-green-500`} />
                </div>
              </Card>

              {/* Offline */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Offline
                    </p>
                    <p className={`text-3xl font-bold text-red-500`}>
                      2
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Geräte inaktiv
                    </p>
                  </div>
                  <WifiOff className={`h-12 w-12 text-red-500`} />
                </div>
              </Card>

              {/* Scans Insgesamt */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Scans Insgesamt
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      1,234
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      diesen Monat
                    </p>
                  </div>
                  <ScanLine className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              {/* Korrekte Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Korrekte Scans
                    </p>
                    <p className={`text-3xl font-bold text-green-500`}>
                      1,180
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      95.6% Erfolgsrate
                    </p>
                  </div>
                  <CheckCircle className={`h-12 w-12 text-green-500`} />
                </div>
              </Card>

              {/* Unbekannte Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Unbekannte Scans
                    </p>
                    <p className={`text-3xl font-bold text-yellow-500`}>
                      38
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      3.1% der Scans
                    </p>
                  </div>
                  <HelpCircle className={`h-12 w-12 text-yellow-500`} />
                </div>
              </Card>

              {/* Fehlgeschlagene Scans */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fehlgeschlagene Scans
                    </p>
                    <p className={`text-3xl font-bold text-red-500`}>
                      16
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      1.3% der Scans
                    </p>
                  </div>
                  <XCircle className={`h-12 w-12 text-red-500`} />
                </div>
              </Card>

              {/* Bestellungen Offen */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Bestellungen Offen
                    </p>
                    <p className={`text-3xl font-bold text-blue-500`}>
                      7
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      in Bearbeitung
                    </p>
                  </div>
                  <ShoppingCart className={`h-12 w-12 text-blue-500`} />
                </div>
              </Card>

              {/* Tickets Offen */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tickets Offen
                    </p>
                    <p className={`text-3xl font-bold text-orange-500`}>
                      3
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      benötigen Aufmerksamkeit
                    </p>
                  </div>
                  <AlertCircle className={`h-12 w-12 text-orange-500`} />
                </div>
              </Card>

              {/* Vertragslaufzeit - Kombinierte Kachel */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Vertragslaufzeit
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-2xl font-bold text-blue-500`}>
                          45
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Tage bis Verlängerung
                        </p>
                      </div>
                      <div className={`h-10 w-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                      <div>
                        <p className={`text-2xl font-bold text-purple-500`}>
                          365
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          Tage bis Vertragsende
                        </p>
                      </div>
                    </div>
                  </div>
                  <Calendar className={`h-12 w-12 ml-4 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>
            </div>

            {/* Additional Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`p-6 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              }`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Ressourcen-Nutzung
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Benutzer</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.user_count} / {tenant.limits.max_users}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.user_count / tenant.limits.max_users) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Geräte</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.device_count} / {tenant.limits.max_devices}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.device_count / tenant.limits.max_devices) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Storage</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tenant.storage_used_gb} / {tenant.limits.max_storage_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#c00000] h-2 rounded-full"
                        style={{ width: `${(tenant.storage_used_gb / tenant.limits.max_storage_gb) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className={`p-6 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              }`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tenant-Informationen
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Domain</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.domain || '-'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Subscription Plan</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.subscription_plan}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Admin Email</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.contact.admin_email}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Erstellt</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(tenant.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Allgemeine Informationen - 3 Segmente */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Allgemeine Informationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Segment 1: Logo */}
                <div className={`flex flex-col items-center justify-center p-6 rounded-lg ${
                  theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                }`}>
                  <div className={`w-32 h-32 rounded-lg flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
                  } border-2 ${theme === 'dark' ? 'border-[#c00000]' : 'border-gray-200'}`}>
                    {tenant.logo ? (
                      <img src={tenant.logo} alt={tenant.display_name} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Building2 className={`w-16 h-16 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <p className={`text-lg font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.display_name}
                  </p>
                  <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tenant.name}
                  </p>
                </div>

                {/* Segment 2: Basis-Informationen */}
                <div className="space-y-4">
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Tenant-ID</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.name}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Domain</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.domain || '-'}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                    <div>
                      {getStatusBadge(tenant.status)}
                    </div>
                  </div>
                </div>

                {/* Segment 3: Weitere Informationen */}
                <div className="space-y-4">
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Subscription Plan</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.subscription_plan}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Erstellt am</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(tenant.created_at).toLocaleDateString('de-DE', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Branche</p>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {tenant.industry || 'Autovermietung'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Kontaktinformationen */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Kontaktinformationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Admin E-Mail</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contact.admin_email}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Support E-Mail</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contact.support_email || 'support@' + tenant.domain || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contact.phone || '+49 123 456789'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Fax</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contact.fax || '+49 123 456790'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Anschrift */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Anschrift
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Straße & Hausnummer</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.street || 'Musterstraße 123'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Adresszusatz</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.additional || '-'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>PLZ</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.postal_code || '12345'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Stadt</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.city || 'Berlin'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Bundesland</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.state || 'Berlin'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Land</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.address?.country || 'Deutschland'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Ansprechpartner */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Ansprechpartner
              </h3>
              <div className="space-y-6">
                {/* Hauptansprechpartner */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-700'}`}>
                    Hauptansprechpartner
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.primary?.name || 'Max Mustermann'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Position</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.primary?.position || 'Geschäftsführer'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>E-Mail</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.primary?.email || tenant.contact.admin_email}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.primary?.phone || '+49 123 456789'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technischer Ansprechpartner */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-700'}`}>
                    Technischer Ansprechpartner
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.technical?.name || 'Thomas Schmidt'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Position</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.technical?.position || 'IT-Leiter'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>E-Mail</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.technical?.email || 'tech@' + (tenant.domain || 'example.com')}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.technical?.phone || '+49 123 456791'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buchhaltung */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-700'}`}>
                    Buchhaltung
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.billing?.name || 'Anna Weber'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Position</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.billing?.position || 'Buchhalterin'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>E-Mail</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.billing?.email || 'billing@' + (tenant.domain || 'example.com')}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.contact_person?.billing?.phone || '+49 123 456792'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Technische Informationen */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Technische Informationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>API-Key</p>
                  <p className={`font-medium font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.api_key || '••••••••••••••••••••••••••••••••'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Webhook-URL</p>
                  <p className={`font-medium text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.webhook_url || 'https://' + (tenant.domain || 'example.com') + '/webhook'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Letzte Synchronisation</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.last_sync ? new Date(tenant.last_sync).toLocaleString('de-DE') : 'Nie'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Server-Region</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.server_region || 'EU-Central (Frankfurt)'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Notizen */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Notizen
              </h3>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {tenant.notes || 'Keine Notizen vorhanden.'}
                </p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Vertragsinformationen */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Vertragsinformationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Vertragsnummer</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contract?.number || 'V-2025-001'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Vertragsbeginn</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contract?.start_date ? new Date(tenant.contract.start_date).toLocaleDateString('de-DE') : '17.11.2024'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Vertragsende</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contract?.end_date ? new Date(tenant.contract.end_date).toLocaleDateString('de-DE') : '16.11.2025'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Kündigungsfrist</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.contract?.notice_period || '3 Monate'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zahlungsart</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.payment?.method || 'SEPA-Lastschrift'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zahlungsintervall</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.payment?.interval || 'Monatlich'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Umsatzsteuer-ID</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.tax?.vat_id || 'DE123456789'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Steuernummer</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.tax?.tax_number || '12/345/67890'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Subscription Details */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Subscription Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Aktueller Plan</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.subscription_plan}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Monatliche Kosten</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.subscription?.monthly_cost || '499,00 €'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nächste Abrechnung</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.subscription?.next_billing ? new Date(tenant.subscription.next_billing).toLocaleDateString('de-DE') : '01.12.2025'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Auto-Renewal</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.subscription?.auto_renewal ? 'Aktiviert' : 'Deaktiviert'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Document Management Section */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Dokumente
                </h3>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {documents.length} {documents.length === 1 ? 'Dokument' : 'Dokumente'}
                </span>
              </div>

              {/* Upload Area */}
              <div className={`mb-6 p-6 border-2 border-dashed rounded-lg ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-[#1f1f1f]' 
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex flex-col items-center gap-4">
                  <Upload className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  
                  <div className="text-center">
                    <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Dokument hochladen
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      PDF, Word, Excel (max. 50MB)
                    </p>
                  </div>

                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => document.getElementById('file-input').click()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark'
                        ? 'bg-[#c00000] text-white hover:bg-[#a00000]'
                        : 'bg-[#c00000] text-white hover:bg-[#a00000]'
                    }`}
                  >
                    Datei auswählen
                  </button>

                  {selectedFile && (
                    <div className="w-full mt-4">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#c00000]" />
                            <div>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {selectedFile.name}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              document.getElementById('file-input').value = '';
                            }}
                            className={`p-1 rounded hover:bg-red-100 ${
                              theme === 'dark' ? 'hover:bg-red-900/20' : ''
                            }`}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Kategorie
                            </label>
                            <select
                              value={uploadCategory}
                              onChange={(e) => setUploadCategory(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg text-sm ${
                                theme === 'dark'
                                  ? 'bg-[#1f1f1f] text-white border border-gray-600'
                                  : 'bg-white text-gray-900 border border-gray-300'
                              }`}
                            >
                              <option value="contract">Vertrag</option>
                              <option value="invoice">Rechnung</option>
                              <option value="other">Sonstiges</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium mb-1 ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Beschreibung (optional)
                            </label>
                            <input
                              type="text"
                              value={uploadDescription}
                              onChange={(e) => setUploadDescription(e.target.value)}
                              placeholder="z.B. Jahresvertrag 2025"
                              className={`w-full px-3 py-2 rounded-lg text-sm ${
                                theme === 'dark'
                                  ? 'bg-[#1f1f1f] text-white border border-gray-600 placeholder-gray-500'
                                  : 'bg-white text-gray-900 border border-gray-300 placeholder-gray-400'
                              }`}
                            />
                          </div>

                          <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              uploading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#c00000] hover:bg-[#a00000] text-white'
                            }`}
                          >
                            {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents List */}
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Keine Dokumente vorhanden
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className={`p-4 rounded-lg transition-all ${
                        theme === 'dark'
                          ? 'bg-[#1f1f1f] hover:bg-[#252525]'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-[#c00000]" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {doc.original_filename}
                              </p>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                doc.category === 'contract'
                                  ? 'bg-blue-100 text-blue-800'
                                  : doc.category === 'invoice'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {getCategoryLabel(doc.category)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {formatFileSize(doc.file_size)}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {new Date(doc.uploaded_at).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </p>
                              {doc.description && (
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(doc.document_id, doc.original_filename)}
                            className={`p-2 rounded-lg transition-all ${
                              theme === 'dark'
                                ? 'hover:bg-[#2a2a2a] text-gray-400 hover:text-white'
                                : 'hover:bg-white text-gray-600 hover:text-gray-900'
                            }`}
                            title="Herunterladen"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.document_id)}
                            className={`p-2 rounded-lg transition-all ${
                              theme === 'dark'
                                ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-500'
                                : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                            }`}
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Limits & Kontingente */}
            <Card className={`p-6 rounded-xl ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Limits & Kontingente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Max. Benutzer</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.limits.max_users}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Max. Geräte</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.limits.max_devices}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Max. Standorte</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.limits.max_locations || 10}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Max. Storage</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.limits.max_storage_gb} GB
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'locations' && (
          <>
            <LocationsTab
              theme={theme}
              locations={locations}
              loadingLocations={loadingLocations}
              onAddLocation={() => {
                resetLocationForm();
                setEditingLocation(null);
                setShowLocationModal(true);
              }}
              onEditLocation={handleLocationEdit}
              onDeleteLocation={handleLocationDelete}
            />
            <LocationModal
              theme={theme}
              show={showLocationModal}
              onClose={() => {
                setShowLocationModal(false);
                setEditingLocation(null);
                resetLocationForm();
              }}
              editing={editingLocation}
              formData={locationFormData}
              onChange={setLocationFormData}
              onSubmit={handleLocationSubmit}
            />
          </>
        )}

        {activeTab === 'branding' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Branding
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Konfigurieren Sie Logo, Farben und Corporate Identity für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'statistics' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Statistik
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Detaillierte Statistiken und Analysen für diesen Tenant.
            </p>
          </Card>
        )}

        {activeTab === 'billing' && (
          <Card className={`p-12 text-center rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
              : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Abrechnung
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Rechnungen, Zahlungshistorie und Abrechnungseinstellungen für diesen Tenant.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TenantDetailPage;
