import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Edit2, Save, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PDFManagement = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [mappings, setMappings] = useState({
    frei1: '',
    frei2: ''
  });

  useEffect(() => {
    loadPDFs();
    loadMappings();
  }, []);

  const loadPDFs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/list`);
      const data = await response.json();
      
      if (data.success) {
        setPdfs(data.pdfs);
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
      toast.error('Fehler beim Laden der PDFs');
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/mappings`);
      const data = await response.json();
      
      if (data.success) {
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Nur PDF-Dateien sind erlaubt');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('PDF wird hochgeladen...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('display_name', file.name.replace('.pdf', ''));

      console.log('Uploading PDF to:', `${BACKEND_URL}/api/pdf-documents/upload`);
      
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/upload`, {
        method: 'POST',
        body: formData
      });

      console.log('Upload response status:', response.status);
      const data = await response.json();
      console.log('Upload response data:', data);

      if (response.ok && data.success) {
        toast.success('PDF erfolgreich hochgeladen', { id: uploadToast });
        loadPDFs();
      } else {
        toast.error(data.detail || 'Fehler beim Hochladen', { id: uploadToast });
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error(`Fehler beim Hochladen: ${error.message}`, { id: uploadToast });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeletePDF = async (pdfId) => {
    if (!window.confirm('PDF wirklich löschen?')) return;

    try {
      console.log('🗑️ Deleting PDF:', pdfId);
      const url = `${BACKEND_URL}/api/pdf-documents/delete/${pdfId}`;
      console.log('🗑️ DELETE URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('🗑️ Response status:', response.status);
      const data = await response.json();
      console.log('🗑️ Response data:', data);

      if (data.success) {
        toast.success('PDF erfolgreich gelöscht');
        loadPDFs();
      } else {
        toast.error(data.message || 'Fehler beim Löschen');
        console.error('🗑️ Delete failed:', data);
      }
    } catch (error) {
      console.error('🗑️ Error deleting PDF:', error);
      toast.error(`Fehler beim Löschen: ${error.message}`);
    }
  };

  const handleUpdateName = async (pdfId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/update/${pdfId}?display_name=${encodeURIComponent(editName)}`, {
        method: 'PUT'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Name aktualisiert');
        setEditingId(null);
        loadPDFs();
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error('Error updating PDF:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleMappingChange = (button, value) => {
    setMappings({ ...mappings, [button]: value });
  };

  const saveMappings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappings)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Zuordnungen gespeichert');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF-Dokumente verwalten
        </h3>

        {/* Upload Section */}
        <div className="mb-6">
          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="pdf-upload"
            />
            <Button
              as="span"
              className="gap-2 cursor-pointer"
              disabled={uploading}
              onClick={() => document.getElementById('pdf-upload').click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Hochladen...' : 'PDF hochladen'}
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Unterstützte Formate: PDF (max. 10 MB)
          </p>
        </div>

        {/* PDF List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Lade PDFs...</div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine PDFs vorhanden. Laden Sie ein PDF hoch.
          </div>
        ) : (
          <div className="space-y-2">
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    {editingId === pdf.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 border border-border rounded bg-background text-foreground w-full max-w-xs"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="font-medium text-foreground">{pdf.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pdf.name} • {formatFileSize(pdf.file_size)}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingId === pdf.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateName(pdf.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(pdf.id);
                          setEditName(pdf.display_name);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeletePDF(pdf.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Button Mappings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Button-Zuordnungen
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ordnen Sie den Buttons "AVB (DE)" und "AVB (EN)" PDF-Dokumente zu.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              AVB (DE) Button
            </label>
            <select
              value={mappings.frei1}
              onChange={(e) => handleMappingChange('frei1', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value="">-- Kein PDF --</option>
              {pdfs.map((pdf) => (
                <option key={pdf.id} value={pdf.id}>
                  {pdf.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              AVB (EN) Button
            </label>
            <select
              value={mappings.frei2}
              onChange={(e) => handleMappingChange('frei2', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value="">-- Kein PDF --</option>
              {pdfs.map((pdf) => (
                <option key={pdf.id} value={pdf.id}>
                  {pdf.display_name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={saveMappings} className="gap-2">
            <Save className="h-4 w-4" />
            Zuordnungen speichern
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PDFManagement;
