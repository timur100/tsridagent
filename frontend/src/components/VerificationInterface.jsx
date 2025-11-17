import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Lock, AlertTriangle, X, RefreshCw, Menu, Monitor, Upload, FileText, Scan } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import DocumentPreview from './DocumentPreview';
import PersonPhoto from './PersonPhoto';
import DataPanel from './DataPanel';
import StatusBar from './StatusBar';
import FooterInfo from './FooterInfo';
import ActionButtons from './ActionButtons';
import ImageModal from './ImageModal';
import SideMenu from './SideMenu';
import PinPad from './PinPad';
import AdminPanel from './AdminPanel';
import SecurityLogin from './SecurityLogin';
import VerificationHistory from './VerificationHistory';
import TicketSystem from './TicketSystem';
import FlaggedDocumentModal from './FlaggedDocumentModal';
import SecurityDashboard from './SecurityDashboard';
import BannedDocumentAlert from './BannedDocumentAlert';
import PDFViewerModal from './PDFViewerModal';
import ReaderDemoManager from './ReaderDemoManager';
import PDFFullscreenViewer from './PDFFullscreenViewer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Helper function to format date with two-digit day
const formatDateTime = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
};

// Mock data for demonstration
const mockVerificationData = {
  status: 'success',
  documentClass: 'Führerschein',
  country: 'D',
  documentNumber: 'C010A0V0U32',
  validUntil: '15.10.2030',
  birthDate: '15.10.1976',
  gender: 'M',
  age: 48,
  firstName: 'TIMUR',
  lastName: 'SEZGIN',
  timestamp: formatDateTime(),
  location: 'BERN01-01',
  stationName: 'Berlin North Reinickendorf -IKC-',
  street: 'Kapweg 4',
  city: '13405 Berlin',
  countryLocation: 'Germany',
  phone: '+49 (30) 4548920',
  email: 'destBERN01@europcar.com',
  address: 'Berlin Moor Reinickendorf',
  online: true,
  version: '1.2',
  ipAddress: '10.102.111.14',
  tvid: '528168516',
  snStation: '047926771453',
  snScanner: '201734 00732',
  // Mock OCR-Daten für Führerscheinklassen
  licenseClasses: {
    all_classes: ['B', 'BE', 'C', 'C1', 'C1E'],
    valid_classes: [
      { license_class: 'B', valid_until: '15.10.2030', status: 'valid', days_until_expiry: 1825 },
      { license_class: 'BE', valid_until: '15.10.2030', status: 'valid', days_until_expiry: 1825 },
      { license_class: 'C', valid_until: '15.10.2030', status: 'valid', days_until_expiry: 1825 }
    ],
    expired_classes: [
      { license_class: 'C1', valid_until: '15.10.2024', status: 'expired', days_until_expiry: -15 },
      { license_class: 'C1E', valid_until: '15.10.2024', status: 'expired', days_until_expiry: -15 }
    ],
    warnings: [
      '⚠️ WICHTIG: Folgende kritische Klassen sind abgelaufen: C1, C1E',
      '⚠️ Klasse C1 (Leichte LKW (3,5-7,5t)) abgelaufen am 15.10.2024',
      '⚠️ Klasse C1E (Leichte LKW mit Anhänger) abgelaufen am 15.10.2024'
    ],
    allowed_for_rental: ['B', 'BE', 'C'],
    rental_class_required: 'C',
    is_eligible_for_rental: true
  }
};

const emptyVerificationData = {
  status: 'idle',
  documentClass: '',
  country: '',
  documentNumber: '',
  validUntil: '',
  birthDate: '',
  gender: '',
  age: 0,
  firstName: '',
  lastName: '',
  timestamp: formatDateTime(),
  location: 'BERN01-01',
  stationName: 'Berlin North Reinickendorf -IKC-',
  street: 'Kapweg 4',
  city: '13405 Berlin',
  countryLocation: 'Germany',
  phone: '+49 (30) 4548920',
  email: 'destBERN01@europcar.com',
  address: 'Berlin Moor Reinickendorf',
  online: true,
  version: '1.2',
  ipAddress: '10.102.111.14',
  tvid: '528168516',
  snStation: '047926771453',
  snScanner: '201734 00732',
  licenseClasses: null  // Wichtig: Bei Reset keine Führerscheinklassen anzeigen
};

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

const VerificationInterface = () => {
  const [verificationData, setVerificationData] = useState(emptyVerificationData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('idle');
  const [scanState, setScanState] = useState('waiting');
  const [hasDocument, setHasDocument] = useState(false);
  const [scannedImages, setScannedImages] = useState({
    front: null,
    back: null,
    irFront: null,
    uvFront: null,
    irBack: null,
    uvBack: null,
    photo: null
  });
  const [currentScanSide, setCurrentScanSide] = useState('front');
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinPadOpen, setIsPinPadOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [pinPadPurpose, setPinPadPurpose] = useState('unlock'); // 'unlock' or 'admin'
  
  // New states for security and history
  const [isSecurityLoginOpen, setIsSecurityLoginOpen] = useState(false);
  const [securityUser, setSecurityUser] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTicketSystemOpen, setIsTicketSystemOpen] = useState(false);
  const [isSecurityDashboardOpen, setIsSecurityDashboardOpen] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [infoMessages, setInfoMessages] = useState([]);
  const [securityUsers, setSecurityUsers] = useState([
    { id: 0, employeeNumber: '00', name: 'Administrator', pin: '1234', role: 'Admin' },
    { id: 1, employeeNumber: '01', name: 'Max Müller', pin: '1111', role: 'Security' },
    { id: 2, employeeNumber: '02', name: 'Anna Schmidt', pin: '2222', role: 'Security' }
  ]);
  
  // Scan attempt counters
  const [unknownAttempts, setUnknownAttempts] = useState(0);
  const [errorAttempts, setErrorAttempts] = useState(0);
  const [showFlaggedModal, setShowFlaggedModal] = useState(false);
  const [flaggedModalType, setFlaggedModalType] = useState(''); // 'unknown' or 'error'
  const [canContinueScanning, setCanContinueScanning] = useState(true);
  
  // Banned Documents
  const [showBannedAlert, setShowBannedAlert] = useState(false);
  const [bannedDocumentInfo, setBannedDocumentInfo] = useState(null);
  
  // PDF Viewer
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [currentPDF, setCurrentPDF] = useState({ id: '', title: '', url: '' });
  const [pdfMappings, setPdfMappings] = useState({
    frei1: null,
    frei2: null
  });
  
  // Fullscreen PDF Viewer State
  const [isFullscreenPDFOpen, setIsFullscreenPDFOpen] = useState(false);
  const [fullscreenPDFData, setFullscreenPDFData] = useState({ url: '', title: '' });
  
  // Reference to currently opened PDF window (legacy, not used with fullscreen viewer)
  const pdfWindowRef = useRef(null);
  
  // Scanner State
  const [scannerOnline, setScannerOnline] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('checking');
  const [isScanning, setIsScanning] = useState(false);
  
  const [adminSettings, setAdminSettings] = useState(() => {
    // Load enableBannedCheck from localStorage
    const savedSettings = localStorage.getItem('adminSettings');
    const defaultSettings = {
      deviceId: 'BERN01-01',
      stationName: 'Berlin North Reinickendorf -IKC-',
      street: 'Kapweg 4',
      city: '13405 Berlin',
      country: 'Germany',
      phone: '+49 (30) 4548920',
      email: 'destBERN01@europcar.com',
      location: 'Berlin Moor Reinickendorf',
      scannerBrightness: 80,
      scannerResolution: '600',
      networkMode: 'DHCP',
      ipAddress: '10.102.111.14',
      tvid: '528168516',
      snStation: '047926771453',
      snScanner: '201734 00732',
      autoResetMinutes: 5,
      datenschutzTage: 30,
      currentPin: '',
      newPin: '',
      confirmPin: '',
      // Flagged scan settings
      maxUnknownAttempts: 3,
      maxErrorAttempts: 5,
      requireConfirmation: true,
      unknownDocumentMessage: 'Dokument unbekannt. Es wird zur Überprüfung der Datenbank an die IT gesendet.',
      errorDocumentMessage: 'Dokument fehlerhaft oder hat Auffälligkeiten. Es wird zur weiteren Überprüfung an die Security versendet.',
      // Auto-Ban settings
      autoBanEnabled: true,
      autoBanThreshold: 3,
      autoBanDuration: 'permanent',
      autoBanEmailNotifications: true,
      autoBanSmsNotifications: false,
      // Banned Documents Check (für Testing)
      enableBannedCheck: true,  // Default: aktiviert
      // Scanner Mode: 'live' oder 'simulation'
      scannerMode: 'simulation',  // Default: Simulation für Entwicklung
      // Simulation Mode (deprecated, use scannerMode)
      simulationMode: false,
      simulationStationId: '',
      simulationStationName: '',
      simulationDeviceNumber: '',
      // Document Upload
      uploadEnabled: true
    };
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error('Error parsing saved settings:', e);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  
  // Auto-reset timer
  const autoResetTimerRef = useRef(null);
  
  // Inactivity timer
  const inactivityTimerRef = useRef(null);

  const imageUrls = {
    front: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/kmwq9ym0_WHITE.jpg',
    irFront: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/rhq9bmna_IR.jpg',
    uvFront: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/hj4iwcj2_UV.jpg',
    photo: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/byxwolc1_Photo.jpg',
    back: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/9xzw0v7s_WHITE.jpg',
    irBack: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/n7jv47oz_IR.jpg',
    uvBack: 'https://customer-assets.emergentagent.com/job_id-tablet-app/artifacts/ih7vvy1e_UV.jpg'
  };

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!isUnlocked) return;
    
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      setIsUnlocked(false);
      toast.error('Automatisch gesperrt nach 2 Minuten Inaktivität');
    }, INACTIVITY_TIMEOUT);
  }, [isUnlocked]);

  // Setup activity listeners
  useEffect(() => {
    if (!isUnlocked) {
      // Clear timer when locked
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Start initial timer
    resetInactivityTimer();

    // Activity event handlers
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Listen to various user activities
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      // Cleanup
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isUnlocked, resetInactivityTimer]);

  const needsBackScan = (docClass) => {
    // Führerschein, ID-Karten, Personalausweis benötigen beide Seiten
    const needsBack = ['Führerschein', 'ID', 'ID-Karte', 'Personalausweis', 'Aufenthaltstitel'].includes(docClass);
    return needsBack;
  };
  
  const isPassport = (docClass) => {
    // Pässe benötigen nur eine Seite
    return ['Passport', 'Reisepass', 'Pass'].includes(docClass);
  };

  // File Upload Handler
  const handleFileUpload = (event) => {
    const files = event.target.files;
    console.log('handleFileUpload called, files:', files ? files.length : 0);
    
    if (!files || files.length === 0) {
      toast.error('Keine Datei ausgewählt', { id: 'upload' });
      return;
    }

    const totalFiles = files.length; // Store length before reset
    console.log('Total files to process:', totalFiles);

    // Reset alle Daten vor Upload
    setVerificationData({
      ...emptyVerificationData,
      timestamp: formatDateTime()
    });
    
    setScannedImages({
      front: null,
      back: null,
      irFront: null,
      uvFront: null,
      irBack: null,
      uvBack: null,
      photo: null
    });

    const uploadToastId = toast.loading('Dokument wird hochgeladen...');
    
    // Array für hochgeladene Bilder
    const uploadedImages = [];
    let processedCount = 0;
    let hasErrors = false;

    Array.from(files).forEach((file, index) => {
      console.log(`Processing file ${index}:`, file.name, file.type);
      
      // Validiere Dateityp
      const fileType = file.type;
      const validTypes = ['image/jpeg', 'image/png'];
      
      if (!validTypes.includes(fileType)) {
        console.log('Invalid file type:', fileType);
        toast.error(`Ungültiger Dateityp: ${file.name}. Nur JPG und PNG sind erlaubt.`, { id: uploadToastId });
        hasErrors = true;
        processedCount++;
        
        // Check if all done even with error
        if (processedCount === totalFiles) {
          toast.error('Keine gültigen Bilder zum Hochladen', { id: uploadToastId });
          setIsProcessing(false);
        }
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log(`File ${index} loaded, size:`, e.target.result.length);
        const result = e.target.result;
        
        // Für Bilder: direkt verwenden
        uploadedImages.push(result);
        processedCount++;
        
        console.log(`Processed ${processedCount}/${totalFiles}, uploaded: ${uploadedImages.length}`);
        
        // Wenn alle Dateien verarbeitet wurden
        if (processedCount === totalFiles) {
          console.log('All files processed!', {uploadedImages: uploadedImages.length, hasErrors});
          
          if (uploadedImages.length > 0 && !hasErrors) {
            // Setze die Bilder basierend auf der Anzahl
            setScanState('placed');
            setHasDocument(true);
            setCurrentStatus('processing');
            setIsProcessing(true);
            
            toast.success(`${uploadedImages.length} Bild(er) werden verarbeitet...`, { id: uploadToastId });
            
            setTimeout(() => {
              const newImages = {
                front: uploadedImages[0] || null,
                back: uploadedImages[1] || null,
                irFront: null,
                uvFront: null,
                irBack: null,
                uvBack: null,
                photo: uploadedImages[0] || null // Verwende erstes Bild auch als Photo
              };
              
              console.log('Setting scanned images:', newImages);
              setScannedImages(newImages);
              
              // Trigger Verification nach kurzer Verzögerung
              setTimeout(() => {
                console.log('Calling completeVerification');
                completeVerification();
              }, 1000);
            }, 1500);
          } else {
            console.log('No valid images or has errors');
            toast.error('Keine gültigen Bilder zum Hochladen', { id: uploadToastId });
            setIsProcessing(false);
          }
        }
      };
      
      reader.onerror = () => {
        console.error(`Error reading file: ${file.name}`);
        toast.error(`Fehler beim Lesen der Datei: ${file.name}`, { id: uploadToastId });
        hasErrors = true;
        processedCount++;
        
        // Check if all done
        if (processedCount === totalFiles) {
          toast.error('Fehler beim Verarbeiten der Dateien', { id: uploadToastId });
          setIsProcessing(false);
        }
      };
      
      console.log(`Starting to read file: ${file.name}`);
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    event.target.value = '';
  };

  const simulateNewVerification = () => {
    // Zuerst ALLE Daten zurücksetzen
    setVerificationData({
      ...emptyVerificationData,
      timestamp: formatDateTime()
    });
    
    setScannedImages({
      front: null,
      back: null,
      irFront: null,
      uvFront: null,
      irBack: null,
      uvBack: null,
      photo: null
    });
    setCurrentScanSide('front');
    setCurrentStatus('idle');
    
    // Dann Scan-Prozess starten
    setScanState('placed');
    setHasDocument(true);
    
    setTimeout(() => {
      setScanState('scanning');
      setIsProcessing(true);
      setCurrentStatus('processing');
      
      setTimeout(() => {
        // Simuliere Dokumentenklassenerkennung nach Front-Scan
        const detectedDocClass = mockVerificationData.documentClass; // In Produktion: aus OCR-Ergebnis
        
        setVerificationData(prev => ({
          ...prev,
          documentClass: detectedDocClass
        }));
        
        setScannedImages(prev => ({
          ...prev,
          front: imageUrls.front,
          irFront: imageUrls.irFront,
          uvFront: imageUrls.uvFront,
          photo: imageUrls.photo
        }));
        
        if (needsBackScan(detectedDocClass)) {
          // Führerschein/ID: Rückseite wird benötigt
          setScanState('turn_document');
          setIsProcessing(false);
          setCurrentStatus('processing'); // Status bleibt "processing", kein Ergebnis
          
          setTimeout(() => {
            setScanState('scanning_back');
            setIsProcessing(true);
            setCurrentScanSide('back');
            
            setTimeout(() => {
              setScannedImages(prev => ({
                ...prev,
                back: imageUrls.back,
                irBack: imageUrls.irBack,
                uvBack: imageUrls.uvBack
              }));
              
              // Beide Seiten vorhanden - jetzt Ergebnis zeigen
              completeVerification();
            }, 2500);
          }, 3000);
        } else if (isPassport(detectedDocClass)) {
          // Passport: nur eine Seite - Ergebnis sofort zeigen
          setTimeout(() => {
            completeVerification();
          }, 1000);
        } else {
          // Unbekannte Dokumentenklasse - Ergebnis zeigen
          setTimeout(() => {
            completeVerification();
          }, 1000);
        }
      }, 2500);
    }, 1500);
  };

  // Scanner Functions
  const checkScannerStatus = async () => {
    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.isElectron) {
        console.log('🔍 Running in Electron - checking local scanner...');
        const result = await window.electronAPI.checkScannerStatus();
        
        if (result.online) {
          setScannerOnline(true);
          setScannerStatus('online');
          console.log('✅ Scanner online (Electron):', result.url);
        } else {
          setScannerOnline(false);
          setScannerStatus('offline');
          console.log('❌ Scanner offline (Electron):', result.message);
        }
      } else {
        // Running in browser - use backend API
        console.log('🌐 Running in Browser - checking via backend...');
        const response = await fetch(`${BACKEND_URL}/api/scanner/regula/status`);
        const result = await response.json();
        
        if (result.online) {
          setScannerOnline(true);
          setScannerStatus('online');
          console.log('✅ Scanner online (Browser):', result.url);
        } else {
          setScannerOnline(false);
          setScannerStatus('offline');
          console.log('❌ Scanner offline (Browser)');
        }
      }
    } catch (error) {
      console.error('Scanner status check error:', error);
      setScannerOnline(false);
      setScannerStatus('offline');
    }
  };

  const handleScanDocument = async () => {
    // Check scanner mode
    const scannerMode = adminSettings.scannerMode || 'simulation';
    console.log('🔍 Scanner-Modus:', scannerMode);

    // If simulation mode, use mock data
    if (scannerMode === 'simulation') {
      console.log('📝 Simulation-Modus aktiviert - verwende Mock-Daten');
      toast.info('Simulation-Modus: Verwende Mock-Daten', { duration: 2000 });
      // Use existing mock verification
      completeVerification();
      return;
    }

    // Live mode - check if scanner is available
    if (!scannerOnline) {
      toast.error('Scanner ist nicht verfügbar. Bitte überprüfen Sie die Verbindung oder aktivieren Sie den Simulation-Modus.');
      return;
    }

    setIsScanning(true);
    setIsProcessing(true);
    
    const scanToastId = toast.loading('Scanner wird vorbereitet...');

    try {
      // Reset alle Daten vor Scan
      setVerificationData({
        ...emptyVerificationData,
        timestamp: formatDateTime()
      });
      
      setScannedImages({
        front: null,
        back: null,
        irFront: null,
        uvFront: null,
        irBack: null,
        uvBack: null,
        photo: null
      });

      toast.loading('Bitte legen Sie das Dokument ein...', { id: scanToastId });

      let result;

      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.isElectron) {
        console.log('🔍 Scanning via Electron...');
        console.log('📡 Calling window.electronAPI.performScan()...');
        
        try {
          result = await window.electronAPI.performScan({
            auto_scan: true,
            capture_uv: true,
            capture_ir: true,
            enable_rfid: true
          });
          console.log('📥 Scan result received:', result);
        } catch (scanError) {
          console.error('❌ Electron scan error:', scanError);
          toast.error('Scanner-Fehler: ' + scanError.message, { id: scanToastId });
          setIsScanning(false);
          setIsProcessing(false);
          return;
        }
      } else {
        // Running in browser - use backend API
        console.log('🌐 Scanning via Backend...');
        const response = await fetch(`${BACKEND_URL}/api/scanner/regula/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auto_scan: true,
            capture_uv: true,
            capture_ir: true,
            enable_rfid: true
          })
        });
        result = await response.json();
      }

      console.log('🔍 Checking scan result.success:', result?.success);
      
      if (!result || !result.success) {
        const errorMsg = result?.message || 'Scan fehlgeschlagen - Keine Antwort vom Scanner';
        console.error('❌ Scan failed:', errorMsg);
        toast.error('Scan fehlgeschlagen: ' + errorMsg, { id: scanToastId });
        setIsScanning(false);
        setIsProcessing(false);
        return;
      }
      
      console.log('✅ Scan erfolgreich! Verarbeite Daten...');

      toast.success('Dokument erfolgreich gescannt!', { id: scanToastId });

      // Process scanned images
      const newImages = {
        front: null,
        back: null,
        irFront: null,
        uvFront: null,
        irBack: null,
        uvBack: null,
        photo: null
      };

      // Map scanner images to our format
      if (result.images && result.images.length > 0) {
        result.images.forEach(img => {
          const imageType = img.type.toLowerCase();
          const imageData = `data:image/${img.format};base64,${img.data}`;
          
          if (imageType.includes('white') || imageType.includes('visible')) {
            if (!newImages.front) {
              newImages.front = imageData;
            } else {
              newImages.back = imageData;
            }
          } else if (imageType.includes('uv')) {
            if (!newImages.uvFront) {
              newImages.uvFront = imageData;
            } else {
              newImages.uvBack = imageData;
            }
          } else if (imageType.includes('ir') || imageType.includes('infrared')) {
            if (!newImages.irFront) {
              newImages.irFront = imageData;
            } else {
              newImages.irBack = imageData;
            }
          }
        });
      }

      setScannedImages(newImages);

      // Extract document data
      if (result.document_data) {
        const docData = result.document_data;
        setVerificationData({
          ...verificationData,
          documentClass: docData.document_type || 'Unbekannt',
          documentNumber: docData.document_number || '',
          firstName: docData.first_name || '',
          lastName: docData.last_name || '',
          birthDate: docData.birth_date || '',
          validUntil: docData.expiry_date || '',
          country: docData.issuing_country || '',
          gender: docData.sex || '',
          timestamp: formatDateTime()
        });
      }

      // Proceed with verification
      setHasDocument(true);
      setScanState('processing');
      setIsProcessing(false);
      setIsScanning(false);

      // Continue with normal verification flow
      setTimeout(() => {
        completeVerification();
      }, 1500);

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan-Fehler: ' + error.message, { id: scanToastId });
      setIsScanning(false);
      setIsProcessing(false);
    }
  };

  // Check scanner on mount and load PDF mappings
  useEffect(() => {
    checkScannerStatus();
    loadPdfMappings();
    // Check scanner status every 30 seconds
    const interval = setInterval(checkScannerStatus, 30000);
    
    // Reload PDF mappings when window gains focus
    const handleFocus = () => {
      loadPdfMappings();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Load PDF mappings from backend
  const loadPdfMappings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/pdf-documents/mappings`);
      const data = await response.json();
      if (data.success && data.mappings) {
        setPdfMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error loading PDF mappings:', error);
    }
  };

  // Open PDF in new window
  const openPdfInNewWindow = async (buttonType) => {
    const pdfId = pdfMappings[buttonType];
    
    if (!pdfId) {
      toast.error('Kein PDF-Dokument zugeordnet. Bitte weisen Sie ein PDF im Admin-Bereich zu.');
      return;
    }
    
    // Build the PDF URL
    const pdfUrl = `${BACKEND_URL}/api/pdf-documents/view/${pdfId}`;
    
    // Check if PDF exists before opening
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      if (!response.ok) {
        toast.error(`PDF-Dokument nicht gefunden (ID: ${pdfId}). Bitte überprüfen Sie die Zuordnung im Admin-Bereich.`);
        return;
      }
    } catch (error) {
      // If HEAD is not supported, try to open anyway
      console.log('HEAD request not supported, opening PDF anyway');
    }
    
    // Determine title based on button type
    const title = buttonType === 'frei1' ? 'AVB (DE)' : 'AVB (EN)';
    
    // Open in fullscreen viewer (new approach)
    setFullscreenPDFData({
      url: pdfUrl,
      title: title
    });
    setIsFullscreenPDFOpen(true);
  };
  
  const closeFullscreenPDF = () => {
    setIsFullscreenPDFOpen(false);
    setFullscreenPDFData({ url: '', title: '' });
  };

  const completeVerification = async () => {
    // Dismiss all loading toasts
    toast.dismiss();
    
    console.log('🔄 Starting verification with data:', mockVerificationData.documentNumber);
    console.log('📋 Admin Settings enableBannedCheck:', adminSettings.enableBannedCheck);
    
    // ⚠️ KRITISCH: Prüfe ZUERST ob Dokument gesperrt ist (BEVOR Status randomisiert wird!)
    // ABER NUR wenn enableBannedCheck aktiviert ist (oder undefined = default true)
    // enableBannedCheck === false bedeutet DEAKTIVIERT
    if (adminSettings.enableBannedCheck !== false) {
      console.log('🔍 Banned check is ENABLED - checking document...');
      const bannedCheck = await checkBannedDocument(mockVerificationData);
      console.log('🚨 Banned check result:', bannedCheck);
      
      if (bannedCheck && bannedCheck.is_banned) {
        console.log('⛔ DOKUMENT IST GESPERRT! Zeige Alert...');
        // Dokument ist gesperrt! Zeige sofort Alarm
        setBannedDocumentInfo(bannedCheck);
        setShowBannedAlert(true);
        
        // Setze Status auf error und blockiere
        setCurrentStatus('error');
        setScanState('waiting');
        setHasDocument(false);
        setIsProcessing(false);
        
        // STOPPE HIER - Keine weiteren Schritte!
        toast.error('⛔ Dokument ist gesperrt!', { duration: 5000 });
        return;
      }
    } else {
      console.log('✅ Banned document check is DISABLED - skipping check');
    }
    
    console.log('✅ Dokument ist nicht gesperrt, fahre fort...');
    
    // Wenn Dokument NICHT gesperrt ist, fahre mit normalem Scan fort
    const random = Math.random();
    let randomStatus;
    
    if (random < 0.15) {
      randomStatus = 'blurry';
      setScanState('waiting');
      setHasDocument(false);
      setScannedImages({
        front: null,
        back: null,
        irFront: null,
        uvFront: null,
        irBack: null,
        uvBack: null,
        photo: null
      });
    } else if (random > 0.7) {
      randomStatus = 'success';
      setScanState('verified');
      // Reset counters on success
      setUnknownAttempts(0);
      setErrorAttempts(0);
    } else if (random > 0.4) {
      randomStatus = 'warning';  // Unknown document
      setScanState('verified');
      
      // Increment unknown counter
      const newCount = unknownAttempts + 1;
      setUnknownAttempts(newCount);
      
      // Check if threshold reached
      if (newCount >= adminSettings.maxUnknownAttempts) {
        await reportFlaggedScan('unknown', newCount);
        setUnknownAttempts(0); // Reset after reporting
      }
    } else {
      randomStatus = 'error';  // Error document
      setScanState('waiting');
      setHasDocument(false);
      
      // Increment error counter
      const newCount = errorAttempts + 1;
      setErrorAttempts(newCount);
      
      // Check if threshold reached
      if (newCount >= adminSettings.maxErrorAttempts) {
        await reportFlaggedScan('error', newCount);
        setErrorAttempts(0); // Reset after reporting
      }
    }
    
    setCurrentStatus(randomStatus);
    
    // Für Führerscheine: OCR-Analyse durchführen
    let licenseClassData = null;
    if (mockVerificationData.documentClass === 'Führerschein' && randomStatus === 'success') {
      licenseClassData = await analyzeLicenseClasses();
    }
    
    setVerificationData({
      ...mockVerificationData,
      status: randomStatus,
      timestamp: formatDateTime(),
      licenseClasses: licenseClassData
    });
    setIsProcessing(false);
  };
  
  // Neue Funktion: Führerscheinklassen-Analyse
  const analyzeLicenseClasses = async () => {
    try {
      // Mock-OCR-Daten (in Produktion würden diese vom Scanner kommen)
      const mockOcrData = {
        front_fields: [
          { field_number: "9", value: "B, BE, C, C1, C1E", confidence: 0.95 }
        ],
        back_fields: [
          { field_number: "validity", value: "9. B    10. 15.10.2015    11. 15.10.2030" },
          { field_number: "validity", value: "9. BE   10. 15.10.2015    11. 15.10.2030" },
          { field_number: "validity", value: "9. C    10. 15.10.2018    11. 15.10.2030" },
          { field_number: "validity", value: "9. C1   10. 15.10.2015    11. 15.10.2024" },
          { field_number: "validity", value: "9. C1E  10. 15.10.2015    11. 15.10.2024" }
        ]
      };
      
      // Rufe Backend-API auf
      const response = await fetch(`${BACKEND_URL}/api/license-classes/analyze?rental_class=C`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockOcrData)
      });
      
      if (!response.ok) {
        console.error('Fehler bei der Führerscheinklassen-Analyse');
        return null;
      }
      
      const analysisData = await response.json();
      return analysisData;
      
    } catch (error) {
      console.error('Fehler bei der OCR-Analyse:', error);
      return null;
    }
  };
  
  // Neue Funktion: Prüfe ob Dokument gesperrt ist
  const checkBannedDocument = async (documentData) => {
    try {
      console.log('🔍 Checking banned document:', documentData.documentNumber);
      
      // Verwende Simulations-Station falls aktiviert
      const stationId = adminSettings.simulationMode && adminSettings.simulationStationId 
        ? adminSettings.simulationStationId 
        : adminSettings.deviceId;
      const stationName = adminSettings.simulationMode && adminSettings.simulationStationName
        ? adminSettings.simulationStationName
        : adminSettings.stationName;
      
      const checkRequest = {
        document_number: documentData.documentNumber,
        document_type: documentData.documentClass,
        issuing_country: documentData.country || 'D',
        person_info: {
          first_name: documentData.firstName,
          last_name: documentData.lastName,
          birth_date: documentData.birthDate
        },
        station_id: stationId,
        station_name: stationName
      };
      
      console.log('📤 Sending check request:', checkRequest);
      
      const response = await fetch(`${BACKEND_URL}/api/banned-documents/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkRequest)
      });
      
      if (!response.ok) {
        console.error('❌ Fehler beim Check von gesperrten Dokumenten');
        return null;
      }
      
      const checkResult = await response.json();
      console.log('📥 Check result:', checkResult);
      
      return checkResult;
      
    } catch (error) {
      console.error('❌ Fehler beim Banned Document Check:', error);
      return null;
    }
  };
  
  const reportFlaggedScan = async (type, attempts) => {
    try {
      // Show modal
      setFlaggedModalType(type);
      const message = type === 'unknown' 
        ? adminSettings.unknownDocumentMessage 
        : adminSettings.errorDocumentMessage;
      
      setShowFlaggedModal(true);
      
      if (adminSettings.requireConfirmation) {
        setCanContinueScanning(false);
      }
      
      // Prepare scan data for API
      const scanData = {
        scan_type: type,
        document_class: verificationData.documentClass,
        document_number: verificationData.documentNumber,
        station_id: adminSettings.deviceId,
        station_name: adminSettings.stationName,
        operator_name: securityUser ? securityUser.name : 'Unbekannt',
        attempts: attempts,
        images: [
          scannedImages.front && { type: 'front', url: scannedImages.front },
          scannedImages.back && { type: 'back', url: scannedImages.back },
          scannedImages.irFront && { type: 'ir', url: scannedImages.irFront },
          scannedImages.uvFront && { type: 'uv', url: scannedImages.uvFront }
        ].filter(Boolean),
        extracted_data: {
          firstName: verificationData.firstName,
          lastName: verificationData.lastName,
          birthDate: verificationData.birthDate,
          validUntil: verificationData.validUntil
        },
        reason: `${type === 'unknown' ? 'Unbekanntes' : 'Fehlerhaftes'} Dokument nach ${attempts} Versuchen`
      };
      
      // Call API to save flagged scan
      const response = await fetch(`${BACKEND_URL}/api/flagged-scans/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scanData)
      });
      
      if (!response.ok) {
        console.error('Failed to report flagged scan');
      }
      
    } catch (error) {
      console.error('Error reporting flagged scan:', error);
    }
  };
  
  const handleFlaggedModalConfirm = () => {
    setShowFlaggedModal(false);
    setCanContinueScanning(true);
  };
  
  const handleFlaggedModalCancel = () => {
    if (!adminSettings.requireConfirmation) {
      setShowFlaggedModal(false);
    }
  };

  const handleAction = (action) => {
    if (action === 'start') {
      // Save current verification to history before resetting
      if (hasDocument || scannedImages.photo) {
        const currentVerification = {
          id: Date.now(),
          ...verificationData,
          images: scannedImages,
          timestamp: new Date().toISOString(),
          securityUser: securityUser ? {
            employeeNumber: securityUser.employeeNumber,
            name: securityUser.name
          } : null
        };
        setVerificationHistory([currentVerification, ...verificationHistory]);
      }
      
      resetAllData();
      return;
    }

    const messages = {
      approve: 'Dokument genehmigt',
      reject: 'Dokument abgelehnt',
      flag: 'Dokument markiert',
      report: 'Bericht wird erstellt'
    };
    toast.success(messages[action]);
    
    if (action === 'approve' || action === 'reject') {
      setTimeout(() => {
        resetAllData();
      }, 1000);
    }
  };

  const handlePinSuccess = () => {
    if (pinPadPurpose === 'admin') {
      // Open admin panel
      setIsAdminPanelOpen(true);
      setIsPinPadOpen(false);
      toast.success('Willkommen im Administrator-Bereich!');
    } else {
      // Regular unlock
      setIsUnlocked(true);
      setIsPinPadOpen(false);
      toast.success('Entsperrt! Automatische Sperre nach 2 Minuten Inaktivität.');
    }
  };

  const handleAdminClick = () => {
    setPinPadPurpose('admin');
    setIsPinPadOpen(true);
  };

  const handleLockClick = () => {
    if (securityUser) {
      // Logout security user
      const userName = securityUser.name;
      setSecurityUser(null);
      setIsUnlocked(false);
      showInfoMessage(`${userName} ausgeloggt`, 'success');
    } else {
      // Open security login
      setIsSecurityLoginOpen(true);
    }
  };

  // Custom info message system - shows messages in DataPanel instead of toast
  const showInfoMessage = (message, type = 'info', details = null, duration = 4000) => {
    const newMessage = { id: Date.now(), message, type, details };
    setInfoMessages(prev => [...prev, newMessage]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setInfoMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    }, duration);
  };

  // New handlers for expanded functionality
  const handleSecurityLogin = (user) => {
    setSecurityUser(user);
    // All security users get automatic unlock after login
    setIsUnlocked(true);
    resetAutoResetTimer();
    // Show info in DataPanel instead of toast
    showInfoMessage(`${user.name} (${user.employeeNumber})`, 'success', `${user.role === 'Admin' ? 'Administrator' : 'Security-Mitarbeiter'} • Eingeloggt`);
  };

  const handleSecurityAction = (action) => {
    if (!securityUser) {
      setIsSecurityLoginOpen(true);
      return;
    }
    
    if (action === 'problem') {
      // Open ticket system
      setIsTicketSystemOpen(true);
      return;
    }
    
    // Save to history with security user
    const currentVerification = {
      id: Date.now(),
      ...verificationData,
      images: scannedImages,
      timestamp: new Date().toISOString(),
      action,
      securityUser: {
        employeeNumber: securityUser.employeeNumber,
        name: securityUser.name
      }
    };
    
    setVerificationHistory([currentVerification, ...verificationHistory]);
    
    const actionText = action === 'approved' ? 'Genehmigt' : action === 'rejected' ? 'Abgelehnt' : 'Markiert';
    showInfoMessage(actionText, 'success', `von ${securityUser.name}`);
    resetAutoResetTimer();
  };

  const resetAllData = () => {
    setScannedImages({
      front: null,
      back: null,
      irFront: null,
      uvFront: null,
      irBack: null,
      uvBack: null,
      photo: null
    });
    setHasDocument(false);
    setScanState('waiting');
    setCurrentStatus('idle');
    setVerificationData({
      ...emptyVerificationData,
      timestamp: formatDateTime()
    });
    setSecurityUser(null);
    showInfoMessage('Daten zurückgesetzt', 'info');
  };

  const resetAutoResetTimer = () => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
    }
    
    // Only start timer if we have data to reset
    if (hasDocument || scannedImages.photo) {
      autoResetTimerRef.current = setTimeout(() => {
        resetAllData();
        toast('Automatisch zurückgesetzt nach Inaktivität', { icon: '⏱️' });
      }, adminSettings.autoResetMinutes * 60 * 1000);
    }
  };

  // Reset timer on any interaction
  useEffect(() => {
    const handleInteraction = () => {
      resetAutoResetTimer();
    };

    if (hasDocument || scannedImages.photo) {
      window.addEventListener('mousedown', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);
      window.addEventListener('keydown', handleInteraction);
      window.addEventListener('click', handleInteraction);

      return () => {
        window.removeEventListener('mousedown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('click', handleInteraction);
      };
    }
  }, [hasDocument, scannedImages.photo, adminSettings.autoResetMinutes]);

  const handleStatusBarClick = () => {
    if (hasDocument || scannedImages.photo) {
      resetAllData();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Simulationsmodus Badge - OBEN RECHTS */}
      {adminSettings.simulationMode && adminSettings.simulationStationId && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-blue-400 animate-pulse">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <div>
                <div className="text-xs font-bold">SIMULATIONSMODUS</div>
                <div className="text-xs font-mono">{adminSettings.simulationStationId} - {adminSettings.simulationStationName}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Bar with Burger Menu */}
      <div className="relative">
        {/* Burger Menu Button - LARGER */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu className="h-12 w-12 text-white" strokeWidth={2.5} />
        </button>
        
        <div onClick={handleStatusBarClick} className="cursor-pointer">
          <StatusBar 
            status={currentStatus} 
            isProcessing={isProcessing} 
            hasDocument={hasDocument}
            scanState={scanState}
          />
        </div>
      </div>
      
      {/* Main Content - 3 Horizontal Blocks */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex gap-4 p-4 overflow-auto">
          <div className="flex-1 flex flex-col gap-2">
            <DocumentPreview 
              scannedImages={scannedImages} 
              onImageClick={setSelectedImage}
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <PersonPhoto 
              scanState={scanState} 
              photoUrl={scannedImages.photo}
              onImageClick={() => scannedImages.photo && setSelectedImage({ url: scannedImages.photo, label: 'Portrait' })}
            />
          </div>
          
          <div className="flex-1 flex flex-col overflow-y-auto">
            <DataPanel 
              data={verificationData} 
              status={currentStatus} 
              infoMessages={infoMessages}
            />
          </div>
        </div>
        
        {/* Symmetrische Button-Reihe unter den 3 Bereichen */}
        <div className="flex gap-4 px-4 pb-2">
          {/* Button unter Dokumente */}
          <div className="flex-1">
            <Button
              onClick={() => openPdfInNewWindow('frei1')}
              disabled={isProcessing}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              AVB (DE)
            </Button>
          </div>
          
          {/* Upload Button unter Portrait - nur sichtbar wenn aktiviert */}
          <div className="flex-1">
            {adminSettings.uploadEnabled && (
              <>
                <input
                  id="document-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleScanDocument}
                    disabled={isProcessing || isScanning}
                    className="w-full relative"
                    variant={(adminSettings.scannerMode === 'live' && scannerOnline) ? "default" : "outline"}
                    size="sm"
                  >
                    <Scan className="mr-2 h-4 w-4" />
                    {isScanning ? 'Scanne...' : 
                      adminSettings.scannerMode === 'simulation' ? 'Scanner (Sim)' : 'Scanner'}
                    {adminSettings.scannerMode === 'live' && scannerOnline && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                    {adminSettings.scannerMode === 'simulation' && (
                      <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded">SIM</span>
                    )}
                  </Button>
                  <Button
                    onClick={() => document.getElementById('document-upload').click()}
                    disabled={isProcessing}
                    className="w-full"
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </>
            )}
          </div>
          
          {/* Button unter Ausweisdaten */}
          <div className="flex-1">
            <Button
              onClick={() => openPdfInNewWindow('frei2')}
              disabled={isProcessing}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              AVB (EN)
            </Button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 pb-4">
          <div className="space-y-3">
            <Button
              onClick={simulateNewVerification}
              disabled={isProcessing}
              className="w-full text-primary-foreground font-semibold"
              style={{ backgroundColor: '#c00000' }}
              onMouseEnter={(e) => !isProcessing && (e.currentTarget.style.backgroundColor = '#a00000')}
              onMouseLeave={(e) => !isProcessing && (e.currentTarget.style.backgroundColor = '#c00000')}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Verarbeite...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Neue Prüfung starten
                </>
              )}
            </Button>
            
            <ActionButtons 
              onAction={handleAction} 
              isUnlocked={isUnlocked}
              securityUser={securityUser}
              onSecurityAction={handleSecurityAction}
              hasDocument={hasDocument}
              currentStatus={currentStatus}
              onSecurityDashboard={() => setIsSecurityDashboardOpen(true)}
            />
          </div>
        </div>
      </div>
      
      {/* Footer with Lock Icon */}
      <FooterInfo 
        data={verificationData}
        settings={adminSettings}
        onLockClick={handleLockClick}
        isUnlocked={isUnlocked}
        securityUser={securityUser}
      />
      
      {/* Modals */}
      <ImageModal 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      
      <SideMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onAdminClick={handleAdminClick}
        onHistoryClick={() => setIsHistoryOpen(true)}
      />
      
      <PinPad
        isOpen={isPinPadOpen}
        onClose={() => setIsPinPadOpen(false)}
        onSuccess={handlePinSuccess}
      />
      
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        settings={adminSettings}
        onSettingsChange={setAdminSettings}
        securityUsers={securityUsers}
        onSecurityUsersChange={setSecurityUsers}
      />

      <SecurityLogin
        isOpen={isSecurityLoginOpen}
        onClose={() => setIsSecurityLoginOpen(false)}
        onSuccess={handleSecurityLogin}
        securityUsers={securityUsers}
      />

      <VerificationHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        verifications={verificationHistory}
        datenschutzTage={adminSettings.datenschutzTage}
      />

      <TicketSystem
        isOpen={isTicketSystemOpen}
        onClose={() => setIsTicketSystemOpen(false)}
        verifications={verificationHistory}
        securityUser={securityUser}
      />
      
      <FlaggedDocumentModal
        isOpen={showFlaggedModal}
        type={flaggedModalType}
        message={flaggedModalType === 'unknown' 
          ? adminSettings.unknownDocumentMessage 
          : adminSettings.errorDocumentMessage}
        onConfirm={handleFlaggedModalConfirm}
        onCancel={handleFlaggedModalCancel}
        requireConfirmation={adminSettings.requireConfirmation}
      />
      
      <SecurityDashboard
        isOpen={isSecurityDashboardOpen}
        onClose={() => setIsSecurityDashboardOpen(false)}
        securityUser={securityUser}
      />
      
      {/* Banned Document Alert - Vollbild-Warnung */}
      {showBannedAlert && bannedDocumentInfo && (
        <BannedDocumentAlert
          banInfo={bannedDocumentInfo}
          onClose={() => {
            setShowBannedAlert(false);
            setBannedDocumentInfo(null);
            // Reset alles nach Warnung
            resetAllData();
          }}
          stationInfo={{
            stationName: adminSettings.simulationMode && adminSettings.simulationStationName
              ? adminSettings.simulationStationName
              : adminSettings.stationName,
            stationId: adminSettings.simulationMode && adminSettings.simulationStationId
              ? adminSettings.simulationStationId
              : adminSettings.deviceId
          }}
        />
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPDFViewerOpen}
        onClose={() => setIsPDFViewerOpen(false)}
        pdfId={currentPDF.id}
        title={currentPDF.title}
      />

      {/* ReaderDemo Manager - Electron only */}
      <ReaderDemoManager />
      
      {/* Fullscreen PDF Viewer */}
      {isFullscreenPDFOpen && (
        <PDFFullscreenViewer
          pdfUrl={fullscreenPDFData.url}
          title={fullscreenPDFData.title}
          onClose={closeFullscreenPDF}
        />
      )}
    </div>
  );
};

export default VerificationInterface;
