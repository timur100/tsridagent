import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, Lock, X } from 'lucide-react';
import PinModal from './PinModal';

const ReaderDemoManager = () => {
  const [isReaderDemoRunning, setIsReaderDemoRunning] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI && window.electronAPI.isElectron) {
      setIsElectron(true);
      checkReaderDemoStatus();
      
      // Check status periodically
      const interval = setInterval(checkReaderDemoStatus, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const checkReaderDemoStatus = async () => {
    if (!window.electronAPI) return;

    try {
      const status = await window.electronAPI.checkReaderDemo();
      setIsReaderDemoRunning(status.running);
    } catch (error) {
      console.error('Error checking ReaderDemo status:', error);
    }
  };

  const handleOpenReaderDemo = () => {
    setIsPinModalOpen(true);
  };

  const handlePinVerify = async (pin) => {
    if (!window.electronAPI) {
      setStatusMessage('Electron API nicht verfügbar');
      return false;
    }

    try {
      const isValid = await window.electronAPI.verifyPin(pin);
      
      if (isValid) {
        const result = await window.electronAPI.startReaderDemo();
        
        if (result.success) {
          setStatusMessage(result.message);
          setTimeout(() => {
            checkReaderDemoStatus();
            setStatusMessage('');
          }, 2000);
          return true;
        } else {
          setStatusMessage(`Fehler: ${result.message}`);
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error starting ReaderDemo:', error);
      setStatusMessage('Fehler beim Starten von ReaderDemo');
      return false;
    }
  };

  const dismissWarning = () => {
    setShowWarning(false);
    if (window.electronAPI) {
      window.electronAPI.setSetting('scanner.hideConflictWarning', true);
    }
  };

  if (!isElectron) {
    return null;
  }

  return (
    <>
      {/* Warning Banner */}
      {isReaderDemoRunning && showWarning && (
        <div className="fixed top-20 right-4 z-40 max-w-md">
          <div className="bg-yellow-900 bg-opacity-90 border border-yellow-600 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-yellow-200 font-semibold mb-1">
                  ReaderDemo.exe läuft
                </h4>
                <p className="text-yellow-300 text-sm mb-3">
                  Beide Anwendungen können nicht gleichzeitig auf den Scanner zugreifen. 
                  Bitte schließen Sie ReaderDemo.exe, um die Electron-App zu verwenden.
                </p>
                <button
                  onClick={dismissWarning}
                  className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                >
                  Warnung ausblenden
                </button>
              </div>
              <button
                onClick={dismissWarning}
                className="text-yellow-400 hover:text-yellow-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg max-w-sm">
            <p className="text-gray-200 text-sm">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerify={handlePinVerify}
        title="ReaderDemo.exe öffnen"
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={handleOpenReaderDemo}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 
                   text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 
                   transition-all hover:shadow-xl border border-red-500"
          title="Erweiterte Details in ReaderDemo.exe anzeigen"
        >
          <Lock className="w-5 h-5" />
          <span className="font-medium">Mehr Details</span>
          <ExternalLink className="w-4 h-4" />
        </button>
        
        {/* Status Indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          {isReaderDemoRunning ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">ReaderDemo läuft</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              <span className="text-gray-500">ReaderDemo gestoppt</span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ReaderDemoManager;
