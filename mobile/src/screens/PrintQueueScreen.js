import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import bluetoothPrinterService from '../services/BluetoothPrinterService';
import theme from '../utils/theme';

/**
 * Print Queue Screen - Batch printing with preview
 */
const PrintQueueScreen = ({ visible, onClose, assets = [], navigation }) => {
  const [printQueue, setPrintQueue] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0 });
  const [previewAsset, setPreviewAsset] = useState(null);
  
  // Initialize queue with assets
  useEffect(() => {
    if (assets.length > 0) {
      setPrintQueue(assets.map(asset => ({
        ...asset,
        copies: 1,
        selected: true,
      })));
    }
  }, [assets]);

  const updateCopies = (assetId, delta) => {
    setPrintQueue(prev => prev.map(item => {
      if ((item.asset_id || item.warehouse_asset_id) === assetId) {
        const newCopies = Math.max(1, Math.min(10, item.copies + delta));
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  const toggleSelect = (assetId) => {
    setPrintQueue(prev => prev.map(item => {
      if ((item.asset_id || item.warehouse_asset_id) === assetId) {
        return { ...item, selected: !item.selected };
      }
      return item;
    }));
  };

  const removeFromQueue = (assetId) => {
    setPrintQueue(prev => prev.filter(item => 
      (item.asset_id || item.warehouse_asset_id) !== assetId
    ));
  };

  const getTotalLabels = () => {
    return printQueue
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.copies, 0);
  };

  const handlePrintAll = async () => {
    const isConnected = bluetoothPrinterService.isConnected();
    if (!isConnected) {
      Alert.alert(
        'Drucker nicht verbunden',
        'Bitte verbinden Sie zuerst einen Drucker in den Einstellungen.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Einstellungen', onPress: () => { onClose(); navigation?.navigate('Settings'); } },
        ]
      );
      return;
    }

    const selectedItems = printQueue.filter(item => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert('Keine Auswahl', 'Bitte wählen Sie mindestens ein Asset zum Drucken aus.');
      return;
    }

    const totalLabels = getTotalLabels();
    
    Alert.alert(
      'Drucken bestätigen',
      `${totalLabels} Label(s) für ${selectedItems.length} Asset(s) drucken?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Drucken', onPress: () => executePrint(selectedItems) },
      ]
    );
  };

  const executePrint = async (items) => {
    setPrinting(true);
    const totalLabels = items.reduce((sum, item) => sum + item.copies, 0);
    setPrintProgress({ current: 0, total: totalLabels });
    
    let printed = 0;
    const errors = [];

    for (const item of items) {
      for (let copy = 0; copy < item.copies; copy++) {
        try {
          await bluetoothPrinterService.printAssetLabel(item);
          printed++;
          setPrintProgress({ current: printed, total: totalLabels });
          
          // Small delay between labels
          if (printed < totalLabels) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          errors.push(`${item.warehouse_asset_id || item.asset_id}: ${error.message}`);
        }
      }
    }

    setPrinting(false);

    if (errors.length === 0) {
      Alert.alert(
        '✅ Druck abgeschlossen',
        `${printed} Label(s) erfolgreich gedruckt.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } else {
      Alert.alert(
        '⚠️ Druck teilweise abgeschlossen',
        `${printed}/${totalLabels} Labels gedruckt.\n\nFehler:\n${errors.join('\n')}`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderQueueItem = ({ item }) => {
    const assetId = item.warehouse_asset_id || item.asset_id;
    
    return (
      <View style={[styles.queueItem, !item.selected && styles.queueItemDisabled]}>
        {/* Select Checkbox */}
        <TouchableOpacity 
          style={styles.checkbox} 
          onPress={() => toggleSelect(assetId)}
        >
          <View style={[styles.checkboxInner, item.selected && styles.checkboxChecked]}>
            {item.selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Asset Info */}
        <TouchableOpacity 
          style={styles.assetInfo}
          onPress={() => setPreviewAsset(item)}
        >
          <Text style={styles.assetId}>{assetId}</Text>
          <Text style={styles.assetType}>{item.type_label || item.type || 'Asset'}</Text>
          <Text style={styles.assetSn}>SN: {item.manufacturer_sn || 'N/A'}</Text>
        </TouchableOpacity>

        {/* Copies Counter */}
        <View style={styles.copiesContainer}>
          <TouchableOpacity 
            style={styles.copiesButton}
            onPress={() => updateCopies(assetId, -1)}
          >
            <Text style={styles.copiesButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.copiesCount}>{item.copies}</Text>
          <TouchableOpacity 
            style={styles.copiesButton}
            onPress={() => updateCopies(assetId, 1)}
          >
            <Text style={styles.copiesButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Remove Button */}
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromQueue(assetId)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Druckwarteschlange</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Queue List */}
        <FlatList
          data={printQueue}
          keyExtractor={(item) => item.asset_id || item.warehouse_asset_id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyText}>Keine Assets in der Warteschlange</Text>
            </View>
          }
        />

        {/* Summary & Print Button */}
        {printQueue.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {printQueue.filter(i => i.selected).length} Assets ausgewählt
              </Text>
              <Text style={styles.summaryTotal}>
                {getTotalLabels()} Labels gesamt
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.printButton, printing && styles.printButtonDisabled]}
              onPress={handlePrintAll}
              disabled={printing}
            >
              {printing ? (
                <View style={styles.printingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.printButtonText}>
                    {printProgress.current}/{printProgress.total}
                  </Text>
                </View>
              ) : (
                <Text style={styles.printButtonText}>🖨️ Alle drucken</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Preview Modal */}
        <LabelPreviewModal 
          visible={!!previewAsset}
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      </View>
    </Modal>
  );
};

/**
 * Label Preview Modal - IMPROVED
 */
const LabelPreviewModal = ({ visible, asset, onClose }) => {
  if (!asset) return null;
  
  const assetId = asset.warehouse_asset_id || asset.asset_id || 'N/A';
  const typeLabel = asset.type_label || asset.type || 'Asset';
  const serialNumber = asset.manufacturer_sn || 'N/A';
  const location = asset.location_name || '';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.previewOverlay}>
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Label-Vorschau</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.previewClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Label Preview - Realistic */}
          <View style={styles.labelPreview}>
            {/* QR Code Area */}
            <View style={styles.qrPreviewArea}>
              <View style={styles.qrPreviewBox}>
                {/* Simple QR representation */}
                <View style={styles.qrCornerTL} />
                <View style={styles.qrCornerTR} />
                <View style={styles.qrCornerBL} />
                <View style={styles.qrPatternCenter}>
                  <Text style={styles.qrText}>QR</Text>
                </View>
              </View>
            </View>

            {/* Text Content - Large */}
            <View style={styles.labelTextArea}>
              <Text style={styles.previewAssetId}>{assetId}</Text>
              <Text style={styles.previewType}>{typeLabel}</Text>
              <Text style={styles.previewSn}>SN: {serialNumber}</Text>
              {location ? <Text style={styles.previewLocation}>📍 {location}</Text> : null}
            </View>
          </View>

          {/* Label Info */}
          <View style={styles.labelInfo}>
            <Text style={styles.labelInfoText}>62mm × 29mm | Brother QL-820NWB</Text>
            <Text style={styles.labelInfoText}>Format: TSRID Standard</Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.previewCloseButton} onPress={onClose}>
            <Text style={styles.previewCloseButtonText}>Schließen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 30,
  },
  listContent: {
    padding: 12,
  },
  
  // Queue Item
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  queueItemDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assetInfo: {
    flex: 1,
  },
  assetId: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  assetType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  assetSn: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  
  // Copies Counter
  copiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  copiesButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copiesButtonText: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  copiesCount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: theme.colors.error,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  
  // Footer
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  printButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  printButtonDisabled: {
    opacity: 0.7,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  printingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // Preview Modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  previewClose: {
    fontSize: 22,
    color: theme.colors.textMuted,
    padding: 4,
  },
  
  // Label Preview - Realistic representation
  labelPreview: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginBottom: 12,
    minHeight: 120,
  },
  qrPreviewArea: {
    width: 90,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPreviewBox: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  qrCornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  qrCornerTR: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  qrPatternCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -8 }],
  },
  qrText: {
    fontSize: 10,
    color: '#999',
    fontWeight: 'bold',
  },
  labelTextArea: {
    flex: 1,
    justifyContent: 'center',
  },
  previewAssetId: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 6,
  },
  previewType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  previewSn: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  previewLocation: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  labelInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  labelInfoText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  previewCloseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewCloseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PrintQueueScreen;
