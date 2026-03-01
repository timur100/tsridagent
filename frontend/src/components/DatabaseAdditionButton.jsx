import React, { useState, useEffect } from 'react';
import { Database, Loader2, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const DatabaseAdditionButton = ({ 
  scanImageUrl,
  ocrData = {},
  documentType = 'unknown',
  tenantId,
  tenantName,
  locationCode,
  locationName,
  deviceId,
  unknownScanCount = 1,
  onRescan
}) => {
  const [requestId, setRequestId] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [showRescanPrompt, setShowRescanPrompt] = useState(false);

  // Poll for status updates when request is active
  useEffect(() => {
    if (!requestId || requestStatus === 'completed' || requestStatus === 'rejected') return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/helpdesk/database-additions/${requestId}`);
        const data = await response.json();
        if (data.success && data.request) {
          setRequestStatus(data.request.status);
          
          // Show toast when status changes
          if (data.request.status === 'tenant_approved' && requestStatus === 'pending_tenant_approval') {
            toast.success('Tenant Security hat die Anfrage genehmigt!');
          }
          if (data.request.status === 'completed') {
            toast.success('Dokument wurde zur Datenbank hinzugefügt!', { duration: 10000, icon: '✅' });
          }
          if (data.request.status === 'rejected') {
            toast.error('Anfrage wurde abgelehnt', { duration: 10000, icon: '❌' });
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [requestId, requestStatus]);

  // If this is the first unknown scan, show rescan prompt
  useEffect(() => {
    if (unknownScanCount === 1) {
      setShowRescanPrompt(true);
    } else {
      setShowRescanPrompt(false);
    }
  }, [unknownScanCount]);

  // Send database addition request
  const sendRequest = async () => {
    setSending(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/database-additions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId || 'unknown',
          tenant_name: tenantName || 'Unbekannt',
          location_code: locationCode || 'unknown',
          location_name: locationName || 'Unbekannt',
          device_id: deviceId || 'unknown',
          scan_image_url: scanImageUrl || '',
          ocr_data: ocrData,
          document_type: documentType,
          scan_attempts: unknownScanCount
        })
      });

      const data = await response.json();
      if (data.success) {
        setRequestId(data.request_id);
        setRequestStatus('pending_tenant_approval');
        toast.success('Anfrage an Tenant Security gesendet!');
      } else {
        toast.error('Fehler beim Senden der Anfrage');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Verbindungsfehler');
    } finally {
      setSending(false);
    }
  };

  // Reset after completed/rejected
  const resetRequest = () => {
    setRequestId(null);
    setRequestStatus(null);
  };

  // Get status display
  const getStatusDisplay = () => {
    switch (requestStatus) {
      case 'pending_tenant_approval':
        return {
          text: 'Warte auf Tenant Security...',
          color: 'bg-amber-500',
          pulse: true
        };
      case 'tenant_approved':
        return {
          text: 'Von Tenant genehmigt - TSRID bearbeitet',
          color: 'bg-blue-500',
          pulse: false
        };
      case 'completed':
        return {
          text: 'Dokument hinzugefügt!',
          color: 'bg-green-500',
          pulse: false
        };
      case 'rejected':
        return {
          text: 'Anfrage abgelehnt',
          color: 'bg-red-500',
          pulse: false
        };
      default:
        return null;
    }
  };

  // Result overlay for completed
  if (requestStatus === 'completed') {
    return (
      <div className="fixed inset-0 bg-green-900/90 flex items-center justify-center z-50">
        <div className="text-center">
          <CheckCircle className="w-32 h-32 text-green-400 mx-auto mb-6 animate-bounce" />
          <div className="text-4xl font-bold text-green-400 mb-4">DOKUMENT HINZUGEFÜGT</div>
          <div className="text-xl text-green-300 mb-8">Das Dokument wurde erfolgreich zur Datenbank hinzugefügt</div>
          <Button 
            onClick={resetRequest}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-xl"
          >
            Weiter
          </Button>
        </div>
      </div>
    );
  }

  // Result overlay for rejected
  if (requestStatus === 'rejected') {
    return (
      <div className="fixed inset-0 bg-red-900/90 flex items-center justify-center z-50">
        <div className="text-center">
          <XCircle className="w-32 h-32 text-red-400 mx-auto mb-6 animate-bounce" />
          <div className="text-4xl font-bold text-red-400 mb-4">ANFRAGE ABGELEHNT</div>
          <div className="text-xl text-red-300 mb-8">Die Anfrage wurde von der Security abgelehnt</div>
          <Button 
            onClick={resetRequest}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-xl"
          >
            Weiter
          </Button>
        </div>
      </div>
    );
  }

  // Show rescan prompt on first unknown
  if (showRescanPrompt && unknownScanCount === 1) {
    return (
      <Card className="bg-amber-500/20 border-amber-500/50 p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-amber-400" />
          <div className="flex-1">
            <div className="font-bold text-amber-400">Unbekanntes Dokument</div>
            <div className="text-sm text-amber-300/80">Bitte scannen Sie das Dokument erneut</div>
          </div>
          <Button
            onClick={() => {
              setShowRescanPrompt(false);
              if (onRescan) onRescan();
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Erneut scannen
          </Button>
        </div>
      </Card>
    );
  }

  // Show database addition button on second+ unknown
  const statusDisplay = getStatusDisplay();

  return (
    <>
      <Button
        onClick={() => !requestStatus && sendRequest()}
        disabled={!!requestStatus || sending}
        className={`
          relative overflow-hidden
          ${!requestStatus && !sending
            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
            : statusDisplay?.color + ' text-white'
          }
          ${statusDisplay?.pulse ? 'animate-pulse' : ''}
          px-6 py-3 text-base font-bold rounded-xl
          transition-all duration-300
        `}
      >
        {sending && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Sende Anfrage...</span>
          </div>
        )}
        
        {!sending && !requestStatus && (
          <>
            <Database className="w-5 h-5 mr-2" />
            Bitte Dokument zur Datenbank hinzufügen
          </>
        )}
        
        {requestStatus && statusDisplay && (
          <div className="flex items-center gap-2">
            {statusDisplay.pulse && <Loader2 className="w-5 h-5 animate-spin" />}
            {requestStatus === 'tenant_approved' && <CheckCircle className="w-5 h-5" />}
            <span>{statusDisplay.text}</span>
          </div>
        )}

        {/* Pulsing effect for pending */}
        {statusDisplay?.pulse && (
          <span className="absolute inset-0 rounded-xl animate-ping bg-amber-400/30" />
        )}
      </Button>
    </>
  );
};

export default DatabaseAdditionButton;
