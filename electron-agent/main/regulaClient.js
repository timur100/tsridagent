/**
 * Regula Scanner Service Client
 * 
 * Kommuniziert mit der RegulaService Bridge (C# Tray-App)
 * die auf localhost:5000 läuft.
 */

const REGULA_SERVICE_URL = 'http://localhost:5000';

class RegulaClient {
  constructor() {
    this.serviceUrl = REGULA_SERVICE_URL;
    this.isConnected = false;
    this.onScanResult = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  /**
   * Prüft ob die RegulaService Bridge läuft
   */
  async checkService() {
    try {
      const response = await fetch(`${this.serviceUrl}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Service nicht erreichbar');
      }
      
      const data = await response.json();
      this.isConnected = data.scanner?.connected || false;
      return data;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`RegulaService nicht erreichbar: ${error.message}`);
    }
  }

  /**
   * Verbindet den Scanner
   */
  async connect() {
    try {
      const response = await fetch(`${this.serviceUrl}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.isConnected = true;
        this.onStatusChange?.('Scanner verbunden');
      } else {
        throw new Error(data.error || 'Verbindung fehlgeschlagen');
      }
      
      return data;
    } catch (error) {
      this.isConnected = false;
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Trennt den Scanner
   */
  async disconnect() {
    try {
      const response = await fetch(`${this.serviceUrl}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      this.isConnected = false;
      this.onStatusChange?.('Scanner getrennt');
      return data;
    } catch (error) {
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Führt einen Scan durch
   * @returns {Promise<ScanResult>} Scan-Ergebnis
   */
  async scan() {
    if (!this.isConnected) {
      // Versuche automatisch zu verbinden
      await this.connect();
    }

    try {
      this.onStatusChange?.('Scan läuft...');
      
      const response = await fetch(`${this.serviceUrl}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.onStatusChange?.('Scan abgeschlossen');
        this.onScanResult?.(data.result);
        return data.result;
      } else {
        throw new Error(data.error || 'Scan fehlgeschlagen');
      }
    } catch (error) {
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Holt das letzte Scan-Ergebnis
   */
  async getLastResult() {
    try {
      const response = await fetch(`${this.serviceUrl}/scan/result`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.result;
      } else {
        throw new Error(data.error || 'Kein Ergebnis vorhanden');
      }
    } catch (error) {
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Holt die Bilder des letzten Scans
   */
  async getImages() {
    try {
      const response = await fetch(`${this.serviceUrl}/scan/images`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.images;
      } else {
        throw new Error(data.error || 'Keine Bilder vorhanden');
      }
    } catch (error) {
      this.onError?.(error.message);
      throw error;
    }
  }
}

// Singleton-Instanz
const regulaClient = new RegulaClient();

module.exports = { RegulaClient, regulaClient };
