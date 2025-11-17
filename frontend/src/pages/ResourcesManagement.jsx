import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Download, FolderOpen, FileText, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';

const ResourcesManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('anleitungen');
  const [selectedFile, setSelectedFile] = useState(null);

  const CATEGORY_LABELS = {
    anleitungen: '📖 Anleitungen',
    treiber: '💾 Treiber',
    tools: '🔧 Tools',
    troubleshooting: '🔍 Troubleshooting'
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/resources/categories');
      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          setCategories(apiResponse.categories || []);
        }
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Fehler beim Laden der Ressourcen');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', selectedCategory);

      const result = await apiCall('/api/resources/upload', {
        method: 'POST',
        body: formData,
        skipContentType: true
      });

      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          toast.success('Datei erfolgreich hochgeladen');
          setSelectedFile(null);
          // Reset file input
          document.getElementById('file-input').value = '';
          // Refresh resources
          fetchResources();
        } else {
          toast.error(apiResponse.message || 'Upload fehlgeschlagen');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filePath, fileName) => {
    if (!window.confirm(`Möchten Sie "${fileName}" wirklich löschen?`)) {
      return;
    }

    try {
      const result = await apiCall(`/api/resources/file?file_path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      });

      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          toast.success('Datei gelöscht');
          fetchResources();
        } else {
          toast.error('Löschen fehlgeschlagen');
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Ressourcenverwaltung</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Verwalten Sie Anleitungen, Treiber, Tools und Troubleshooting-Ressourcen
          </p>
        </div>

        {/* Upload Section */}
        <div className={`p-6 rounded-lg mb-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'}`}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#c00000]" />
            Datei hochladen
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Category Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Kategorie
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#0a0a0a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* File Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Datei auswählen
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#0a0a0a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Upload Button */}
            <div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Hochladen
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedFile && (
            <div className={`mt-4 p-3 rounded ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
              <p className="text-sm">
                <span className="font-medium">Ausgewählte Datei:</span> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}
        </div>

        {/* Resources List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[#c00000]" />
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.category}
                className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-[#c00000]" />
                    {category.display_name}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {category.count} {category.count === 1 ? 'Datei' : 'Dateien'}
                  </span>
                </div>

                {category.files && category.files.length > 0 ? (
                  <div className="space-y-2">
                    {category.files.map((file, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'bg-[#0a0a0a] hover:bg-[#2a2a2a]'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatFileSize(file.size)} • {file.modified ? new Date(file.modified).toLocaleDateString('de-DE') : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={file.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-colors hover:bg-blue-600 hover:text-white"
                            title="Herunterladen"
                          >
                            <Download className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => handleDelete(file.path, file.name)}
                            className="p-2 rounded-lg transition-colors hover:bg-red-600 hover:text-white"
                            title="Löschen"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Keine Dateien in dieser Kategorie
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={fetchResources}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResourcesManagement;
