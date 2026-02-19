/**
 * TSRID Mobile App - Label Print Screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { printerService, PrinterStatus, LabelData } from '../../services/hardware/printerService';
import { SUPPORTED_PRINTERS } from '../../config/printers';
import { Device } from 'react-native-ble-plx';

const COLORS = {
  primary: '#c00000',
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  success: '#22c55e',
  warning: '#f59e0b'
};

const PrintScreen = () => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(printerService.getStatus());
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Drucker-Status überwachen
    const unsubscribe = printerService.onDisconnect(() => {
      setPrinterStatus(printerService.getStatus());
      Alert.alert('Drucker getrennt', 'Die Verbindung zum Drucker wurde unterbrochen.');
    });
    return unsubscribe;
  }, []);

  const scanForPrinters = async () => {
    setScanning(true);
    setFoundDevices([]);

    try {
      await printerService.scanForPrinters(
        (device, config) => {
          setFoundDevices(prev => {
            if (prev.some(d => d.id === device.id)) return prev;
            return [...prev, device];
          });
        },
        10000
      );
    } catch (error: any) {
      Alert.alert('Scan-Fehler', error.message);
    } finally {
      setScanning(false);
    }
  };

  const connectToPrinter = async (device: Device) => {
    setConnecting(true);
    try {
      const success = await printerService.connect(device);
      if (success) {
        setPrinterStatus(printerService.getStatus());
        Alert.alert('Verbunden', `Mit ${device.name} verbunden`);
      } else {
        Alert.alert('Fehler', 'Verbindung fehlgeschlagen');
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setConnecting(false);
    }
  };

  const testPrint = async () => {
    const testLabel: LabelData = {
      assetId: 'TSRID-TEST-0001',
      serialNumber: 'TEST123456',
      qrData: 'TSRID-TEST-0001'
    };

    try {
      const success = await printerService.printLabel(testLabel);
      if (success) {
        Alert.alert('Erfolg', 'Test-Label gedruckt');
      }
    } catch (error: any) {
      Alert.alert('Druckfehler', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Label-Druck</Text>
      </View>

      {/* Verbundener Drucker */}
      <View style={styles.printerCard}>
        <View style={styles.printerIcon}>
          <Icon 
            name={printerStatus.connected ? 'printer-check' : 'printer-off'} 
            size={32} 
            color={printerStatus.connected ? COLORS.success : COLORS.textSecondary} 
          />
        </View>
        <View style={styles.printerInfo}>
          <Text style={styles.printerLabel}>
            {printerStatus.connected ? 'Verbunden mit' : 'Kein Drucker verbunden'}
          </Text>
          {printerStatus.device && (
            <Text style={styles.printerName}>{printerStatus.device.name}</Text>
          )}
          {printerStatus.config && (
            <Text style={styles.printerType}>{printerStatus.config.name}</Text>
          )}
        </View>
        {printerStatus.connected ? (
          <TouchableOpacity style={styles.testButton} onPress={testPrint}>
            <Icon name="printer" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.scanButton, scanning && styles.scanButtonActive]}
            onPress={scanForPrinters}
            disabled={scanning}
          >
            <Icon name={scanning ? 'loading' : 'magnify'} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Gefundene Drucker */}
      {foundDevices.length > 0 && (
        <View style={styles.devicesSection}>
          <Text style={styles.sectionTitle}>Gefundene Drucker</Text>
          <FlatList
            data={foundDevices}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceCard}
                onPress={() => connectToPrinter(item)}
                disabled={connecting}
              >
                <Icon name="printer" size={24} color={COLORS.primary} />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{item.name || 'Unbekannt'}</Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
                <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Unterstützte Drucker Info */}
      <View style={styles.supportedSection}>
        <Text style={styles.sectionTitle}>Unterstützte Drucker</Text>
        {SUPPORTED_PRINTERS.map(printer => (
          <View key={printer.id} style={styles.supportedCard}>
            <Icon name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.supportedName}>{printer.name}</Text>
            <Text style={styles.supportedType}>{printer.protocol.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: COLORS.card
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text
  },
  printerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: 12
  },
  printerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  printerInfo: {
    flex: 1,
    marginLeft: 12
  },
  printerLabel: {
    color: COLORS.textSecondary,
    fontSize: 13
  },
  printerName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600'
  },
  printerType: {
    color: COLORS.textSecondary,
    fontSize: 13
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanButtonActive: {
    backgroundColor: COLORS.warning
  },
  devicesSection: {
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12
  },
  deviceName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500'
  },
  deviceId: {
    color: COLORS.textSecondary,
    fontSize: 12
  },
  supportedSection: {
    padding: 16,
    marginTop: 'auto'
  },
  supportedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  supportedName: {
    flex: 1,
    color: COLORS.text
  },
  supportedType: {
    color: COLORS.textSecondary,
    fontSize: 12
  }
});

export default PrintScreen;
