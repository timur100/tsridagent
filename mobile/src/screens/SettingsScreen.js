import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingsRow = ({ icon, label, value, onPress, showArrow = true, disabled = false }) => (
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
      {value && <Text style={[styles.settingsValue, disabled && styles.textDisabled]}>{value}</Text>}
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

// Bluetooth Printer Modal
const BluetoothPrinterModal = ({ visible, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState([]);

  const startScan = () => {
    setScanning(true);
    setPrinters([]);
    
    // Simulate finding printers after delay
    setTimeout(() => {
      setPrinters([
        { id: '1', name: 'Zebra ZQ630', address: 'XX:XX:XX:XX:XX:01', connected: false },
        { id: '2', name: 'Brother QL-820NWB', address: 'XX:XX:XX:XX:XX:02', connected: false },
      ]);
      setScanning(false);
    }, 3000);
  };

  const connectPrinter = (printer) => {
    Alert.alert(
      'Bluetooth nicht verfügbar',
      'Die echte Bluetooth-Verbindung erfordert native Zebra/Brother SDKs, die noch nicht implementiert sind.\n\nDies ist eine Vorschau-Version.',
      [{ text: 'OK' }]
    );
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
          <Text style={styles.infoText}>
            Suchen Sie nach Bluetooth-Druckern in der Nähe.
          </Text>

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

          {printers.length > 0 && (
            <View style={styles.printerList}>
              <Text style={styles.printerListTitle}>Gefundene Drucker:</Text>
              {printers.map((printer) => (
                <TouchableOpacity 
                  key={printer.id} 
                  style={styles.printerItem}
                  onPress={() => connectPrinter(printer)}
                >
                  <View style={styles.printerInfo}>
                    <Text style={styles.printerName}>{printer.name}</Text>
                    <Text style={styles.printerAddress}>{printer.address}</Text>
                  </View>
                  <Text style={styles.connectText}>Verbinden</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!scanning && printers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🖨️</Text>
              <Text style={styles.emptyText}>Keine Drucker gefunden</Text>
              <Text style={styles.emptySubtext}>Stellen Sie sicher, dass Bluetooth aktiviert ist</Text>
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
  
  // Modals
  const [printerModalVisible, setPrinterModalVisible] = useState(false);

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
          value="Nicht verbunden"
          onPress={() => setPrinterModalVisible(true)}
        />
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
          value="1.0.0"
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
        <Text style={styles.footerText}>TSRID Mobile v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2024 TSRID GmbH</Text>
      </View>

      {/* Bluetooth Printer Modal */}
      <BluetoothPrinterModal 
        visible={printerModalVisible} 
        onClose={() => setPrinterModalVisible(false)} 
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
    padding: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
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
  printerList: {
    marginTop: theme.spacing.lg,
  },
  printerListTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  printerAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  connectText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
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
  },
});

export default SettingsScreen;
