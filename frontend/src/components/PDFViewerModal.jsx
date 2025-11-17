import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PDFViewerModal = ({ isOpen, onClose, pdfId, title }) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !pdfId) return;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const pdfUrl = `${BACKEND_URL}/api/pdf-documents/view/${pdfId}`;
        console.log('Loading PDF from:', pdfUrl);
        
        const response = await fetch(pdfUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('PDF blob loaded, size:', blob.size, 'type:', blob.type);
        
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup blob URL when modal closes
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [isOpen, pdfId]);

  if (!isOpen) return null;

  const pdfUrl = `${BACKEND_URL}/api/pdf-documents/view/${pdfId}`;

  const openInNewTab = () => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openInNewTab}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              In neuem Tab öffnen
            </button>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors"
              aria-label="Schließen"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">PDF wird geladen...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-red-600 font-semibold mb-4">
                  Fehler beim Laden: {error}
                </p>
                <button
                  onClick={openInNewTab}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-5 w-5" />
                  PDF in neuem Tab öffnen
                </button>
              </div>
            </div>
          )}

          {!loading && !error && pdfBlobUrl && (
            <iframe
              src={pdfBlobUrl}
              title={title}
              className="w-full h-full border-0"
              style={{ 
                border: 'none',
                width: '100%',
                height: '100%'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;
