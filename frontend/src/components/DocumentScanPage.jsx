import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, CheckCircle, XCircle, Loader, Camera, Image as ImageIcon, Info, AlertCircle } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const DocumentScanPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Bitte wählen Sie ein Dokument aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await apiCall('/api/document-scan/process', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set correct headers for FormData
      });

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Fehler beim Scannen des Dokuments');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError('Verbindungsfehler zum Scanner-Service');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, value, validity) => {
    if (!value) return null;
    
    return (
      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {label}
          </span>
          {validity !== undefined && (
            validity ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )
          )}
        </div>
        <p className={`text-base font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'scan', label: 'Scan', icon: Camera },
          { id: 'results', label: 'Ergebnisse', icon: FileText },
          { id: 'settings', label: 'Einstellungen', icon: Info }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Scan Tab */}
      {activeTab === 'scan' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📄 Dokumentenscan
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Scannen und verifizieren Sie Ausweisdokumente mit Regula Document Reader
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Dokument hochladen
              </h3>

              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  theme === 'dark' 
                    ? 'border-gray-600 hover:border-gray-500 bg-[#2a2a2a]' 
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="document-upload"
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={previewUrl} 
                        alt="Document Preview" 
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedFile?.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className={`text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Klicken Sie hier oder ziehen Sie ein Bild
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        PNG, JPG, JPEG (max. 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleScan}
                  disabled={!selectedFile || loading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    !selectedFile || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#c00000] hover:bg-[#a00000] text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Verarbeite...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      Dokument scannen
                    </>
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                  theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                }`}>
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                      Fehler
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Scan-Ergebnisse
              </h3>

              {result ? (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div className={`p-4 rounded-lg ${
                    result.overall_status === 'OK' 
                      ? theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                      : theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {result.overall_status === 'OK' ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <div>
                        <p className={`font-semibold ${
                          result.overall_status === 'OK'
                            ? theme === 'dark' ? 'text-green-400' : 'text-green-800'
                            : theme === 'dark' ? 'text-red-400' : 'text-red-800'
                        }`}>
                          {result.overall_status === 'OK' ? 'Dokument gültig' : 'Dokument ungültig'}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {result.document_type || 'Unbekannter Dokumenttyp'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Text Fields */}
                  {result.text_fields && (
                    <div className="space-y-2">
                      <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Dokumentendaten
                      </h4>
                      {renderField('Dokumentnummer', result.text_fields.document_number, result.text_fields.document_number_valid)}
                      {renderField('Vorname', result.text_fields.first_name)}
                      {renderField('Nachname', result.text_fields.last_name)}
                      {renderField('Geburtsdatum', result.text_fields.birth_date)}
                      {renderField('Geschlecht', result.text_fields.sex)}
                      {renderField('Staatsangehörigkeit', result.text_fields.nationality)}
                      {renderField('Ablaufdatum', result.text_fields.expiry_date, result.text_fields.expiry_date_valid)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Scannen Sie ein Dokument, um Ergebnisse anzuzeigen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Scan-Historie
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Übersicht aller gescannten Dokumente
            </p>
          </div>

          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Historie - In Entwicklung</p>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Scanner-Einstellungen
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Konfigurieren Sie den Regula Document Reader
            </p>
          </div>

          <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="space-y-4">
              <div>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Regula Document Reader
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  API-Endpoint: <span className="font-mono">http://localhost:8080</span>
                </p>
              </div>

              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <Info className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                      Hinweis
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                      Der Regula Document Reader Service muss lokal laufen. 
                      Installieren Sie den Service mit: <code className="bg-black/20 px-1 rounded">pip install regula_documentreader_webclient</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentScanPage;
