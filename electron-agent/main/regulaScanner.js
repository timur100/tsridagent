/**
 * Regula Scanner - Direkter Zugriff über electron-edge-js
 * 
 * Dieser Code ruft die Regula SDK direkt aus Electron auf,
 * ohne eine separate Bridge-Anwendung zu benötigen.
 * 
 * Unterstützt: Regula 7028M.111 Scanner
 * 
 * Die Integration funktioniert über:
 * 1. electron-edge-js - führt C# Code direkt in Node.js aus
 * 2. Regula COM/ActiveX Komponente (PassportReader.SDK)
 */

const path = require('path');
const { EventEmitter } = require('events');
let edge;

try {
  edge = require('electron-edge-js');
} catch (e) {
  console.error('electron-edge-js nicht verfügbar:', e.message);
}

// Pfad zur Regula SDK (wird bei der Installation angepasst)
const REGULA_SDK_PATH = process.env.REGULA_SDK_PATH || 'C:\\Program Files\\Regula\\Document Reader SDK';

// C# Code der direkt in Node.js ausgeführt wird
// Basiert auf der Analyse der Benutzer-Anwendung (FrmMain.cs)
const regulaCode = `
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Linq;

public class RegulaScanner
{
    // Statische Variablen für die Regula SDK
    private static dynamic _reader = null;
    private static bool _isInitialized = false;
    private static bool _isConnected = false;
    private static Dictionary<string, object> _lastResult = null;
    private static List<Dictionary<string, object>> _lastImages = null;
    private static string _lastError = null;
    
    // Bekannte Regula COM ProgIDs
    private static readonly string[] REGULA_PROG_IDS = new string[] {
        "PassportReader.SDK",
        "PassportReader.ABOREAD",
        "RegulaReader.SDK",
        "READERDEMO.RegulaReader",
        "Regula.DocumentReader"
    };
    
    /// <summary>
    /// Gibt den aktuellen Status zurück
    /// </summary>
    public async Task<object> GetStatus(dynamic input)
    {
        var installedComponents = FindInstalledComponents();
        
        return new {
            available = _reader != null || installedComponents.Count > 0,
            initialized = _isInitialized,
            connected = _isConnected,
            sdkPath = input?.sdkPath?.ToString() ?? REGULA_SDK_PATH,
            lastError = _lastError,
            installedComponents = installedComponents
        };
    }
    
    /// <summary>
    /// Sucht nach installierten Regula Komponenten
    /// </summary>
    private List<string> FindInstalledComponents()
    {
        var found = new List<string>();
        foreach (var progId in REGULA_PROG_IDS)
        {
            try
            {
                Type t = Type.GetTypeFromProgID(progId);
                if (t != null)
                {
                    found.Add(progId);
                }
            }
            catch { }
        }
        return found;
    }
    
    /// <summary>
    /// Initialisiert die Regula SDK
    /// </summary>
    public async Task<object> Initialize(dynamic input)
    {
        _lastError = null;
        
        try
        {
            if (_isInitialized && _reader != null)
            {
                return new { success = true, message = "Bereits initialisiert" };
            }
            
            // Versuche verschiedene ProgIDs
            Type regulaType = null;
            string usedProgId = null;
            
            foreach (var progId in REGULA_PROG_IDS)
            {
                regulaType = Type.GetTypeFromProgID(progId);
                if (regulaType != null)
                {
                    usedProgId = progId;
                    break;
                }
            }
            
            if (regulaType != null)
            {
                _reader = Activator.CreateInstance(regulaType);
                _isInitialized = true;
                
                // Versuche InBackground zu setzen (blendet UI aus)
                try
                {
                    _reader.InBackground = true;
                }
                catch { }
                
                return new { 
                    success = true, 
                    message = "Regula SDK initialisiert",
                    progId = usedProgId
                };
            }
            else
            {
                _lastError = "Keine Regula COM-Komponente gefunden. Bitte installieren Sie die Regula SDK.";
                return new { 
                    success = false, 
                    error = _lastError,
                    searchedProgIds = REGULA_PROG_IDS
                };
            }
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return new { success = false, error = ex.Message };
        }
    }
    
    /// <summary>
    /// Verbindet den Scanner
    /// </summary>
    public async Task<object> Connect(dynamic input)
    {
        _lastError = null;
        
        try
        {
            // Zuerst initialisieren falls nötig
            if (!_isInitialized || _reader == null)
            {
                var initResult = await Initialize(input);
                var initDict = (IDictionary<string, object>)initResult;
                if (initDict.ContainsKey("success") && !(bool)initDict["success"])
                {
                    return initResult;
                }
            }
            
            // Verbindungsmethoden versuchen (je nach SDK Version)
            string[] connectMethods = { "Connect", "Open", "InitReader", "StartReader" };
            bool connected = false;
            string usedMethod = null;
            
            foreach (var method in connectMethods)
            {
                try
                {
                    var methodInfo = _reader.GetType().GetMethod(method);
                    if (methodInfo != null)
                    {
                        methodInfo.Invoke(_reader, null);
                        connected = true;
                        usedMethod = method;
                        break;
                    }
                }
                catch (Exception) { }
            }
            
            if (connected)
            {
                _isConnected = true;
                return new { 
                    success = true, 
                    message = "Scanner verbunden",
                    method = usedMethod
                };
            }
            else
            {
                // Manche SDKs sind bereits verbunden nach Initialisierung
                _isConnected = true;
                return new { 
                    success = true, 
                    message = "Scanner bereit (keine explizite Verbindung nötig)"
                };
            }
        }
        catch (Exception ex)
        {
            _isConnected = false;
            _lastError = ex.Message;
            return new { success = false, error = "Scanner-Verbindung fehlgeschlagen: " + ex.Message };
        }
    }
    
    /// <summary>
    /// Trennt den Scanner
    /// </summary>
    public async Task<object> Disconnect(dynamic input)
    {
        try
        {
            if (_reader != null)
            {
                string[] disconnectMethods = { "Disconnect", "Close", "StopReader", "FreeReader" };
                
                foreach (var method in disconnectMethods)
                {
                    try
                    {
                        var methodInfo = _reader.GetType().GetMethod(method);
                        if (methodInfo != null)
                        {
                            methodInfo.Invoke(_reader, null);
                            break;
                        }
                    }
                    catch { }
                }
            }
            
            _isConnected = false;
            return new { success = true, message = "Scanner getrennt" };
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return new { success = false, error = ex.Message };
        }
    }
    
    /// <summary>
    /// Führt einen Scan durch
    /// </summary>
    public async Task<object> Scan(dynamic input)
    {
        _lastError = null;
        _lastResult = new Dictionary<string, object>();
        _lastImages = new List<Dictionary<string, object>>();
        
        try
        {
            if (!_isConnected)
            {
                var connectResult = await Connect(input);
                var connDict = (IDictionary<string, object>)connectResult;
                if (connDict.ContainsKey("success") && !(bool)connDict["success"])
                {
                    return connectResult;
                }
            }
            
            // Scan-Methoden versuchen
            string[] scanMethods = { "GetImages", "ProcessDocument", "Scan", "ReadDocument", "StartScan" };
            bool scanStarted = false;
            string usedMethod = null;
            
            foreach (var method in scanMethods)
            {
                try
                {
                    var methodInfo = _reader.GetType().GetMethod(method);
                    if (methodInfo != null)
                    {
                        methodInfo.Invoke(_reader, null);
                        scanStarted = true;
                        usedMethod = method;
                        break;
                    }
                }
                catch { }
            }
            
            if (!scanStarted)
            {
                _lastError = "Keine Scan-Methode gefunden";
                return new { success = false, error = _lastError };
            }
            
            // Warte auf Ergebnis (die Regula SDK arbeitet asynchron)
            System.Threading.Thread.Sleep(3000);
            
            // Ergebnisse auslesen
            ReadScanResults();
            
            return new { 
                success = true, 
                result = _lastResult,
                images = _lastImages,
                method = usedMethod,
                timestamp = DateTime.Now.ToString("o")
            };
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return new { success = false, error = "Scan fehlgeschlagen: " + ex.Message };
        }
    }
    
    /// <summary>
    /// Liest die Scan-Ergebnisse aus
    /// </summary>
    private void ReadScanResults()
    {
        if (_reader == null) return;
        
        var readerType = _reader.GetType();
        
        // MRZ-Daten auslesen
        var mrzData = new Dictionary<string, object>();
        string[] mrzProps = { "MRZLine1", "MRZLine2", "MRZLine3", "MRZ", "MRZData" };
        
        foreach (var prop in mrzProps)
        {
            try
            {
                var propInfo = readerType.GetProperty(prop);
                if (propInfo != null)
                {
                    var value = propInfo.GetValue(_reader);
                    if (value != null)
                    {
                        mrzData[prop] = value.ToString();
                    }
                }
            }
            catch { }
        }
        
        if (mrzData.Count > 0)
        {
            _lastResult["mrz"] = mrzData;
        }
        
        // Dokumenttyp
        try
        {
            var docTypeProp = readerType.GetProperty("DocumentType") ?? readerType.GetProperty("DocType");
            if (docTypeProp != null)
            {
                var value = docTypeProp.GetValue(_reader);
                if (value != null)
                {
                    _lastResult["documentType"] = value.ToString();
                }
            }
        }
        catch { }
        
        // Persönliche Daten
        string[] personalProps = { "FirstName", "LastName", "Surname", "GivenName", 
            "DateOfBirth", "ExpiryDate", "Nationality", "Gender", "DocumentNumber" };
        
        var personalData = new Dictionary<string, object>();
        foreach (var prop in personalProps)
        {
            try
            {
                var propInfo = readerType.GetProperty(prop);
                if (propInfo != null)
                {
                    var value = propInfo.GetValue(_reader);
                    if (value != null)
                    {
                        personalData[prop] = value.ToString();
                    }
                }
            }
            catch { }
        }
        
        if (personalData.Count > 0)
        {
            _lastResult["personalData"] = personalData;
        }
        
        // Authentizität
        try
        {
            var authProp = readerType.GetProperty("AuthenticityCheckResult") ?? 
                           readerType.GetProperty("IsAuthentic") ??
                           readerType.GetProperty("Authenticity");
            if (authProp != null)
            {
                var value = authProp.GetValue(_reader);
                if (value != null)
                {
                    _lastResult["authenticity"] = value.ToString();
                }
            }
        }
        catch { }
        
        // Bilder auslesen (falls GetReaderFileImage verfügbar)
        try
        {
            var getImageMethod = readerType.GetMethod("GetReaderFileImage");
            if (getImageMethod != null)
            {
                // White light image (Light type 6 = White)
                try
                {
                    var whiteImg = getImageMethod.Invoke(_reader, new object[] { 1, 6 });
                    if (whiteImg != null)
                    {
                        _lastImages.Add(new Dictionary<string, object> {
                            { "type", "White" },
                            { "data", ConvertToBase64(whiteImg) }
                        });
                    }
                }
                catch { }
                
                // UV image (Light type 128 = UV)
                try
                {
                    var uvImg = getImageMethod.Invoke(_reader, new object[] { 1, 128 });
                    if (uvImg != null)
                    {
                        _lastImages.Add(new Dictionary<string, object> {
                            { "type", "UV" },
                            { "data", ConvertToBase64(uvImg) }
                        });
                    }
                }
                catch { }
                
                // IR image (Light type 16 = IR)
                try
                {
                    var irImg = getImageMethod.Invoke(_reader, new object[] { 1, 16 });
                    if (irImg != null)
                    {
                        _lastImages.Add(new Dictionary<string, object> {
                            { "type", "IR" },
                            { "data", ConvertToBase64(irImg) }
                        });
                    }
                }
                catch { }
            }
        }
        catch { }
    }
    
    /// <summary>
    /// Konvertiert Bilddaten zu Base64
    /// </summary>
    private string ConvertToBase64(object imageData)
    {
        try
        {
            if (imageData is byte[] bytes)
            {
                return Convert.ToBase64String(bytes);
            }
            if (imageData is Bitmap bitmap)
            {
                using (var ms = new MemoryStream())
                {
                    bitmap.Save(ms, ImageFormat.Jpeg);
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
            if (imageData is Image img)
            {
                using (var ms = new MemoryStream())
                {
                    img.Save(ms, ImageFormat.Jpeg);
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
            // Für stdole.StdPicture oder ähnliche COM-Objekte
            // Versuche über Handle zu konvertieren
            var handleProp = imageData.GetType().GetProperty("Handle");
            if (handleProp != null)
            {
                var handle = (IntPtr)handleProp.GetValue(imageData);
                using (var bmp = Bitmap.FromHbitmap(handle))
                using (var ms = new MemoryStream())
                {
                    bmp.Save(ms, ImageFormat.Jpeg);
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
        }
        catch { }
        return "";
    }
    
    /// <summary>
    /// Gibt das letzte Scan-Ergebnis zurück
    /// </summary>
    public async Task<object> GetLastResult(dynamic input)
    {
        return new {
            success = _lastResult != null && _lastResult.Count > 0,
            result = _lastResult,
            images = _lastImages
        };
    }
    
    /// <summary>
    /// Gibt verfügbare Methoden und Eigenschaften des Readers zurück (für Debugging)
    /// </summary>
    public async Task<object> GetReaderInfo(dynamic input)
    {
        if (_reader == null)
        {
            return new { success = false, error = "Reader nicht initialisiert" };
        }
        
        var readerType = _reader.GetType();
        var methods = readerType.GetMethods().Select(m => m.Name).Distinct().ToArray();
        var properties = readerType.GetProperties().Select(p => p.Name).ToArray();
        
        return new {
            success = true,
            typeName = readerType.FullName,
            methods = methods,
            properties = properties
        };
    }
}
`;

/**
 * RegulaScanner Klasse - Node.js Wrapper für electron-edge-js
 * 
 * Ermöglicht direkte Kommunikation mit der Regula SDK aus Electron heraus.
 */
class RegulaScanner extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.isConnected = false;
    this.edgeFunctions = {};
    this.lastError = null;
  }

  /**
   * Initialisiert die Edge-Funktionen
   */
  async initialize() {
    if (!edge) {
      this.lastError = 'electron-edge-js ist nicht verfügbar. ' +
        'Stellen Sie sicher, dass die native Module korrekt kompiliert wurden.';
      throw new Error(this.lastError);
    }

    if (this.isInitialized) {
      return { success: true, message: 'Bereits initialisiert' };
    }

    try {
      console.log('[RegulaScanner] Initialisiere Edge-Funktionen...');
      
      // Edge-Funktionen erstellen
      this.edgeFunctions.getStatus = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'GetStatus'
      });

      this.edgeFunctions.init = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'Initialize'
      });

      this.edgeFunctions.connect = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'Connect'
      });

      this.edgeFunctions.disconnect = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'Disconnect'
      });

      this.edgeFunctions.scan = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'Scan'
      });

      this.edgeFunctions.getLastResult = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'GetLastResult'
      });

      this.edgeFunctions.getReaderInfo = edge.func({
        source: regulaCode,
        typeName: 'RegulaScanner',
        methodName: 'GetReaderInfo'
      });

      this.isInitialized = true;
      console.log('[RegulaScanner] Edge-Funktionen erfolgreich initialisiert');
      this.emit('initialized');
      return { success: true };
    } catch (error) {
      this.lastError = error.message;
      console.error('[RegulaScanner] Fehler bei Initialisierung:', error);
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prüft ob die Regula SDK verfügbar ist
   */
  async checkAvailability() {
    if (!edge) {
      return {
        available: false,
        error: 'electron-edge-js nicht verfügbar',
        platform: process.platform
      };
    }
    
    // edge-js funktioniert nur auf Windows mit .NET Framework
    if (process.platform !== 'win32') {
      return {
        available: false,
        error: 'Regula Scanner Integration nur auf Windows verfügbar',
        platform: process.platform
      };
    }
    
    return {
      available: true,
      platform: process.platform
    };
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  async getStatus() {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return {
        available: false,
        connected: false,
        initialized: false,
        error: availability.error,
        platform: availability.platform
      };
    }

    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return {
          available: false,
          connected: false,
          initialized: false,
          error: initResult.error
        };
      }
    }
    
    return new Promise((resolve, reject) => {
      this.edgeFunctions.getStatus({ sdkPath: REGULA_SDK_PATH }, (error, result) => {
        if (error) {
          console.error('[RegulaScanner] GetStatus Fehler:', error);
          resolve({
            available: false,
            connected: false,
            initialized: false,
            error: error.message
          });
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Initialisiert und verbindet den Scanner
   */
  async connect() {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    console.log('[RegulaScanner] Verbinde Scanner...');
    
    return new Promise((resolve, reject) => {
      this.edgeFunctions.connect({ sdkPath: REGULA_SDK_PATH }, (error, result) => {
        if (error) {
          console.error('[RegulaScanner] Connect Fehler:', error);
          this.isConnected = false;
          this.emit('error', error);
          resolve({ success: false, error: error.message });
        } else {
          this.isConnected = result.success;
          if (result.success) {
            console.log('[RegulaScanner] Scanner verbunden:', result.message);
            this.emit('connected', result);
          }
          resolve(result);
        }
      });
    });
  }

  /**
   * Trennt den Scanner
   */
  async disconnect() {
    if (!this.isInitialized) {
      return { success: true, message: 'Nicht verbunden' };
    }

    console.log('[RegulaScanner] Trenne Scanner...');
    
    return new Promise((resolve, reject) => {
      this.edgeFunctions.disconnect({}, (error, result) => {
        this.isConnected = false;
        if (error) {
          console.error('[RegulaScanner] Disconnect Fehler:', error);
          resolve({ success: false, error: error.message });
        } else {
          console.log('[RegulaScanner] Scanner getrennt');
          this.emit('disconnected');
          resolve(result);
        }
      });
    });
  }

  /**
   * Führt einen Scan durch
   */
  async scan(options = {}) {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    console.log('[RegulaScanner] Starte Scan...');
    this.emit('scanStarted');
    
    return new Promise((resolve, reject) => {
      this.edgeFunctions.scan(options, (error, result) => {
        if (error) {
          console.error('[RegulaScanner] Scan Fehler:', error);
          this.emit('scanError', error);
          resolve({ success: false, error: error.message });
        } else {
          console.log('[RegulaScanner] Scan abgeschlossen:', result.success);
          if (result.success) {
            this.emit('scanComplete', result);
          }
          resolve(result);
        }
      });
    });
  }

  /**
   * Gibt das letzte Scan-Ergebnis zurück
   */
  async getLastResult() {
    if (!this.isInitialized) {
      return { success: false, error: 'Nicht initialisiert' };
    }

    return new Promise((resolve, reject) => {
      this.edgeFunctions.getLastResult({}, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Gibt Debug-Informationen über den Reader zurück
   */
  async getReaderInfo() {
    if (!this.isInitialized) {
      return { success: false, error: 'Nicht initialisiert' };
    }

    return new Promise((resolve, reject) => {
      this.edgeFunctions.getReaderInfo({}, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Gibt die Bilder des letzten Scans zurück
   */
  async getImages() {
    const result = await this.getLastResult();
    if (result.success && result.images) {
      return { success: true, images: result.images };
    }
    return { success: false, images: [] };
  }
}

// Singleton-Instanz
const regulaScanner = new RegulaScanner();

module.exports = { RegulaScanner, regulaScanner };
