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
import { BROTHER_LABEL_FORMATS, LABEL_TEMPLATES } from '../services/BrotherPrinterConfig';
import theme from '../utils/theme';

// Settings Components
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
        <Text style={[styles.settingsValue, disabled && styles.textDisabled, valueColor && { color: valueColor }]}>
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

// Printer Item
const PrinterItem = ({ printer, onConnect, isConnecting }) => {
  const signal = printer.rssi >= -50 ? 4 : printer.rssi >= -60 ? 3 : printer.rssi >= -70 ? 2 : 1;
  const typeLabel = printer.type === 'zebra' ? 'Zebra (BLE)' : 'Brother (Classic)';
  const typeIcon = printer.type === 'zebra' ? '🦓' : '🏷️';
  const btType = printer.bluetoothType === 'classic' ? 'Classic' : 'BLE';

  return (
    <TouchableOpacity style={styles.printerItem} onPress={() => onConnect(printer)} disabled={isConnecting}>
      <View style={styles.printerIconContainer}>
        <Text style={styles.printerTypeIcon}>{typeIcon}</Text>
      </View>
      <View style={styles.printerInfo}>
        <Text style={styles.printerName}>{printer.name}</Text>
        <Text style={styles.printerDetails}>{typeLabel} • {btType}</Text>
        {printer.paired && <Text style={styles.pairedBadge}>Gekoppelt</Text>}
      </View>
      {isConnecting ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Text style={styles.connectText}>Verbinden</Text>
      )}
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
        (printer) => setPrinters(prev => [...prev.filter(p => p.id !== printer.id), printer]),
        (allPrinters) => {
          setScanning(false);
          if (allPrinters.length === 0) {
            setError('Keine Drucker gefunden. Stellen Sie sicher, dass der Brother-Drucker in den Android-Einstellungen gekoppelt ist.');
          }
        },
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
        Alert.alert('Verbunden', `Erfolgreich mit ${printer.name} verbunden.`, [
          { text: 'Test drucken', onPress: () => bluetoothPrinterService.printTestLabel().catch(e => Alert.alert('Fehler', e.message)) },
          { text: 'OK', onPress: () => { onPrinterConnected?.(result.device); onClose(); } }
        ]);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
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
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Brother-Drucker müssen zuerst in den Android-Einstellungen gekoppelt werden!
            </Text>
          </View>

          <TouchableOpacity style={[styles.scanButton, scanning && styles.scanButtonDisabled]} onPress={startScan} disabled={scanning}>
            {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.scanButtonIcon}>🔍</Text>}
            <Text style={styles.scanButtonText}>{scanning ? 'Suche...' : 'Drucker suchen'}</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {printers.length > 0 && (
            <FlatList
              data={printers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PrinterItem printer={item} onConnect={connectPrinter} isConnecting={connectingId === item.id} />
              )}
              style={styles.printerList}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// Label Format Modal
const LabelFormatModal = ({ visible, onClose, currentFormat, onSelect }) => {
  const formats = Object.values(BROTHER_LABEL_FORMATS);
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Label-Format</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.sectionSubtitle}>Endlos-Rollen</Text>
          {formats.filter(f => f.type === 'continuous').map(format => (
            <TouchableOpacity 
              key={format.id} 
              style={[styles.optionItem, currentFormat === format.id && styles.optionItemSelected]}
              onPress={() => { onSelect(format.id); onClose(); }}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{format.name}</Text>
                <Text style={styles.optionDescription}>{format.description}</Text>
              </View>
              {currentFormat === format.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          
          <Text style={[styles.sectionSubtitle, { marginTop: 20 }]}>Gestanzte Etiketten</Text>
          {formats.filter(f => f.type === 'die-cut').map(format => (
            <TouchableOpacity 
              key={format.id} 
              style={[styles.optionItem, currentFormat === format.id && styles.optionItemSelected]}
              onPress={() => { onSelect(format.id); onClose(); }}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{format.name}</Text>
                <Text style={styles.optionDescription}>{format.description}</Text>
              </View>
              {currentFormat === format.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Label Template Modal
const LabelTemplateModal = ({ visible, onClose, currentTemplate, onSelect }) => {
  const templates = Object.values(LABEL_TEMPLATES);
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Label-Vorlage</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          {templates.map(template => (
            <TouchableOpacity 
              key={template.id} 
              style={[styles.optionItem, currentTemplate === template.id && styles.optionItemSelected]}
              onPress={() => { onSelect(template.id); onClose(); }}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{template.name}</Text>
                <Text style={styles.optionDescription}>{template.description}</Text>
                <Text style={styles.optionMeta}>Min. Breite: {template.minWidth}mm</Text>
              </View>
              {currentTemplate === template.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Main Settings Screen
const SettingsScreen = () => {
  const { user, logout } = useAuth();
  
  // Scanner settings
  const [autoFocus, setAutoFocus] = useState(true);
  const [scanSound, setScanSound] = useState(true);
  const [scanVibrate, setScanVibrate] = useState(true);
  
  // Sync settings
  const [autoSync, setAutoSync] = useState(true);
  
  // Printer state
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [labelFormat, setLabelFormat] = useState('DK-22205');
  const [labelTemplate, setLabelTemplate] = useState('asset-standard');
  
  // Modals
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [formatModalVisible, setFormatModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  useEffect(() => {
    const device = bluetoothPrinterService.getConnectedDevice();
    if (device) setConnectedPrinter(device);
    
    // Load saved label settings
    const format = bluetoothPrinterService.getCurrentLabelFormat();
    const template = bluetoothPrinterService.getCurrentLabelTemplate();
    if (format) setLabelFormat(format.id);
    if (template) setLabelTemplate(template.id);
  }, []);

  const handleLabelFormatChange = async (formatId) => {
    await bluetoothPrinterService.setLabelFormat(formatId);
    setLabelFormat(formatId);
  };

  const handleLabelTemplateChange = async (templateId) => {
    await bluetoothPrinterService.setLabelTemplate(templateId);
    setLabelTemplate(templateId);
  };

  const handleDisconnectPrinter = () => {
    Alert.alert('Drucker trennen', `${connectedPrinter?.name} trennen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Trennen', style: 'destructive', onPress: async () => {
        await bluetoothPrinterService.disconnect();
        setConnectedPrinter(null);
      }}
    ]);
  };

  const handlePrintTestLabel = async () => {
    try {
      await bluetoothPrinterService.printTestLabel();
      Alert.alert('Erfolg', 'Test-Etikett wurde gedruckt.');
    } catch (error) {
      Alert.alert('Fehler', error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchten Sie sich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout }
    ]);
  };

  const getCurrentFormatName = () => {
    const format = BROTHER_LABEL_FORMATS[labelFormat];
    return format ? format.name : '62mm Endlos';
  };

  const getCurrentTemplateName = () => {
    const template = LABEL_TEMPLATES[labelTemplate];
    return template ? template.name : 'Standard';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Benutzer'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Scanner */}
      <SettingsSection title="Scanner">
        <SettingsToggle icon="📷" label="Automatischer Fokus" value={autoFocus} onValueChange={setAutoFocus} />
        <SettingsToggle icon="🔊" label="Ton bei Scan" value={scanSound} onValueChange={setScanSound} />
        <SettingsToggle icon="📳" label="Vibration bei Scan" value={scanVibrate} onValueChange={setScanVibrate} />
      </SettingsSection>

      {/* Drucker */}
      <SettingsSection title="Drucker">
        <SettingsRow
          icon="🖨️"
          label="Bluetooth-Drucker"
          value={connectedPrinter ? connectedPrinter.name : 'Nicht verbunden'}
          valueColor={connectedPrinter ? theme.colors.success : theme.colors.textMuted}
          onPress={() => connectedPrinter ? handleDisconnectPrinter() : setPrinterModalVisible(true)}
        />
        {connectedPrinter && (
          <SettingsRow icon="🧪" label="Test-Etikett drucken" onPress={handlePrintTestLabel} />
        )}
        <SettingsRow
          icon="📏"
          label="Label-Format"
          value={getCurrentFormatName()}
          onPress={() => setFormatModalVisible(true)}
        />
        <SettingsRow
          icon="📐"
          label="Label-Vorlage"
          value={getCurrentTemplateName()}
          onPress={() => setTemplateModalVisible(true)}
        />
      </SettingsSection>

      {/* Sync */}
      <SettingsSection title="Synchronisation">
        <SettingsToggle icon="🔄" label="Automatische Sync" value={autoSync} onValueChange={setAutoSync} />
      </SettingsSection>

      {/* App Info */}
      <SettingsSection title="App">
        <SettingsRow icon="ℹ️" label="Version" value="1.3.0" showArrow={false} />
        <SettingsRow icon="📱" label="Gerät" value="Zebra TC78" showArrow={false} />
      </SettingsSection>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      {/* Modals */}
      <BluetoothPrinterModal 
        visible={printerModalVisible} 
        onClose={() => setPrinterModalVisible(false)}
        onPrinterConnected={setConnectedPrinter}
      />
      <LabelFormatModal
        visible={formatModalVisible}
        onClose={() => setFormatModalVisible(false)}
        currentFormat={labelFormat}
        onSelect={handleLabelFormatChange}
      />
      <LabelTemplateModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        currentTemplate={labelTemplate}
        onSelect={handleLabelTemplateChange}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16 },
  
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  profileEmail: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8, paddingLeft: 4 },
  sectionContent: { backgroundColor: theme.colors.surface, borderRadius: 12, overflow: 'hidden' },
  sectionSubtitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8, marginTop: 8 },

  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingsRowDisabled: { opacity: 0.5 },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsIcon: { fontSize: 18, marginRight: 12 },
  settingsLabel: { fontSize: 16, color: theme.colors.textPrimary },
  textDisabled: { color: theme.colors.textMuted },
  settingsRowRight: { flexDirection: 'row', alignItems: 'center' },
  settingsValue: { fontSize: 14, color: theme.colors.textMuted, marginRight: 8 },
  arrow: { fontSize: 18, color: theme.colors.textMuted },

  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 24, color: '#fff' },
  modalContent: { flex: 1, padding: 16 },

  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 14, color: theme.colors.textSecondary },

  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontSize: 14, color: '#EF4444' },

  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonDisabled: { backgroundColor: theme.colors.textMuted },
  scanButtonIcon: { fontSize: 18 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  printerList: { marginTop: 16 },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  printerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  printerTypeIcon: { fontSize: 22 },
  printerInfo: { flex: 1 },
  printerName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  printerDetails: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  pairedBadge: { fontSize: 11, color: theme.colors.success, marginTop: 2 },
  connectText: { color: theme.colors.primary, fontWeight: '600' },

  // Option items (for format/template selection)
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionItemSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  optionInfo: { flex: 1 },
  optionName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  optionDescription: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  optionMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  checkmark: { fontSize: 20, color: theme.colors.primary, marginLeft: 12 },
});

export default SettingsScreen;
