import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, CheckCircle, XCircle, Ban, MessageSquare,
  User, Calendar, MapPin, Monitor, Building, FileText,
  Shield, AlertCircle, Download, ZoomIn, X, ChevronLeft, ChevronRight,
  Clock, CreditCard, Hash, Cake, Users
} from 'lucide-react';

const IDCheckDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [availableImages, setAvailableImages] = useState([]);

  useEffect(() => {
    loadScan();
  }, [id]);

  const loadScan = async () => {
    try {
      const result = await apiCall(`/api/id-scans/${id}`);
      console.log('[IDCheckDetailPage] loadScan result:', result);
      if (result.success && result.data) {
        console.log('[IDCheckDetailPage] Setting scan:', result.data.scan);
        setScan(result.data.scan);
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

  // Lightbox functions
  const openLightbox = (imageKey) => {
    // Dynamic image mapping based on actual images in scan
    const imageLabelMap = {
      'front_front': 'Vorderseite',
      'front_portrait': 'Portrait (Vorne)',
      'front_ir': 'IR (Vorne)',
      'front_uv': 'UV (Vorne)',
      'front_white': 'Weißlicht (Vorne)',
      'back_portrait': 'Portrait (Hinten)',
      'back_signature': 'Unterschrift',
      'back_document_front': 'Dokument Vorderseite',
      'back_ir': 'IR (Hinten)',
      'back_uv': 'UV (Hinten)',
      'back_white': 'Weißlicht (Hinten)',
      // Legacy support
      'front_original': 'Vorderseite',
      'back_original': 'Rückseite'
    };
    
    const images = (scan.images || [])
      .map(img => ({
        key: img.image_type,
        label: imageLabelMap[img.image_type] || img.image_type,
        url: `/api/id-scans/${id}/images/${img.image_type}`
      }));
    
    setAvailableImages(images);
    const index = images.findIndex(img => img.key === imageKey);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % availableImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            theme === 'dark' ? 'border-white' : 'border-gray-900'
          }`}></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lade Scan-Details...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Scan nicht gefunden</p>
        </div>
      </div>
    );
  }

  // Dynamic image types based on actual images in scan
  const imageLabelMap = {
    'front_front': 'Vorderseite',
    'front_portrait': 'Portrait (Vorne)',
    'front_ir': 'IR (Vorne)',
    'front_uv': 'UV (Vorne)',
    'front_white': 'Weißlicht (Vorne)',
    'back_portrait': 'Portrait (Hinten)',
    'back_signature': 'Unterschrift',
    'back_document_front': 'Dokument Vorderseite',
    'back_ir': 'IR (Hinten)',
    'back_uv': 'UV (Hinten)',
    'back_white': 'Weißlicht (Hinten)',
    'front_original': 'Vorderseite',
    'back_original': 'Rückseite'
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Back Button and Actions */}
      <div className="flex items-center justify-between mb-4">
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
              Scan ID: {scan.id}
            </p>
          </div>
        </div>
        
        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            {scan.status !== 'validated' && (
              <button
                onClick={() => {
                  setActionType('approved');
                  setActionModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                Genehmigen
              </button>
            )}
            {scan.status !== 'rejected' && (
              <button
                onClick={() => {
                  setActionType('rejected');
                  setActionModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
                Ablehnen
              </button>
            )}
            <button
              onClick={() => {
                setActionType('ban');
                setActionModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors"
            >
              <Ban className="h-5 w-5" />
              Sperren
            </button>
          </div>
        )}
      </div>

      {/* Top Row: Three Equal Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
        {/* Container 1: DOKUMENTE (2x3 Grid) */}
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Dokumente
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Show all document-related images (exclude main portrait for separate display) */}
            {scan.images && scan.images.length > 0 ? (
              scan.images
                .filter(img => {
                  // Only exclude front_portrait (shown separately in Portrait section)
                  // Keep ALL other images including back_portrait, back_signature, etc.
                  const isMainPortrait = img.image_type === 'front_portrait' || img.image_type === 'portrait';
                  return !isMainPortrait;
                })
                // ⚠️ REMOVED .slice(0, 6) to show ALL available images!
                .map((img, idx) => {
                  const labelMap = {
                    'front_front': 'Vorderseite',
                    'front_original': 'Vorderseite',
                    'back_original': 'Rückseite',
                    'front_ir': 'IR (Vorderseite)',
                    'back_ir': 'IR (Rückseite)',
                    'front_uv': 'UV (Vorderseite)',
                    'back_uv': 'UV (Rückseite)',
                    'front_white': 'Weißlicht (V)',
                    'back_white': 'Weißlicht (R)',
                    'back_portrait': 'Portrait (Hinten)',
                    'back_signature': 'Unterschrift',
                    'back_document_front': 'Dokument (V)'
                  };
                  const label = labelMap[img.image_type] || img.image_type;
                  
                  return (
                    <div key={img.image_type}>
                      <p className={`text-xs mb-1 uppercase tracking-wide text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
                      <div 
                        className="relative group cursor-pointer"
                        onClick={() => openLightbox(img.image_type)}
                      >
                        <img
                          src={`/api/id-scans/${scan.id}/images/${img.image_type}`}
                          alt={label}
                          crossOrigin="use-credentials"
                          className={`w-full h-32 object-cover rounded border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                          onLoad={(e) => {
                            console.log('✅ Image loaded:', img.image_type);
                          }}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', img.image_type, e.target.src);
                            e.target.style.display = 'none';
                            const errorDiv = e.target.nextElementSibling;
                            if (errorDiv) errorDiv.style.display = 'flex';
                          }}
                        />
                        <div style={{display: 'none'}} className={`w-full h-32 flex flex-col items-center justify-center rounded border-2 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                          <FileText className="h-8 w-8 text-red-500 mb-1" />
                          <p className="text-gray-500 text-xs">Fehler beim Laden</p>
                          <p className="text-gray-500 text-xs">{img.image_type}</p>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              // Fallback if no images
              [
                { key: 'front', label: 'Vorderseite' },
                { key: 'back', label: 'Rückseite' },
                { key: 'ir_front', label: 'IR (V)' },
                { key: 'ir_back', label: 'IR (R)' },
                { key: 'uv_front', label: 'UV (V)' },
                { key: 'uv_back', label: 'UV (R)' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className={`text-xs mb-1 uppercase tracking-wide text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
                  <div className={`w-full h-32 flex flex-col items-center justify-center rounded border-2 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                    <FileText className="h-8 w-8 text-gray-500 mb-1" />
                    <p className="text-gray-500 text-xs">{label}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Container 2: PORTRAIT (Hochkant) */}
        <div className={`p-6 rounded-lg h-full ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Portrait
          </h2>
          
          <div className="flex flex-col items-center h-[calc(100%-3rem)]">
            {(() => {
              // Try to find portrait in different formats
              const portraitImg = scan.images?.find(img => 
                img.image_type === 'portrait' || 
                img.image_type === 'front_portrait' || 
                img.image_type === 'back_portrait'
              );
              
              if (portraitImg) {
                return (
                  <div className="w-full h-full flex flex-col">
                    <img
                      src={`/api/id-scans/${scan.id}/images/${portraitImg.image_type}`}
                      alt="Portrait"
                      crossOrigin="use-credentials"
                      className={`w-full flex-1 object-contain rounded-lg border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                      onLoad={() => console.log('✅ Portrait loaded:', portraitImg.image_type)}
                      onError={(e) => {
                        console.error('❌ Portrait failed to load:', portraitImg.image_type, e.target.src);
                        e.target.parentElement.innerHTML = `
                          <div class="w-full h-full flex flex-col items-center justify-center rounded-lg border-2 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-100 border-gray-300'}">
                            <div class="h-20 w-20 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <p class="text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}">Portrait nicht verfügbar</p>
                            <p class="text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}">${portraitImg.image_type}</p>
                          </div>
                        `;
                      }}
                    />
                    <button
                      className="w-full mt-4 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Verifiziert
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className={`w-full h-full flex flex-col items-center justify-center rounded-lg border-2 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                    <User className={`h-20 w-20 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Kein Portrait verfügbar</p>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        {/* Container 3: AUSWEISDATEN */}
        <div className={`p-6 rounded-lg h-full flex flex-col ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className={`text-xl font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Ausweisdaten
            </h2>
            <span className={`text-xs px-3 py-1 rounded ${
              scan.status === 'validated' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              scan.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              Prüfung
            </span>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto">
            {/* Document Type */}
            {(scan.extracted_data?.document_type || scan.extracted_data?.document_class) && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dokumenttyp</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.document_type || scan.extracted_data.document_class}
                </p>
              </div>
            )}

            {/* Country */}
            {scan.extracted_data?.country && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Land</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.country}
                </p>
              </div>
            )}

            {/* Document Number */}
            {scan.extracted_data?.document_number && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dokumentennummer</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.document_number}
                </p>
              </div>
            )}

            {/* Expiry Date */}
            {scan.extracted_data?.expiry_date && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gültig bis</p>
                  </div>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.expiry_date}
                </p>
              </div>
            )}

            {/* Birth Date */}
            {scan.extracted_data?.birth_date && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cake className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Geburtstag</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.birth_date}
                </p>
              </div>
            )}

            {/* Gender */}
            {scan.extracted_data?.gender && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Geschlecht</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.gender === 'M' ? 'Männlich' : scan.extracted_data.gender === 'F' ? 'Weiblich' : scan.extracted_data.gender}
                </p>
              </div>
            )}

            {/* First Name */}
            {scan.extracted_data?.first_name && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Vorname</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.first_name}
                </p>
              </div>
            )}

            {/* Last Name */}
            {scan.extracted_data?.last_name && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    <p className={`text-xs uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nachname</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className={`text-sm font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.extracted_data.last_name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Scan-Informationen (Full Width) */}
      <div className={`p-6 rounded-lg mb-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-xl font-bold mb-4 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Scan-Informationen
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Zeitstempel</p>
              </div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {new Date(scan.scan_timestamp).toLocaleString('de-DE')}
              </p>
            </div>

            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Building className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Kunde</p>
              </div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {scan.tenant_name}
              </p>
            </div>

            {scan.location_name && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Standort</p>
                </div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.location_name}
                </p>
              </div>
            )}

            {scan.device_name && (
              <div className={`p-3 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gerät</p>
                </div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {scan.device_name}
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Action Modal */}
      {actionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg mx-4 p-6 rounded-lg ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {actionType === 'approved' ? 'Genehmigen' : actionType === 'rejected' ? 'Ablehnen' : 'Sperren'}
              </h3>
              <button
                onClick={() => {
                  setActionModalOpen(false);
                  setActionComment('');
                  setActionReason('');
                }}
                className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
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
                      : 'bg-gray-50 text-gray-900 border border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Kommentar *
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Geben Sie einen Kommentar ein..."
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] text-white border border-gray-700'
                      : 'bg-gray-50 text-gray-900 border border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setActionModalOpen(false);
                    setActionComment('');
                    setActionReason('');
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#3a3a3a]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAction}
                  disabled={submitting || !actionComment.trim()}
                  className={`px-4 py-2 rounded-lg text-white ${
                    actionType === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : actionType === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-700 hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Wird verarbeitet...' : 'Bestätigen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && availableImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <X className="h-8 w-8" />
          </button>

          {availableImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 text-white hover:text-gray-300 p-2"
              >
                <ChevronLeft className="h-12 w-12" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 text-white hover:text-gray-300 p-2"
              >
                <ChevronRight className="h-12 w-12" />
              </button>
            </>
          )}

          <div className="text-center">
            <img 
              src={availableImages[currentImageIndex].url}
              alt={availableImages[currentImageIndex].label}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
            />
            <p className="text-white text-lg mt-4">
              {availableImages[currentImageIndex].label}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {currentImageIndex + 1} / {availableImages.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDCheckDetailPage;
