import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Check, X, AlertCircle, Monitor, 
  Plus, Trash2, TrendingUp, Download, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Card } from './ui/card';

const HardwareLicenseManagement = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  // Hardware Licenses States
  const [hardwareOverview, setHardwareOverview] = useState(null);
  const [hardwareLicenses, setHardwareLicenses] = useState([]);
  const [hardwareValidation, setHardwareValidation] = useState(null);
  const [showHardwareImportModal, setShowHardwareImportModal] = useState(false);
  const [showHardwareValidationModal, setShowHardwareValidationModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importText, setImportText] = useState('');
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
  const [importResult, setImportResult] = useState(null);
  const [hardwareFilter, setHardwareFilter] = useState('all'); // all, assigned, unassigned
  const [hardwareSearch, setHardwareSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch functions
  const fetchHardwareOverview = async () => {
    try {
      const result = await apiCall('/api/hardware-licenses/overview');
      
      let overviewData = null;
      if (result.success && result.data) {
        if (result.data.data) {
          overviewData = result.data.data;
        } else {
          overviewData = result.data;
        }
      }
      
      if (overviewData) {
        setHardwareOverview(overviewData);
      }
    } catch (error) {
      console.error('Error fetching hardware overview:', error);
    }
  };

  const fetchHardwareLicenses = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/hardware-licenses/list');
      
      let licenses = null;
      if (result.success && result.data) {
        if (result.data.data && result.data.data.licenses) {
          licenses = result.data.data.licenses;
        } else if (result.data.licenses) {
          licenses = result.data.licenses;
        }
      }
      
      if (licenses) {
        setHardwareLicenses(licenses);
      }
    } catch (error) {
      console.error('Error fetching hardware licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHardwareValidation = async () => {
    try {
      const result = await apiCall('/api/hardware-licenses/validation');
      
      let validationData = null;
      if (result.success && result.data) {
        if (result.data.data) {
          validationData = result.data.data;
        } else {
          validationData = result.data;
        }
      }
      
      if (validationData) {
        setHardwareValidation(validationData);
        setShowHardwareValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching hardware validation:', error);
      toast.error('Fehler beim Laden der Hardware-Validierung');
    }
  };

  const handleHardwareImport = async () => {
    if (!activationDate) {
      toast.error('Bitte geben Sie ein Aktivierungsdatum ein');
      return;
    }

    if (!importFile && !importText) {
      toast.error('Bitte laden Sie eine Datei hoch oder fügen Sie Text ein');
      return;
    }

    try {
      const formData = new FormData();
      
      if (importFile) {
        formData.append('file', importFile);
      }
      
      if (importText) {
        formData.append('text_data', importText);
      }
      
      formData.append('activation_date', activationDate);

      const result = await apiCall('/api/hardware-licenses/import', {
        method: 'POST',
        body: formData,
        isFormData: true
      });

      let importData = null;
      if (result.success && result.data) {
        if (result.data.data) {
          importData = result.data.data;
        } else {
          importData = result.data;
        }
      }

      if (importData) {
        setImportResult(importData);
        toast.success(result.message || 'Import erfolgreich');
        
        // Refresh data
        fetchHardwareOverview();
        fetchHardwareLicenses();
        
        // Reset form
        setImportFile(null);
        setImportText('');
        setActivationDate(new Date().toISOString().split('T')[0]);
      } else {
        toast.error(result.error || 'Fehler beim Import');
      }
    } catch (error) {
      console.error('Error importing hardware licenses:', error);
      toast.error('Fehler beim Import der Hardware-Lizenzen');
    }
  };

  const handleRenewHardwareLicense = async (serialNumber) => {
    if (!window.confirm('Möchten Sie diese Lizenz um 12 Monate verlängern?')) return;

    try {
      const result = await apiCall('/api/hardware-licenses/renew', {
        method: 'POST',
        body: JSON.stringify({
          serial_number: serialNumber,
          months: 12
        })
      });

      if (result.success) {
        toast.success('Lizenz erfolgreich verlängert');
        fetchHardwareOverview();
        fetchHardwareLicenses();
      } else {
        toast.error(result.error || 'Fehler beim Verlängern der Lizenz');
      }
    } catch (error) {
      console.error('Error renewing hardware license:', error);
      toast.error('Fehler beim Verlängern der Lizenz');
    }
  };

  const handleDeleteHardwareLicense = async (serialNumber) => {
    if (!window.confirm('Möchten Sie diese Hardware-Lizenz wirklich löschen?')) return;

    try {
      const result = await apiCall(`/api/hardware-licenses/${encodeURIComponent(serialNumber)}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Hardware-Lizenz erfolgreich gelöscht');
        fetchHardwareOverview();
        fetchHardwareLicenses();
      } else {
        toast.error(result.error || 'Fehler beim Löschen der Lizenz');
      }
    } catch (error) {
      console.error('Error deleting hardware license:', error);
      toast.error('Fehler beim Löschen der Lizenz');
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchHardwareOverview();
    fetchHardwareLicenses();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Hardware-Lizenzen (Scanner)
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwaltung von Desko und TSRID Scanner-Lizenzen - 36 Monate Vertrag, jährliche Verlängerung
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowHardwareImportModal(true);
                setImportResult(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Get token from localStorage (correct key: portal_token)
                  const token = localStorage.getItem('portal_token');
                  if (!token) {
                    toast.error('Nicht angemeldet');
                    return;
                  }
                  
                  // Fetch with token
                  const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hardware-licenses/export`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `hardware_licenses_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    toast.success('Export erfolgreich heruntergeladen');
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Export failed:', errorData);
                    toast.error(`Export fehlgeschlagen: ${errorData.detail || 'Unbekannter Fehler'}`);
                  }
                } catch (error) {
                  console.error('Export error:', error);
                  toast.error('Fehler beim Export');
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              onClick={fetchHardwareValidation}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Validierung
            </Button>
          </div>
        )}
      </div>

      {/* Hardware Statistics */}
      {hardwareOverview && (
        <div className="grid grid-cols-4 gap-4">
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {hardwareOverview.statistics?.total || 0}
                </p>
              </div>
              <Monitor className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zugewiesen</p>
                <p className={`text-2xl font-bold text-green-500`}>
                  {hardwareOverview.statistics?.assigned || 0}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ablaufend (30 Tage)</p>
                <p className={`text-2xl font-bold text-orange-500`}>
                  {hardwareOverview.statistics?.expiring_soon || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Abgelaufen</p>
                <p className={`text-2xl font-bold text-red-500`}>
                  {hardwareOverview.statistics?.expired || 0}
                </p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Hardware Licenses List */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Hardware-Lizenzen ({
              hardwareFilter === 'all' ? hardwareLicenses.length :
              hardwareFilter === 'assigned' ? hardwareLicenses.filter(l => l.device_id).length :
              hardwareLicenses.filter(l => !l.device_id).length
            })
          </h3>
          
          <div className="flex gap-2">
            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f3f4f6'}}>
              <button
                onClick={() => setHardwareFilter('all')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  hardwareFilter === 'all'
                    ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow'
                    : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Alle ({hardwareLicenses.length})
              </button>
              <button
                onClick={() => setHardwareFilter('assigned')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  hardwareFilter === 'assigned'
                    ? theme === 'dark' ? 'bg-green-600 text-white' : 'bg-white text-green-600 shadow'
                    : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Zugewiesen ({hardwareLicenses.filter(l => l.device_id).length})
              </button>
              <button
                onClick={() => setHardwareFilter('unassigned')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  hardwareFilter === 'unassigned'
                    ? theme === 'dark' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 shadow'
                    : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nicht zugewiesen ({hardwareLicenses.filter(l => !l.device_id).length})
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                value={hardwareSearch}
                onChange={(e) => setHardwareSearch(e.target.value)}
                placeholder="Suche Seriennummer oder Gerät..."
                className={`pl-10 pr-4 py-2 border rounded-lg w-64 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400'}`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Laden...</p>
          </div>
        ) : hardwareLicenses.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Noch keine Hardware-Lizenzen importiert
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Seriennummer</th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Scanner-Typ</th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gerät</th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ablaufdatum</th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {hardwareLicenses
                  .filter(license => {
                    // Apply filter
                    if (hardwareFilter === 'assigned' && !license.device_id) return false;
                    if (hardwareFilter === 'unassigned' && license.device_id) return false;
                    
                    // Apply search
                    if (hardwareSearch) {
                      const searchLower = hardwareSearch.toLowerCase();
                      const matchSerial = license.serial_number?.toLowerCase().includes(searchLower);
                      const matchDevice = license.device_id?.toLowerCase().includes(searchLower);
                      const matchStation = license.station_name?.toLowerCase().includes(searchLower);
                      const matchLocation = license.locationcode?.toLowerCase().includes(searchLower);
                      return matchSerial || matchDevice || matchStation || matchLocation;
                    }
                    
                    return true;
                  })
                  .map((license) => {
                    const expiryDate = license.expiry_date ? new Date(license.expiry_date) : null;
                    const daysUntilExpiry = expiryDate ? Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <tr key={license.license_id} className={theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {license.serial_number}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            license.scanner_type === 'Desko' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {license.scanner_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {license.device_id ? (
                            <div>
                              <div>{license.station_name}</div>
                              <div className="text-xs text-gray-500">{license.locationcode}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Nicht zugewiesen</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            license.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {license.status}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {expiryDate ? (
                            <div>
                              <div>{expiryDate.toLocaleDateString('de-DE')}</div>
                              {daysUntilExpiry !== null && (
                                <div className={`text-xs ${
                                  daysUntilExpiry < 0 ? 'text-red-500' :
                                  daysUntilExpiry < 30 ? 'text-orange-500' :
                                  'text-gray-500'
                                }`}>
                                  {daysUntilExpiry < 0 ? 'Abgelaufen' : `${daysUntilExpiry} Tage`}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRenewHardwareLicense(license.serial_number)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Verlängern (12M)
                            </Button>
                            <Button
                              onClick={() => handleDeleteHardwareLicense(license.serial_number)}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Hardware Import Modal - Keeping it simple for now, can expand later */}
      {showHardwareImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Hardware-Lizenzen importieren
              </h2>
              <button 
                onClick={() => {
                  setShowHardwareImportModal(false);
                  setImportResult(null);
                  setImportFile(null);
                  setImportText('');
                }} 
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Aktivierungsdatum *
                    </label>
                    <input
                      type="date"
                      value={activationDate}
                      onChange={(e) => setActivationDate(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Laufzeit: 12 Monate (jährliche Verlängerung)
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      CSV-Datei hochladen
                    </label>
                    <input
                      type="file"
                      accept=".csv,.txt,.xlsx"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Format: NO., DESKO SERIAL, STATUS, PART
                    </p>
                  </div>

                  <div className={`text-center py-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    ODER
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Text einfügen (CSV-Format)
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="NO.,DESKO SERIAL,STATUS,PART&#10;1,201737 01567,ACTIVE,1&#10;2,201737 01568,ACTIVE,1"
                      rows={8}
                      className={`w-full px-4 py-2 border rounded-lg font-mono text-sm ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>

                  <Button
                    onClick={handleHardwareImport}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Importieren
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Import abgeschlossen
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {importResult.total_imported} Lizenzen verarbeitet
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card className={`p-4 text-center ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <p className="text-2xl font-bold text-green-500">{importResult.assigned?.length || 0}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zugewiesen</p>
                    </Card>
                    <Card className={`p-4 text-center ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <p className="text-2xl font-bold text-orange-500">{importResult.not_found?.length || 0}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nicht gefunden</p>
                    </Card>
                    <Card className={`p-4 text-center ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <p className="text-2xl font-bold text-red-500">{importResult.duplicates?.length || 0}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Duplikate</p>
                    </Card>
                  </div>

                  <Button
                    onClick={() => {
                      setShowHardwareImportModal(false);
                      setImportResult(null);
                      setImportFile(null);
                      setImportText('');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Schließen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hardware Validation Modal */}
      {showHardwareValidationModal && hardwareValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Hardware-Lizenz Validierung
              </h2>
              <button onClick={() => setShowHardwareValidationModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                  <p className="text-2xl font-bold">{hardwareValidation.total_devices || 0}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt Geräte</p>
                </Card>
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                  <p className="text-2xl font-bold text-green-500">{hardwareValidation.with_license || 0}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mit Lizenz</p>
                </Card>
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                  <p className="text-2xl font-bold text-orange-500">{hardwareValidation.without_license || 0}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ohne Lizenz</p>
                </Card>
              </div>

              {hardwareValidation.devices_without_license && hardwareValidation.devices_without_license.length > 0 && (
                <div>
                  <h3 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Geräte ohne Hardware-Lizenz ({hardwareValidation.devices_without_license.length})
                  </h3>
                  <div className={`max-h-96 overflow-y-auto ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'} rounded-lg`}>
                    <table className="w-full">
                      <thead className="sticky top-0" style={{backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb'}}>
                        <tr className={theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                          <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gerät-ID</th>
                          <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standort</th>
                          <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>SN-SC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hardwareValidation.devices_without_license.map((device, idx) => (
                          <tr key={idx} className={theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                            <td className={`py-2 px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{device.device_id}</td>
                            <td className={`py-2 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {device.station_name} ({device.locationcode})
                            </td>
                            <td className={`py-2 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{device.sn_sc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button onClick={() => setShowHardwareValidationModal(false)} className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HardwareLicenseManagement;
