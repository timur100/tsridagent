import React, { useEffect, useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';

const PDFFullscreenViewer = ({ pdfUrl, title, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(true);
  const [pdfDataUrl, setPdfDataUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load PDF and convert to data URL for iframe embedding
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        console.log('Loading PDF from:', pdfUrl);
        
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`PDF konnte nicht geladen werden: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('PDF Blob loaded, size:', blob.size);
        
        // Create data URL from blob
        const reader = new FileReader();
        reader.onloadend = () => {
          setPdfDataUrl(reader.result);
          setIsLoading(false);
          console.log('PDF Data URL created');
        };
        reader.onerror = () => {
          throw new Error('Fehler beim Lesen der PDF-Datei');
        };
        reader.readAsDataURL(blob);
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const handleZoomIn = () => {
    const iframe = document.getElementById('pdf-iframe');
    if (iframe && iframe.contentWindow) {
      // Browser's built-in PDF viewer handles zoom via keyboard shortcuts
      iframe.contentWindow.postMessage({ type: 'zoom_in' }, '*');
    }
  };

  const handleZoomOut = () => {
    const iframe = document.getElementById('pdf-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'zoom_out' }, '*');
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
      {/* Header with controls */}
      <div className="bg-[#1a1a1a] border-b border-red-900/50 px-4 py-3 flex items-center justify-between">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <span className="text-gray-400 text-sm">PDF-Dokument</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            onClick={handleZoomOut}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-900/30 border border-red-900/30 hover:border-red-700/50"
            title="Verkleinern"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleZoomIn}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-900/30 border border-red-900/30 hover:border-red-700/50"
            title="Vergrößern"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-red-900/30 mx-1" />

          {/* Maximize/Minimize */}
          <Button
            onClick={toggleMaximize}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-900/30 border border-red-900/30 hover:border-red-700/50"
            title={isMaximized ? "Minimieren" : "Maximieren"}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Download */}
          <Button
            onClick={handleDownload}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-900/30 border border-red-900/30 hover:border-red-700/50"
            title="Herunterladen"
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Print */}
          <Button
            onClick={handlePrint}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-900/30 border border-red-900/30 hover:border-red-700/50"
            title="Drucken"
          >
            <Printer className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-red-900/30 mx-2" />

          {/* Close button - optimiert für Tablet */}
          <Button
            onClick={onClose}
            variant="destructive"
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 min-w-[140px] shadow-lg"
            title="Schließen (ESC)"
          >
            <X className="h-6 w-6 mr-2" />
            Schließen
          </Button>
        </div>
      </div>

      {/* PDF Content - Uses browser's built-in PDF viewer */}
      <div className="flex-1 overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
        {isLoading ? (
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
            <p className="text-lg">PDF wird geladen...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-white">
            <p className="text-lg mb-4 text-red-500">❌ {error}</p>
            <Button
              onClick={handleDownload}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              PDF herunterladen
            </Button>
          </div>
        ) : pdfDataUrl ? (
          <iframe
            id="pdf-iframe"
            src={pdfDataUrl}
            className="w-full h-full"
            title={title}
            style={{ border: 'none' }}
          />
        ) : null}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1a1a1a]/90 border border-red-900/50 text-white text-xs px-4 py-2 rounded-full">
        <span className="opacity-70">ESC zum Schließen • +/- zum Zoomen</span>
      </div>
    </div>
  );
};

export default PDFFullscreenViewer;
