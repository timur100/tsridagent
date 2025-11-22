import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { apiCall } from '../utils/api';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, CheckCircle, XCircle, Ban, MessageSquare,
  User, Calendar, MapPin, Monitor, Building, FileText,
  Shield, AlertCircle, Download
} from 'lucide-react';

const IDCheckDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadScan();
  }, [id]);

  const loadScan = async () => {
    try {
      const result = await apiCall(`/api/id-scans/${id}`);
      if (result.success) {
        setScan(result.scan);
      }
    } catch (error) {
      console.error('Error loading scan:', error);
      toast.error('Fehler beim Laden des Scans');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionComment && actionType !== 'approved') {
      toast.error('Bitte Kommentar eingeben');
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiCall(`/api/id-scans/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          comment: actionComment,
          reason: actionReason
        })
      });

      if (result.success) {
        toast.success(`Aktion "${actionType}" erfolgreich ausgeführt`);
        setActionModalOpen(false);
        setActionComment('');
        setActionReason('');
        loadScan();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Fehler bei der Aktion');
    } finally {
      setSubmitting(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      validated: { color: 'green', icon: CheckCircle, label: 'Validated' },
      rejected: { color: 'red', icon: XCircle, label: 'Rejected' },
      unknown: { color: 'yellow', icon: AlertCircle, label: 'Unknown' },
      pending: { color: 'gray', icon: Shield, label: 'Pending' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold
        ${config.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
        ${config.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
        ${config.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
        ${config.color === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' : ''}
      `}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className={`h-8 w-8 animate-spin mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lade Scan-Details...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Scan nicht gefunden</p>
        <button
          onClick={() => navigate('/portal/admin/id-checks')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const imageTypes = [
    { key: 'front_original', label: 'Vorderseite Original' },
    { key: 'front_ir', label: 'Vorderseite IR' },
    { key: 'front_uv', label: 'Vorderseite UV' },
    { key: 'back_original', label: 'Rückseite Original' },
    { key: 'back_ir', label: 'Rückseite IR' },
    { key: 'back_uv', label: 'Rückseite UV' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/portal/admin/id-checks')}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-[#2a2a2a] text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 border'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ID-Check Details
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {new Date(scan.scan_timestamp).toLocaleString('de-DE')}
            </p>
          </div>
        </div>
        <StatusBadge status={scan.status} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActionType('approved');
            setActionModalOpen(true);
          }}
          disabled={scan.status === 'validated'}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-5 w-5" />
          Genehmigen
        </button>
        <button
          onClick={() => {
            setActionType('rejected');
            setActionModalOpen(true);
          }}
          disabled={scan.status === 'rejected'}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="h-5 w-5" />
          Ablehnen
        </button>
        <button
          onClick={() => {
            setActionType('banned');
            setActionModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
        >
          <Ban className="h-5 w-5" />
          Bannen
        </button>
      </div>

      {/* Images Grid */}
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Gescannte Bilder
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Front Side */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Vorderseite
            </h3>
            <div className="space-y-3">
              {imageTypes.slice(0, 3).map(({ key, label }) => {
                const image = scan.images?.find(img => img.image_type === key);
                return (
                  <div key={key} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
                    {image ? (
                      <img
                        src={`/api/id-scans/${scan.id}/images/${key}`}
                        alt={label}
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-700 rounded">
                        <p className="text-gray-500 text-sm">Kein Bild vorhanden</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Back Side */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Rückseite
            </h3>
            <div className="space-y-3">
              {imageTypes.slice(3, 6).map(({ key, label }) => {
                const image = scan.images?.find(img => img.image_type === key);
                return (
                  <div key={key} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
                    {image ? (
                      <img
                        src={`/api/id-scans/${scan.id}/images/${key}`}
                        alt={label}
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-700 rounded">
                        <p className="text-gray-500 text-sm">Kein Bild vorhanden</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Data */}
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Extrahierte Daten
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataField label="Vollständiger Name" value={scan.extracted_data?.full_name} />
          <DataField label="Vorname" value={scan.extracted_data?.first_name} />
          <DataField label="Nachname" value={scan.extracted_data?.last_name} />
          <DataField label="Geburtsdatum" value={scan.extracted_data?.date_of_birth} />
          <DataField label="Geburtsort" value={scan.extracted_data?.place_of_birth} />
          <DataField label="Nationalität" value={scan.extracted_data?.nationality} />
          <DataField label="Geschlecht" value={scan.extracted_data?.sex} />
          <DataField label="Dokumentennummer" value={scan.extracted_data?.document_number} />
          <DataField label="Dokumenttyp" value={scan.extracted_data?.document_type} />
          <DataField label="Ausstellende Behörde" value={scan.extracted_data?.issuing_authority} />
          <DataField label="Ausstellungsdatum" value={scan.extracted_data?.issue_date} />
          <DataField label="Ablaufdatum" value={scan.extracted_data?.expiry_date} />
          <DataField label="Ausstellungsland" value={scan.extracted_data?.issuing_country} />
          <DataField label="Adresse" value={scan.extracted_data?.address} />
          <DataField label="Stadt" value={scan.extracted_data?.city} />
          <DataField label="PLZ" value={scan.extracted_data?.postal_code} />
        </div>
      </div>

      {/* Verification Details */}
      {scan.verification && (
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Verifizierungs-Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DataField 
              label="Confidence Score" 
              value={scan.verification.confidence_score ? `${scan.verification.confidence_score}%` : null} 
            />
            <DataField 
              label="Authenticity Score" 
              value={scan.verification.authenticity_score ? `${scan.verification.authenticity_score}%` : null} 
            />
            <DataField 
              label="Dokument gültig" 
              value={scan.verification.document_validity ? 'Ja' : 'Nein'} 
            />
          </div>
          {scan.verification.warnings && scan.verification.warnings.length > 0 && (
            <div className="mt-4">
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                Warnungen:
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {scan.verification.warnings.map((warning, i) => (
                  <li key={i} className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Scan Info */}
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Scan-Informationen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Kunde</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scan.tenant_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Standort</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scan.location_name || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Monitor className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Gerät</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scan.device_name || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Gescannt von</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scan.scanned_by || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Actions History */}
      {scan.manual_actions && scan.manual_actions.length > 0 && (
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Manuelle Aktionen
          </h2>
          <div className="space-y-3">
            {scan.manual_actions.map((action, i) => (
              <div key={i} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {action.action}
                  </span>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(action.performed_at).toLocaleString('de-DE')}
                  </span>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Von: {action.performed_by}
                </p>
                {action.comment && (
                  <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kommentar: {action.comment}
                  </p>
                )}
                {action.reason && (
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Grund: {action.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {actionType === 'approved' ? 'Genehmigen' : actionType === 'rejected' ? 'Ablehnen' : 'Bannen'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Grund (optional)
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="z.B. Abgelaufenes Dokument"
                  className={`w-full px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kommentar {actionType !== 'approved' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={4}
                  placeholder="Geben Sie einen Kommentar ein..."
                  className={`w-full px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] text-white border border-gray-700'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAction}
                disabled={submitting}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  actionType === 'approved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {submitting ? 'Wird ausgeführt...' : 'Bestätigen'}
              </button>
              <button
                onClick={() => {
                  setActionModalOpen(false);
                  setActionComment('');
                  setActionReason('');
                }}
                disabled={submitting}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for data fields
const DataField = ({ label, value }) => {
  const { theme } = useContext(ThemeContext);
  
  return (
    <div>
      <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {value || '-'}
      </p>
    </div>
  );
};

export default IDCheckDetailPage;
