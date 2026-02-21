import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { assetsAPI } from '../services/api';
import theme from '../utils/theme';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.75;

const ScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanMode, setScanMode] = useState('all'); // all, qr, barcode
  const [flashOn, setFlashOn] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    Vibration.vibrate(100);

    console.log(`Scanned: ${type} - ${data}`);

    try {
      // Try to find asset by any identifier (Asset-ID, SN, MAC, IMEI, etc.)
      const result = await assetsAPI.getByBarcode(data);
      
      setLastScan({
        code: data,
        type: type,
        asset: result?.success ? result.data : null,
        matchType: result?.matchType || null,
        timestamp: new Date().toLocaleString('de-DE'),
      });

      if (result?.success && result?.data) {
        const asset = result.data;
        const matchInfo = result.matchType ? `\nGefunden über: ${result.matchType}` : '';
        
        Alert.alert(
          '✅ Asset gefunden',
          `ID: ${asset.warehouse_asset_id || asset.asset_id}\n` +
          `Typ: ${asset.type_label || asset.type}\n` +
          `Status: ${asset.status}` +
          matchInfo +
          (asset.tenant_name ? `\nKunde: ${asset.tenant_name}` : '') +
          (asset.location_name ? `\nStandort: ${asset.location_name}` : ''),
          [
            { text: 'Details', onPress: () => navigation.navigate('Assets', { assetId: asset.asset_id }) },
            { text: 'Weiter scannen', onPress: () => setScanned(false) },
          ]
        );
      } else {
        Alert.alert(
          '⚠️ Kein Asset gefunden',
          `Gescannter Code: ${data}\nCode-Typ: ${type}\n\nDieser Code ist keinem Asset zugeordnet.`,
          [
            { text: 'In Assets suchen', onPress: () => navigation.navigate('Assets', { searchQuery: data }) },
            { text: 'Weiter scannen', onPress: () => setScanned(false) },
          ]
        );
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(
        '❌ Fehler',
        `Code: ${data}\nFehler bei der Suche: ${error.message}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Permission loading
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Kameraberechtigung wird geladen...</Text>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Kein Zugriff auf die Kamera</Text>
        <Text style={styles.subText}>
          Die Kamera wird benötigt, um Barcodes und QR-Codes zu scannen.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Kamera-Berechtigung erteilen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get barcode types based on scan mode
  const getBarcodeTypes = () => {
    if (scanMode === 'qr') {
      return ['qr'];
    } else if (scanMode === 'barcode') {
      return ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'codabar'];
    }
    // all
    return ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'codabar', 'datamatrix', 'aztec'];
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: getBarcodeTypes(),
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Scanner Overlay */}
        <View style={styles.overlay}>
          {/* Top Section */}
          <View style={styles.overlaySection} />
          
          {/* Middle Section with Scanner Window */}
          <View style={styles.middleSection}>
            <View style={styles.overlaySection} />
            <View style={styles.scannerWindow}>
              {/* Corner Markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              
              {/* Scan Line */}
              {!scanned && <View style={styles.scanLine} />}
            </View>
            <View style={styles.overlaySection} />
          </View>
          
          {/* Bottom Section */}
          <View style={styles.overlaySection} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {scanned ? 'Code erkannt!' : 'Barcode oder QR-Code scannen'}
          </Text>
        </View>
      </CameraView>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'all' && styles.modeButtonActive]}
            onPress={() => setScanMode('all')}
          >
            <Text style={[styles.modeButtonText, scanMode === 'all' && styles.modeButtonTextActive]}>Alle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
            onPress={() => setScanMode('barcode')}
          >
            <Text style={[styles.modeButtonText, scanMode === 'barcode' && styles.modeButtonTextActive]}>Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'qr' && styles.modeButtonActive]}
            onPress={() => setScanMode('qr')}
          >
            <Text style={[styles.modeButtonText, scanMode === 'qr' && styles.modeButtonTextActive]}>QR-Code</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, flashOn && styles.actionButtonActive]}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Text style={styles.actionIcon}>{flashOn ? '🔦' : '💡'}</Text>
            <Text style={[styles.actionText, flashOn && styles.actionTextActive]}>
              {flashOn ? 'Blitz An' : 'Blitz'}
            </Text>
          </TouchableOpacity>
          
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainIcon}>🔄</Text>
              <Text style={styles.scanAgainText}>Erneut scannen</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Last Scan Info */}
        {lastScan && (
          <View style={styles.lastScanCard}>
            <Text style={styles.lastScanTitle}>Letzter Scan</Text>
            <Text style={styles.lastScanCode} numberOfLines={1}>{lastScan.code}</Text>
            <Text style={styles.lastScanTime}>{lastScan.timestamp}</Text>
            {lastScan.matchType && (
              <View style={styles.matchTypeBadge}>
                <Text style={styles.matchTypeText}>Erkannt als: {lastScan.matchType}</Text>
              </View>
            )}
            {lastScan.asset && (
              <View style={styles.assetInfo}>
                <Text style={styles.assetId}>{lastScan.asset.warehouse_asset_id}</Text>
                <Text style={styles.assetStatus}>{lastScan.asset.status}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleSection: {
    flexDirection: 'row',
  },
  scannerWindow: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
  },
  cornerTopLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTopRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '50%',
    height: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.8,
  },
  instructionContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  messageText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionText: {
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#fff',
  },
  scanAgainButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanAgainIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: '600',
  },
  lastScanCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  lastScanTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  lastScanCode: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  lastScanTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  assetInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetId: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  assetStatus: {
    color: theme.colors.success,
    fontWeight: '500',
  },
});

export default ScannerScreen;
