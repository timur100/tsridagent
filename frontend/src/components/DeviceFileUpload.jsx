import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Upload, File, CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const DeviceFileUpload = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  // Debug: Log when uploadResults changes
  useEffect(() => {
    console.log('uploadResults state changed:', uploadResults);
  }, [uploadResults]);

  const loadStats = async () => {
    try {
      const response = await apiCall('/api/portal/device-files/upload-stats');
      if (response.success && response.data) {
        setStats(response.data.stats);
      } else {
        console.error('Fehler beim Laden der Statistiken:', response);
        // Set empty stats to still show the component
        setStats({
          total: 0,
          with_tvid: 0,
          without_tvid: 0,
          coverage_percentage: 0
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      // Set empty stats to still show the component
      setStats({
        total: 0,
        with_tvid: 0,
        without_tvid: 0,
        coverage_percentage: 0
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFilesSelected(selectedFiles);
  };

  const handleFilesSelected = (selectedFiles) => {
    // Filter nur .txt Dateien
    const txtFiles = selectedFiles.filter(file => file.name.endsWith('.txt'));
    
    if (txtFiles.length !== selectedFiles.length) {
      toast.error('Nur .txt Dateien sind erlaubt');
    }

    if (txtFiles.length > 200) {
      toast.error('Maximum 200 Dateien erlaubt');
      setFiles(txtFiles.slice(0, 200));
    } else {
      setFiles(txtFiles);
    }
    
    // Reset previous results
    setUploadResults(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Bitte wählen Sie Dateien aus');
      return;
    }

    setUploading(true);
    setUploadResults(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await apiCall(
        '/api/portal/device-files/batch-upload',
        {
          method: 'POST',
          body: formData,
          isFormData: true
        }
      );

      console.log('Upload response:', response);

      if (response.success && response.data) {
        setUploadResults(response.data.results);
        toast.success(response.data.message || 'Upload erfolgreich');
        
        // Reload stats after successful upload
        await loadStats();
        
        // Don't clear file selection - let user see results
        // setFiles([]);
      } else {
        // Show error from response
        const errorMsg = response.data?.message || response.error || 'Upload fehlgeschlagen';
        toast.error(errorMsg);
        console.error('Upload error:', response);
      }
    } catch (error) {
      toast.error(`Upload fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
      console.error('Upload exception:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    setUploadResults(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'skipped':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'not_found':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'skipped':
        return 'text-yellow-500';
      case 'not_found':
        return 'text-orange-500';
      case 'error':
        return 'text-red-500';
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Card - Always show */}
      <Card className={`p-6 ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none' 
          : 'bg-white border border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          TeamViewer ID Status
        </h3>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Geräte Gesamt
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.total}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Mit TVID
              </p>
              <p className="text-2xl font-bold mt-1 text-green-500">
                {stats.with_tvid}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Ohne TVID
              </p>
              <p className="text-2xl font-bold mt-1 text-orange-500">
                {stats.without_tvid}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Abdeckung
              </p>
              <p className="text-2xl font-bold mt-1 text-blue-500">
                {stats.coverage_percentage}%
              </p>
            </div>
          </div>
        ) : (
          <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Lade Statistiken...</p>
          </div>
        )}
      </Card>

      {/* Upload Area */}
      <Card className={`p-6 ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none' 
          : 'bg-white border border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Gerätedateien hochladen
        </h3>

        {/* Info Banner */}
        <div className={`mb-4 p-4 rounded-lg border-l-4 border-blue-500 ${
          theme === 'dark' 
            ? 'bg-blue-900/10 border border-blue-800' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                <strong>Hinweis:</strong> Laden Sie TXT-Dateien mit TeamViewer-IDs hoch. 
                Der Dateiname muss der Geräte-ID entsprechen (z.B. AAHC01-01.txt). 
                Nur fehlende Informationen werden hinzugefügt, vorhandene Daten werden nicht überschrieben.
              </p>
            </div>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? 'border-[#c00000] bg-red-50/10'
              : theme === 'dark'
              ? 'border-gray-700 hover:border-gray-600'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className={`h-12 w-12 mx-auto mb-4 ${
            isDragging
              ? 'text-[#c00000]'
              : theme === 'dark'
              ? 'text-gray-500'
              : 'text-gray-400'
          }`} />
          
          <p className={`text-lg font-medium mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Dateien hierher ziehen oder klicken zum Auswählen
          </p>
          
          <p className={`text-sm mb-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Bis zu 200 TXT-Dateien gleichzeitig
          </p>

          <input
            type="file"
            multiple
            accept=".txt"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#c00000] hover:bg-[#a00000] text-white'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Wird hochgeladen...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Dateien auswählen
              </>
            )}
          </label>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {files.length} Datei(en) ausgewählt
              </p>
              <button
                onClick={handleClearFiles}
                className={`text-sm font-medium ${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Auswahl löschen
              </button>
            </div>
            
            <div className={`max-h-40 overflow-y-auto rounded-lg p-3 ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 py-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <File className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <span className={`text-xs ml-auto ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`mt-4 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#c00000] hover:bg-[#a00000] text-white'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 inline animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                `${files.length} Datei(en) hochladen`
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Upload Results */}
      {uploadResults && (
        <Card className={`p-6 ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none' 
            : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Ergebnisse
          </h3>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Gesamt
              </p>
              <p className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {uploadResults.total}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className="text-xs text-green-500">Erfolgreich</p>
              <p className="text-xl font-bold text-green-500">
                {uploadResults.success}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className="text-xs text-yellow-500">Übersprungen</p>
              <p className="text-xl font-bold text-yellow-500">
                {uploadResults.skipped}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className="text-xs text-orange-500">Nicht gefunden</p>
              <p className="text-xl font-bold text-orange-500">
                {uploadResults.not_found}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
            }`}>
              <p className="text-xs text-red-500">Fehler</p>
              <p className="text-xl font-bold text-red-500">
                {uploadResults.error}
              </p>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className={`rounded-lg overflow-hidden border ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className={`sticky top-0 ${
                  theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Dateiname
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Geräte-ID
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Nachricht
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'
                }`}>
                  {uploadResults.details.map((detail, index) => (
                    <tr key={index} className={
                      theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                    }>
                      <td className="px-4 py-3">
                        {getStatusIcon(detail.status)}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {detail.filename}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {detail.device_id || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${getStatusColor(detail.status)}`}>
                        {detail.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeviceFileUpload;
