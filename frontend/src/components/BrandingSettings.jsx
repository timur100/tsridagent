import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Upload, Trash2, Image as ImageIcon, Building2, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

const BrandingSettings = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [logoUrlDark, setLogoUrlDark] = useState(null);
  const [logoUrlLight, setLogoUrlLight] = useState(null);
  const [companyName, setCompanyName] = useState('TSRID');
  const [uploadingDark, setUploadingDark] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const result = await apiCall('/api/branding/logo');
      if (result.success && result.data) {
        setLogoUrlDark(result.data.logo_url_dark);
        setLogoUrlLight(result.data.logo_url_light);
        setCompanyName(result.data.company_name || 'TSRID');
        setTempName(result.data.company_name || 'TSRID');
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const handleFileUpload = async (event, logoType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur PNG, JPG und SVG Dateien erlaubt');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß (max 5MB)');
      return;
    }

    if (logoType === 'dark') {
      setUploadingDark(true);
    } else {
      setUploadingLight(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('logo_type', logoType);

      // Get token from localStorage
      const token = localStorage.getItem('portal_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Keine Authentifizierung gefunden. Bitte neu anmelden.');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/branding/logo/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (logoType === 'dark') {
          setLogoUrlDark(result.logo_url);
        } else {
          setLogoUrlLight(result.logo_url);
        }
        toast.success(`Logo für ${logoType === 'dark' ? 'Dark Mode' : 'Light Mode'} erfolgreich hochgeladen`);
      } else {
        const errorMsg = result.detail || result.message || 'Fehler beim Hochladen';
        toast.error(errorMsg);
        console.error('Upload error:', result);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Fehler beim Hochladen: ' + error.message);
    } finally {
      if (logoType === 'dark') {
        setUploadingDark(false);
      } else {
        setUploadingLight(false);
      }
    }
  };

  const handleDeleteLogo = async (logoType) => {
    if (!window.confirm(`Möchten Sie das Logo für ${logoType === 'dark' ? 'Dark Mode' : 'Light Mode'} wirklich löschen?`)) {
      return;
    }

    try {
      const result = await apiCall(`/api/branding/logo?logo_type=${logoType}`, {
        method: 'DELETE'
      });

      if (result.success) {
        if (logoType === 'dark') {
          setLogoUrlDark(null);
        } else {
          setLogoUrlLight(null);
        }
        toast.success(`Logo für ${logoType === 'dark' ? 'Dark Mode' : 'Light Mode'} gelöscht`);
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleSaveCompanyName = async () => {
    try {
      const result = await apiCall('/api/branding/company-name', {
        method: 'POST',
        body: JSON.stringify({ company_name: tempName })
      });

      if (result.success) {
        setCompanyName(tempName);
        setEditingName(false);
        toast.success('Firmenname aktualisiert');
      }
    } catch (error) {
      console.error('Error updating company name:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const LogoUploadSection = ({ logoUrl, logoType, uploading, onUpload, onDelete }) => {
    const isDark = logoType === 'dark';
    const icon = isDark ? <Moon className="inline h-5 w-5 mr-2" /> : <Sun className="inline h-5 w-5 mr-2" />;
    const title = isDark ? 'Logo für Dark Mode (roter Hintergrund)' : 'Logo für Light Mode (weißer Hintergrund)';
    const bgDemo = isDark ? 'bg-gradient-to-r from-[#c00000] to-[#a00000]' : 'bg-white border-2';

    return (
      <div>
        <label className={`block font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {icon}
          {title}
        </label>

        {logoUrl ? (
          <div className="space-y-4">
            {/* Preview mit Hintergrund-Simulation */}
            <div className={`p-6 rounded-lg ${bgDemo}`}>
              <div className="flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt={`Company Logo ${logoType}`} 
                  className="max-h-16 max-w-xs object-contain"
                />
              </div>
              <p className={`text-xs text-center mt-2 ${isDark ? 'text-red-100' : 'text-gray-500'}`}>
                Vorschau: So wird das Logo angezeigt
              </p>
            </div>
            
            <div className="flex gap-3">
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={(e) => onUpload(e, logoType)}
                  className="hidden"
                  disabled={uploading}
                />
                <div className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                } text-white`}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Wird hochgeladen...' : 'Neues Logo hochladen'}
                </div>
              </label>
              
              <Button
                onClick={() => onDelete(logoType)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className={`p-8 border-2 border-dashed rounded-lg text-center ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <ImageIcon className={`h-12 w-12 mx-auto mb-3 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Kein Logo für {isDark ? 'Dark Mode' : 'Light Mode'} hochgeladen
              </p>
              
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={(e) => onUpload(e, logoType)}
                  className="hidden"
                  disabled={uploading}
                />
                <div className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#c00000] hover:bg-[#a00000] cursor-pointer'
                } text-white`}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Wird hochgeladen...' : 'Logo hochladen'}
                </div>
              </label>
            </div>
            
            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Erlaubte Formate: PNG, JPG, SVG | Maximale Größe: 5MB
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
      <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Firmenbranding
      </h3>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className={`block font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Building2 className="inline h-5 w-5 mr-2" />
            Firmenname
          </label>
          
          {editingName ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className={`flex-1 px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <Button
                onClick={handleSaveCompanyName}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                Speichern
              </Button>
              <Button
                onClick={() => {
                  setEditingName(false);
                  setTempName(companyName);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Abbrechen
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {companyName}
              </span>
              <Button
                onClick={() => setEditingName(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Bearbeiten
              </Button>
            </div>
          )}
        </div>

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Dark Mode Logo */}
        <LogoUploadSection
          logoUrl={logoUrlDark}
          logoType="dark"
          uploading={uploadingDark}
          onUpload={handleFileUpload}
          onDelete={handleDeleteLogo}
        />

        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Light Mode Logo */}
        <LogoUploadSection
          logoUrl={logoUrlLight}
          logoType="light"
          uploading={uploadingLight}
          onUpload={handleFileUpload}
          onDelete={handleDeleteLogo}
        />
      </div>
    </Card>
  );
};

export default BrandingSettings;
