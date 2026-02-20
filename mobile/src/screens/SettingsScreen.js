import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import bluetoothPrinterService from '../services/BluetoothPrinterService';
import theme from '../utils/theme';

const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingsRow = ({ icon, label, value, onPress, showArrow = true, disabled = false, valueColor }) => (
  <TouchableOpacity 
    style={[styles.settingsRow, disabled && styles.settingsRowDisabled]} 
    onPress={onPress} 
    disabled={!onPress || disabled}
  >
    <View style={styles.settingsRowLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={[styles.settingsLabel, disabled && styles.textDisabled]}>{label}</Text>
    </View>
    <View style={styles.settingsRowRight}>
      {value && (
        <Text style={[
          styles.settingsValue, 
          disabled && styles.textDisabled,
          valueColor && { color: valueColor }
        ]}>
          {value}
        </Text>
      )}
      {showArrow && onPress && <Text style={styles.arrow}>›</Text>}
    </View>
  </TouchableOpacity>
);

const SettingsToggle = ({ icon, label, value, onValueChange, disabled = false }) => (
  <View style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}>
    <View style={styles.settingsRowLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={[styles.settingsLabel, disabled && styles.textDisabled]}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor="#fff"
      disabled={disabled}
    />
  </View>
);

// Printer Item Component
const PrinterItem = ({ printer, onConnect, isConnecting }) => {
  const getSignalStrength = (rssi) => {
    if (rssi >= -50) return { bars: 4, label: 'Ausgezeichnet' };
    if (rssi >= -60) return { bars: 3, label: 'Gut' };
    if (rssi >= -70) return { bars: 2, label: 'Mittel' };
    return { bars: 1, label: 'Schwach' };
  };

  const signal = getSignalStrength(printer.rssi);
  const typeLabel = printer.type === 'zebra' ? 'Zebra (ZPL)' : 'Brother (ESC/P)';
  const typeIcon = printer.type === 'zebra' ? '🦓' : '🏷️';

  return (
    <TouchableOpacity 
      style={styles.printerItem}
      onPress={() => onConnect(printer)}
      disabled={isConnecting}
    >
      <View style={styles.printerIconContainer}>
        <Text style={styles.printerTypeIcon}>{typeIcon}</Text>
      </View>
      <View style={styles.printerInfo}>
        <Text style={styles.printerName}>{printer.name}</Text>
        <Text style={styles.printerDetails}>{typeLabel}</Text>
        <View style={styles.signalContainer}>
          <View style={styles.signalBars}>
            {[1, 2, 3, 4].map((bar) => (
              <View 
                key={bar}
                style={[
                  styles.signalBar,
                  { height: bar * 4 },
                  bar <= signal.bars ? styles.signalBarActive : styles.signalBarInactive
                ]}
              />
            ))}
          </View>
          <Text style={styles.signalLabel}>{signal.label}</Text>
        </View>
      </View>
      <View style={styles.connectButtonContainer}>
        {isConnecting ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.connectText}>Verbinden</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Bluetooth Printer Modal
const BluetoothPrinterModal = ({ visible, onClose, onPrinterConnected }) => {
  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      // Cleanup when modal closes
      bluetoothPrinterService.stopScan();
      setScanning(false);
      setPrinters([]);
      setError(null);
    }
  }, [visible]);

  const startScan = async () => {
    setScanning(true);
    setPrinters([]);
    setError(null);

    try {
      await bluetoothPrinterService.startScan(
        // onDeviceFound
        (printer) => {
          setPrinters(prev => {
            const exists = prev.some(p => p.id === printer.id);
            if (exists) return prev;
            return [...prev, printer];
          });
        },
        // onScanComplete
        (allPrinters) => {
          setScanning(false);
          if (allPrinters.length === 0) {
            setError('Keine Drucker gefunden. Stellen Sie sicher, dass der Drucker eingeschaltet und im Pairing-Modus ist.');
          }
        },
        // timeout
        15000
      );
    } catch (err) {
      setScanning(false);
      setError(err.message);
    }
  };

  const connectPrinter = async (printer) => {
    setConnectingId(printer.id);
    setError(null);

    try {
      const result = await bluetoothPrinterService.connect(printer.id);
      
      if (result.success) {
        Alert.alert(
          'Verbunden',
          `Erfolgreich mit ${printer.name} verbunden.`,
          [
            {
              text: 'Test-Etikett drucken',
              onPress: async () => {
                try {
                  await bluetoothPrinterService.printTestLabel();
                  Alert.alert('Erfolg', 'Test-Etikett wurde gedruckt.');
                } catch (printErr) {
                  Alert.alert('Fehler', printErr.message);
                }
              }
            },
            {
              text: 'OK',
              onPress: () => {
                if (onPrinterConnected) {
                  onPrinterConnected(result.device);
                }
                onClose();
              }
            }
          ]
        );
      } else {
        setError(`Verbindung fehlgeschlagen: ${result.error}`);
      }
    } catch (err) {
      setError(`Verbindung fehlgeschlagen: ${err.message}`);
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Bluetooth-Drucker</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Info Text */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Unterstützte Drucker:{'\n'}
              • Zebra ZQ620, ZQ630, ZD-Serie (ZPL){'\n'}
              • Brother QL-820NWB, QL-1110NWB (ESC/P)
            </Text>
          </View>

          {/* Scan Button */}
          <TouchableOpacity 
            style={[styles.scanButton, scanning && styles.scanButtonDisabled]} 
            onPress={startScan}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.scanButtonText}>Suche läuft...</Text>
              </>
            ) : (
              <>
                <Text style={styles.scanButtonIcon}>🔍</Text>
                <Text style={styles.scanButtonText}>Drucker suchen</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Printer List */}
          {printers.length > 0 && (
            <View style={styles.printerList}>
              <Text style={styles.printerListTitle}>Gefundene Drucker ({printers.length}):</Text>
              <FlatList
                data={printers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PrinterItem 
                    printer={item} 
                    onConnect={connectPrinter}
                    isConnecting={connectingId === item.id}
                  />
                )}
                style={styles.printerFlatList}
              />
            </View>
          )}

          {/* Empty State */}
          {!scanning && printers.length === 0 && !error && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🖨️</Text>
              <Text style={styles.emptyText}>Keine Drucker gefunden</Text>
              <Text style={styles.emptySubtext}>
                Tippen Sie auf "Drucker suchen" um{'\n'}Bluetooth-Drucker in der Nähe zu finden
              </Text>
            </View>
          )}

          {/* Scanning Animation */}
          {scanning && (
            <View style={styles.scanningContainer}>
              <View style={styles.scanningAnimation}>
                <View style={[styles.scanningRing, styles.scanningRing1]} />
                <View style={[styles.scanningRing, styles.scanningRing2]} />
                <View style={[styles.scanningRing, styles.scanningRing3]} />
                <Text style={styles.scanningIcon}>📡</Text>
              </View>
              <Text style={styles.scanningText}>Suche nach Druckern...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  
  // Scanner settings
  const [autoFocus, setAutoFocus] = useState(true);
  const [autoFlash, setAutoFlash] = useState(false);
  const [scanSound, setScanSound] = useState(true);
  const [scanVibrate, setScanVibrate] = useState(true);
  
  // Sync settings
  const [autoSync, setAutoSync] = useState(true);
  
  // Printer state
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);

  // Check for connected printer on mount
  useEffect(() => {
    const device = bluetoothPrinterService.getConnectedDevice();
    if (device) {
      setConnectedPrinter(device);
    }
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDisconnectPrinter = () => {
    Alert.alert(
      'Drucker trennen',
      `Möchten Sie die Verbindung zu ${connectedPrinter?.name} trennen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Trennen', 
          style: 'destructive',
          onPress: async () => {
            await bluetoothPrinterService.disconnect();
            setConnectedPrinter(null);
          }
        },
      ]
    );
  };

  const handlePrintTestLabel = async () => {
    try {
      await bluetoothPrinterService.printTestLabel();
      Alert.alert('Erfolg', 'Test-Etikett wurde gedruckt.');
    } catch (error) {
      Alert.alert('Fehler', error.message);
    }
  };

  const showSyncAlert = () => {
    Alert.alert(
      'Synchronisation',
      'Daten werden mit dem Server synchronisiert...',
      [{ text: 'OK' }]
    );
  };

  const showNotImplemented = (feature) => {
    Alert.alert(
      'Hinweis',
      `${feature} wird in einer zukünftigen Version verfügbar sein.`,
      [{ text: 'OK' }]
    );
  };

  const getPrinterStatusText = () => {
    if (connectedPrinter) {
      return connectedPrinter.name;
    }
    return 'Nicht verbunden';
  };

  const getPrinterStatusColor = () => {
    if (connectedPrinter) {
      return theme.colors.success;
    }
    return theme.colors.textMuted;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Benutzer'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Benutzer'}</Text>
          </View>
        </View>
      </View>

      {/* Scanner Settings */}
      <SettingsSection title="Scanner">
        <SettingsToggle
          icon="📷"
          label="Automatischer Fokus"
          value={autoFocus}
          onValueChange={setAutoFocus}
        />
        <SettingsToggle
          icon="💡"
          label="Blitz automatisch"
          value={autoFlash}
          onValueChange={setAutoFlash}
        />
        <SettingsToggle
          icon="🔊"
          label="Ton bei Scan"
          value={scanSound}
          onValueChange={setScanSound}
        />
        <SettingsToggle
          icon="📳"
          label="Vibration bei Scan"
          value={scanVibrate}
          onValueChange={setScanVibrate}
        />
      </SettingsSection>

      {/* Printer Settings */}
      <SettingsSection title="Drucker">
        <SettingsRow
          icon="🖨️"
          label="Bluetooth-Drucker"
          value={getPrinterStatusText()}
          valueColor={getPrinterStatusColor()}
          onPress={() => {
            if (connectedPrinter) {
              handleDisconnectPrinter();
            } else {
              setPrinterModalVisible(true);
            }
          }}
        />
        {connectedPrinter && (
          <>
            <SettingsRow
              icon="🧪"
              label="Test-Etikett drucken"
              onPress={handlePrintTestLabel}
            />
            <SettingsRow
              icon="🔌"
              label="Verbindung trennen"
              value=""
              onPress={handleDisconnectPrinter}
            />
          </>
        )}
        <SettingsRow
          icon="🏷️"
          label="Label-Format"
          value="62mm Endlos"
          onPress={() => showNotImplemented('Label-Format Auswahl')}
        />
        <SettingsRow
          icon="📐"
          label="Label-Vorlage"
          value="Standard"
          onPress={() => showNotImplemented('Label-Vorlagen')}
        />
      </SettingsSection>

      {/* Sync Settings */}
      <SettingsSection title="Synchronisation">
        <SettingsToggle
          icon="🔄"
          label="Automatische Sync"
          value={autoSync}
          onValueChange={setAutoSync}
        />
        <SettingsRow
          icon="📶"
          label="Sync-Intervall"
          value="5 Minuten"
          onPress={() => showNotImplemented('Sync-Intervall')}
        />
        <SettingsRow
          icon="💾"
          label="Offline-Daten"
          value="0 MB"
          onPress={() => showNotImplemented('Offline-Daten Verwaltung')}
        />
        <SettingsRow
          icon="🔃"
          label="Jetzt synchronisieren"
          onPress={showSyncAlert}
        />
      </SettingsSection>

      {/* App Settings */}
      <SettingsSection title="App">
        <SettingsRow
          icon="🌐"
          label="Server-URL"
          value="production"
          showArrow={false}
        />
        <SettingsRow
          icon="ℹ️"
          label="App-Version"
          value="1.1.0"
          showArrow={false}
        />
        <SettingsRow
          icon="📱"
          label="Gerät"
          value="Zebra TC78"
          showArrow={false}
        />
      </SettingsSection>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TSRID Mobile v1.1.0</Text>
        <Text style={styles.footerSubtext}>© 2024 TSRID GmbH</Text>
      </View>

      {/* Bluetooth Printer Modal */}
      <BluetoothPrinterModal 
        visible={printerModalVisible} 
        onClose={() => setPrinterModalVisible(false)}
        onPrinterConnected={(device) => setConnectedPrinter(device)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadow.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  roleText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingsRowDisabled: {
    opacity: 0.5,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  settingsLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  textDisabled: {
    color: theme.colors.textMuted,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.sm,
  },
  arrow: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  logoutText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  footerSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  scanButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
  printerList: {
    marginTop: theme.spacing.lg,
    flex: 1,
  },
  printerListTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  printerFlatList: {
    maxHeight: 300,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  printerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  printerTypeIcon: {
    fontSize: 24,
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  printerDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: theme.spacing.xs,
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  signalBarActive: {
    backgroundColor: theme.colors.success,
  },
  signalBarInactive: {
    backgroundColor: theme.colors.border,
  },
  signalLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  connectButtonContainer: {
    paddingLeft: theme.spacing.md,
  },
  connectText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    flex: 1,
  },
  scanningAnimation: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  scanningRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 100,
    opacity: 0.3,
  },
  scanningRing1: {
    width: 60,
    height: 60,
  },
  scanningRing2: {
    width: 90,
    height: 90,
    opacity: 0.2,
  },
  scanningRing3: {
    width: 120,
    height: 120,
    opacity: 0.1,
  },
  scanningIcon: {
    fontSize: 32,
  },
  scanningText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});

export default SettingsScreen;
