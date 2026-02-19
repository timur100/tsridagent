/**
 * TSRID Mobile App - Wareneingang Screen
 * 
 * Hauptscreen für das Scannen und Erfassen von Assets.
 * Nutzt Zebra DataWedge für Hardware-Scanning.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { dataWedgeService, ScanResult } from '../../services/hardware/datawedge';
import assetService, { IntakeRequest } from '../../services/api/assets';
import { syncManager } from '../../services/sync/syncManager';

// Farben
const COLORS = {
  primary: '#c00000',
  background: '#1a1a1a',
  card: '#2d2d2d',
  cardLight: '#3a3a3a',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444'
};

// Asset-Typen (gleich wie im Admin Portal)
const ASSET_TYPES = [
  { id: 'tab_tsr_i7', label: 'TSRID Tablet i7', icon: 'tablet' },
  { id: 'sca_tsr', label: 'TSRID Scanner', icon: 'barcode-scan' },
  { id: 'psu_tsr', label: 'TSRID Scanner Netzteil', icon: 'power-plug' },
  { id: 'cab_usb_a_c', label: 'USB-A zu USB-C Kabel', icon: 'usb' },
  { id: 'kit_tsr', label: 'TSRID Kit', icon: 'package-variant' }
];

interface ScannedItem {
  serialNumber: string;
  type: string;
  scannedAt: number;
  status: 'pending' | 'saving' | 'saved' | 'error';
  assetId?: string;
  error?: string;
}

const GoodsReceiptScreen = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [selectedType, setSelectedType] = useState(ASSET_TYPES[0].id);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [receivedBy, setReceivedBy] = useState('Mobile App');

  // Scanner-Listener
  useEffect(() => {
    const unsubscribe = dataWedgeService.addListener(handleScan);
    
    // Sync-Status überwachen
    const syncUnsubscribe = syncManager.addListener((event) => {
      if (event.type === 'online') setIsOnline(true);
      if (event.type === 'offline') setIsOnline(false);
    });

    return () => {
      unsubscribe();
      syncUnsubscribe();
    };
  }, [selectedType]);

  // Scan verarbeiten
  const handleScan = useCallback((result: ScanResult) => {
    console.log('[GoodsReceipt] Scanned:', result.data);
    
    // Vibration als Feedback
    Vibration.vibrate(100);

    // Prüfen ob bereits gescannt
    if (scannedItems.some(item => item.serialNumber === result.data)) {
      Alert.alert('Bereits gescannt', `${result.data} wurde bereits erfasst.`);
      return;
    }

    // Neues Item hinzufügen
    const newItem: ScannedItem = {
      serialNumber: result.data,
      type: selectedType,
      scannedAt: Date.now(),
      status: 'pending'
    };

    setScannedItems(prev => [newItem, ...prev]);

    // Automatisch speichern wenn online
    if (isOnline) {
      saveItem(newItem);
    }
  }, [selectedType, scannedItems, isOnline]);

  // Item speichern
  const saveItem = async (item: ScannedItem) => {
    setScannedItems(prev => 
      prev.map(i => i.serialNumber === item.serialNumber ? { ...i, status: 'saving' } : i)
    );

    try {
      const intakeData: IntakeRequest = {
        manufacturer_sn: item.serialNumber,
        type: item.type
      };

      const response = await assetService.intakeAsset(intakeData, receivedBy);

      if (response.success) {
        setScannedItems(prev =>
          prev.map(i => i.serialNumber === item.serialNumber 
            ? { ...i, status: 'saved', assetId: response.asset_id }
            : i
          )
        );
        Vibration.vibrate([0, 50, 50, 50]); // Erfolgs-Vibration
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('[GoodsReceipt] Save error:', error);
      
      // Zur Offline-Queue hinzufügen
      await syncManager.addToQueue('asset_create', {
        asset: { manufacturer_sn: item.serialNumber, type: item.type },
        receivedBy
      });

      setScannedItems(prev =>
        prev.map(i => i.serialNumber === item.serialNumber
          ? { ...i, status: 'pending', error: 'In Warteschlange' }
          : i
        )
      );
    }
  };

  // Manuelle Eingabe verarbeiten
  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;

    handleScan({
      data: manualInput.trim(),
      labelType: 'MANUAL',
      source: 'KEYBOARD',
      timestamp: Date.now()
    });

    setManualInput('');
  };

  // Alle ausstehenden Items speichern
  const saveAllPending = async () => {
    const pendingItems = scannedItems.filter(i => i.status === 'pending');
    for (const item of pendingItems) {
      await saveItem(item);
    }
  };

  // Item entfernen
  const removeItem = (serialNumber: string) => {
    setScannedItems(prev => prev.filter(i => i.serialNumber !== serialNumber));
  };

  // Status-Icon
  const getStatusIcon = (status: ScannedItem['status']) => {
    switch (status) {
      case 'saved': return <Icon name="check-circle" size={24} color={COLORS.success} />;
      case 'saving': return <ActivityIndicator size="small" color={COLORS.primary} />;
      case 'error': return <Icon name="alert-circle" size={24} color={COLORS.error} />;
      default: return <Icon name="clock-outline" size={24} color={COLORS.warning} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wareneingang</Text>
        <View style={styles.onlineStatus}>
          <Icon 
            name={isOnline ? 'wifi' : 'wifi-off'} 
            size={20} 
            color={isOnline ? COLORS.success : COLORS.error} 
          />
          <Text style={[styles.onlineText, { color: isOnline ? COLORS.success : COLORS.error }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Asset-Typ Auswahl */}
      <View style={styles.typeSelector}>
        <Text style={styles.sectionTitle}>Asset-Typ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ASSET_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                selectedType === type.id && styles.typeButtonActive
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Icon 
                name={type.icon} 
                size={24} 
                color={selectedType === type.id ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text 
                style={[
                  styles.typeButtonText,
                  selectedType === type.id && styles.typeButtonTextActive
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scan-Bereich */}
      <View style={styles.scanArea}>
        <Icon name="barcode-scan" size={48} color={COLORS.primary} />
        <Text style={styles.scanText}>
          Hardware-Button drücken zum Scannen
        </Text>
        <Text style={styles.scanSubtext}>
          oder Seriennummer manuell eingeben
        </Text>

        {/* Manuelle Eingabe */}
        <View style={styles.manualInput}>
          <TextInput
            style={styles.input}
            placeholder="Seriennummer eingeben..."
            placeholderTextColor={COLORS.textSecondary}
            value={manualInput}
            onChangeText={setManualInput}
            onSubmitEditing={handleManualSubmit}
            returnKeyType="done"
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleManualSubmit}
          >
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Gescannte Items */}
      <View style={styles.itemsContainer}>
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionTitle}>
            Gescannt ({scannedItems.length})
          </Text>
          {scannedItems.some(i => i.status === 'pending') && (
            <TouchableOpacity 
              style={styles.saveAllButton}
              onPress={saveAllPending}
            >
              <Icon name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.saveAllText}>Alle speichern</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.itemsList}>
          {scannedItems.map(item => (
            <View key={item.serialNumber} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                {getStatusIcon(item.status)}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemSN}>{item.serialNumber}</Text>
                {item.assetId && (
                  <Text style={styles.itemAssetId}>{item.assetId}</Text>
                )}
                {item.error && (
                  <Text style={styles.itemError}>{item.error}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeItem(item.serialNumber)}
              >
                <Icon name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {scannedItems.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="package-variant" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Noch keine Items gescannt</Text>
            </View>
          )}
        </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: COLORS.card
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '500'
  },
  typeSelector: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`
  },
  typeButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  typeButtonTextActive: {
    color: COLORS.primary
  },
  scanArea: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed'
  },
  scanText: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 12,
    fontWeight: '500'
  },
  scanSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  manualInput: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%'
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.cardLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  itemsContainer: {
    flex: 1,
    padding: 16
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  saveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  saveAllText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  itemsList: {
    flex: 1
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  itemIcon: {
    width: 32,
    alignItems: 'center'
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12
  },
  itemSN: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace'
  },
  itemAssetId: {
    fontSize: 14,
    color: COLORS.success,
    marginTop: 2
  },
  itemError: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 2
  },
  removeButton: {
    padding: 8
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 16
  }
});

export default GoodsReceiptScreen;
