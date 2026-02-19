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
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { assetsAPI } from '../services/api';
import theme from '../utils/theme';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.75;

const ScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanMode, setScanMode] = useState('barcode'); // barcode or qrcode
  const [flashOn, setFlashOn] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    Vibration.vibrate(100);

    try {
      // Try to find asset by barcode
      const result = await assetsAPI.getByBarcode(data);
      
      setLastScan({
        code: data,
        type: type,
        asset: result?.success ? result.data : null,
        timestamp: new Date().toLocaleString('de-DE'),
      });

      if (result?.success && result?.data) {
        Alert.alert(
          'Asset gefunden',
          `ID: ${result.data.warehouse_asset_id || result.data.asset_id}\nTyp: ${result.data.type_label || result.data.type}\nStatus: ${result.data.status}`,
          [
            { text: 'Details', onPress: () => navigation.navigate('Assets', { assetId: result.data.asset_id }) },
            { text: 'Weiter scannen', onPress: () => setScanned(false) },
          ]
        );
      } else {
        Alert.alert(
          'Unbekannter Code',
          `Code: ${data}\nTyp: ${getScanTypeName(type)}`,
          [
            { text: 'Neues Asset anlegen', onPress: () => {} },
            { text: 'Weiter scannen', onPress: () => setScanned(false) },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Code gescannt',
        `Code: ${data}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getScanTypeName = (type) => {
    const types = {
      [BarCodeScanner.Constants.BarCodeType.qr]: 'QR-Code',
      [BarCodeScanner.Constants.BarCodeType.ean13]: 'EAN-13',
      [BarCodeScanner.Constants.BarCodeType.ean8]: 'EAN-8',
      [BarCodeScanner.Constants.BarCodeType.code128]: 'Code 128',
      [BarCodeScanner.Constants.BarCodeType.code39]: 'Code 39',
      [BarCodeScanner.Constants.BarCodeType.upc_a]: 'UPC-A',
      [BarCodeScanner.Constants.BarCodeType.datamatrix]: 'DataMatrix',
    };
    return types[type] || 'Unbekannt';
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Kameraberechtigung wird angefordert...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Kein Zugriff auf die Kamera</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Berechtigung erteilen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        barCodeScannerSettings={{
          barCodeTypes: scanMode === 'qrcode' 
            ? [BarCodeScanner.Constants.BarCodeType.qr]
            : [
                BarCodeScanner.Constants.BarCodeType.ean13,
                BarCodeScanner.Constants.BarCodeType.ean8,
                BarCodeScanner.Constants.BarCodeType.code128,
                BarCodeScanner.Constants.BarCodeType.code39,
                BarCodeScanner.Constants.BarCodeType.qr,
                BarCodeScanner.Constants.BarCodeType.datamatrix,
              ],
        }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
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
              
              {/* Scan Line Animation Placeholder */}
              {!scanned && (
                <View style={styles.scanLine} />
              )}
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
      </Camera>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
            onPress={() => setScanMode('barcode')}
          >
            <Text style={styles.modeButtonText}>Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'qrcode' && styles.modeButtonActive]}
            onPress={() => setScanMode('qrcode')}
          >
            <Text style={styles.modeButtonText}>QR-Code</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, flashOn && styles.actionButtonActive]}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Text style={styles.actionIcon}>💡</Text>
            <Text style={styles.actionText}>Blitz</Text>
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
            <Text style={styles.lastScanCode}>{lastScan.code}</Text>
            <Text style={styles.lastScanTime}>{lastScan.timestamp}</Text>
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
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
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
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  messageText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  controls: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  actionText: {
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  scanAgainButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanAgainIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: '600',
  },
  lastScanCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  lastScanTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  lastScanCode: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  lastScanTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  assetInfo: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
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
