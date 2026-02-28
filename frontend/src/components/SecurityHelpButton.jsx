import React, { useState, useEffect } from 'react';
import { Phone, Loader2, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Predefined questions/reasons for requesting help
const PREDEFINED_QUESTIONS = [
  { id: 'q1', text: 'Dokument ist beschädigt oder unleserlich', icon: '📄' },
  { id: 'q2', text: 'Hologramm/Sicherheitsmerkmale nicht erkennbar', icon: '🔒' },
  { id: 'q3', text: 'Foto stimmt nicht mit Person überein', icon: '👤' },
  { id: 'q4', text: 'Dokument möglicherweise abgelaufen', icon: '📅' },
  { id: 'q5', text: 'Verdacht auf Fälschung', icon: '⚠️' },
  { id: 'q6', text: 'Unbekannter Dokumenttyp', icon: '❓' },
  { id: 'q7', text: 'Zusätzliche Prüfung erforderlich', icon: '🔍' },
  { id: 'q8', text: 'Daten nicht lesbar / OCR fehlgeschlagen', icon: '📖' },
];

const SecurityHelpButton = ({ 
  scanImageUrl,
  ocrData = {},
  documentType = 'unknown',
  tenantId,
  tenantName,
  locationCode,
  locationName,
  deviceId
}) => {
  const [showModal, setShowModal] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // null, 'pending', 'in_progress', 'approved', 'rejected'
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [sending, setSending] = useState(false);

  // Poll for status updates when request is active
  useEffect(() => {
    if (!requestId || requestStatus === 'approved' || requestStatus === 'rejected') return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/requests/${requestId}`);
        const data = await response.json();
        if (data.success && data.request) {
          setRequestStatus(data.request.status);
          
          // Show toast when status changes
          if (data.request.status === 'in_progress' && requestStatus === 'pending') {
            toast.success('Ihre Anfrage wird bearbeitet!');
          }
          if (data.request.status === 'approved') {
            toast.success('Dokument wurde GENEHMIGT!', { duration: 10000, icon: '✅' });
          }
          if (data.request.status === 'rejected') {
            toast.error('Dokument wurde ABGELEHNT!', { duration: 10000, icon: '❌' });
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [requestId, requestStatus]);

  // Send request
  const sendRequest = async (question) => {
    setSending(true);
    setSelectedQuestion(question);

    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/security/requests`, {
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
          predefined_question_id: question.id,
          predefined_question_text: question.text
        })
      });

      const data = await response.json();
      if (data.success) {
        setRequestId(data.request_id);
        setRequestStatus('pending');
        setShowModal(false);
        toast.success('Anfrage wurde gesendet!');
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

  // Reset after result received
  const resetRequest = () => {
    setRequestId(null);
    setRequestStatus(null);
    setSelectedQuestion(null);
  };

  // Render result overlay
  if (requestStatus === 'approved') {
    return (
      <div className="fixed inset-0 bg-green-900/90 flex items-center justify-center z-50">
        <div className="text-center">
          <CheckCircle className="w-32 h-32 text-green-400 mx-auto mb-6 animate-bounce" />
          <div className="text-6xl font-bold text-green-400 mb-4">APPROVED</div>
          <div className="text-2xl text-green-300 mb-8">Dokument wurde genehmigt</div>
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

  if (requestStatus === 'rejected') {
    return (
      <div className="fixed inset-0 bg-red-900/90 flex items-center justify-center z-50">
        <div className="text-center">
          <XCircle className="w-32 h-32 text-red-400 mx-auto mb-6 animate-bounce" />
          <div className="text-6xl font-bold text-red-400 mb-4">NOT APPROVED</div>
          <div className="text-2xl text-red-300 mb-8">Dokument wurde abgelehnt</div>
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

  // Main button
  return (
    <>
      <Button
        onClick={() => !requestStatus && setShowModal(true)}
        disabled={!!requestStatus}
        className={`
          relative overflow-hidden
          ${!requestStatus 
            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
            : requestStatus === 'pending'
              ? 'bg-yellow-500 text-white animate-pulse'
              : 'bg-blue-600 text-white'
          }
          px-6 py-3 text-lg font-bold rounded-xl
          transition-all duration-300
        `}
      >
        {!requestStatus && (
          <>
            <Phone className="w-5 h-5 mr-2" />
            2. Meinung anfordern
          </>
        )}
        
        {requestStatus === 'pending' && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Warte auf Helpdesk...</span>
          </div>
        )}
        
        {requestStatus === 'in_progress' && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Anfrage in Bearbeitung</span>
          </div>
        )}

        {/* Pulsing effect for pending */}
        {requestStatus === 'pending' && (
          <span className="absolute inset-0 rounded-xl animate-ping bg-yellow-400/30" />
        )}
      </Button>

      {/* Question Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a1a1a] border-[#333] p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#d50c2d]" />
                Grund auswählen
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-gray-400 mb-4">
              Wählen Sie den Grund für Ihre Anfrage:
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {PREDEFINED_QUESTIONS.map((question) => (
                <button
                  key={question.id}
                  onClick={() => sendRequest(question)}
                  disabled={sending}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${sending && selectedQuestion?.id === question.id
                      ? 'border-[#d50c2d] bg-[#d50c2d]/20'
                      : 'border-[#333] hover:border-[#d50c2d]/50 bg-[#262626]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{question.icon}</span>
                    <span className="text-white font-medium">{question.text}</span>
                    {sending && selectedQuestion?.id === question.id && (
                      <Loader2 className="w-5 h-5 animate-spin ml-auto text-[#d50c2d]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              Die Anfrage wird an das Security Helpdesk gesendet
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default SecurityHelpButton;
