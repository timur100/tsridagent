import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { assetsAPI } from '../services/api';
import bluetoothPrinterService from '../services/BluetoothPrinterService';
import theme from '../utils/theme';

const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status?.toLowerCase()) {
      case 'verfügbar':
      case 'available':
      case 'in_stock':
        return { bg: '#22c55e20', color: '#22c55e', label: 'Verfügbar' };
      case 'in_use':
      case 'assigned':
      case 'zugewiesen':
        return { bg: '#3b82f620', color: '#3b82f6', label: 'Zugewiesen' };
      case 'maintenance':
      case 'wartung':
        return { bg: '#f59e0b20', color: '#f59e0b', label: 'Wartung' };
      case 'defect':
      case 'defekt':
        return { bg: '#ef444420', color: '#ef4444', label: 'Defekt' };
      case 'installed':
      case 'installiert':
        return { bg: '#8b5cf620', color: '#8b5cf6', label: 'Installiert' };
      default:
        return { bg: '#6b728020', color: '#6b7280', label: status || 'Unbekannt' };
    }
  };
  const style = getStatusStyle();
  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusText, { color: style.color }]}>{style.label}</Text>
    </View>
  );
};

const AssetCard = ({ asset, onPress, onPrintLabel }) => (
  <TouchableOpacity style={styles.assetCard} onPress={() => onPress(asset)}>
    <View style={styles.assetHeader}>
      <Text style={styles.assetId}>{asset.warehouse_asset_id || asset.asset_id || 'Keine ID'}</Text>
      <StatusBadge status={asset.status} />
    </View>
    <View style={styles.assetDetails}>
      <DetailRow label="Typ" value={asset.type_label || asset.type} />
      <DetailRow label="SN" value={asset.manufacturer_sn} />
      {asset.tenant_name && <DetailRow label="Kunde" value={asset.tenant_name} />}
      {asset.location_name && <DetailRow label="Standort" value={asset.location_name} />}
    </View>
    <View style={styles.assetActions}>
      <TouchableOpacity style={styles.printButton} onPress={() => onPrintLabel(asset)}>
        <Text style={styles.printButtonText}>🏷️ Label drucken</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
};

// Comprehensive Asset Detail Modal
const AssetDetailModal = ({ visible, asset, onClose, onPrintLabel }) => {
  if (!asset) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Asset Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Asset ID & Status */}
          <View style={styles.idSection}>
            <Text style={styles.assetIdLarge}>{asset.warehouse_asset_id || asset.asset_id}</Text>
            <StatusBadge status={asset.status} />
          </View>

          {/* Print Button */}
          <TouchableOpacity style={styles.printLabelButton} onPress={() => onPrintLabel(asset)}>
            <Text style={styles.printLabelIcon}>🏷️</Text>
            <Text style={styles.printLabelText}>Asset-Label drucken</Text>
          </TouchableOpacity>

          {/* Customer/Tenant Info */}
          {(asset.tenant_name || asset.tenant_id) && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>🏢 Kunde / Tenant</Text>
              <InfoRow label="Name" value={asset.tenant_name} />
              <InfoRow label="ID" value={asset.tenant_id} />
            </View>
          )}

          {/* Location Info */}
          {(asset.location_name || asset.location_id) && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>📍 Standort</Text>
              <InfoRow label="Name" value={asset.location_name} />
              <InfoRow label="Adresse" value={asset.location_address} />
              <InfoRow label="ID" value={asset.location_id} />
            </View>
          )}

          {/* General Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📦 Allgemein</Text>
            <InfoRow label="Typ" value={asset.type_label || asset.type} />
            <InfoRow label="Hersteller" value={asset.manufacturer} />
            <InfoRow label="Modell" value={asset.model} />
            <InfoRow label="Seriennummer" value={asset.manufacturer_sn} />
          </View>

          {/* Technical Details */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>🔧 Technische Details</Text>
            <InfoRow label="IMEI" value={asset.imei} />
            <InfoRow label="IMEI 2" value={asset.imei2} />
            <InfoRow label="MAC-Adresse" value={asset.mac} />
            <InfoRow label="MAC WiFi" value={asset.mac_wifi} />
            <InfoRow label="MAC BT" value={asset.mac_bluetooth} />
            <InfoRow label="EID" value={asset.eid} />
            <InfoRow label="SIM" value={asset.sim_number} />
          </View>

          {/* Stock/Inventory Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📊 Bestand</Text>
            <View style={styles.stockRow}>
              <View style={styles.stockItem}>
                <Text style={styles.stockLabel}>Auf Lager</Text>
                <Text style={[styles.stockValue, { color: theme.colors.success }]}>
                  {asset.stock_available || 0}
                </Text>
              </View>
              <View style={styles.stockItem}>
                <Text style={styles.stockLabel}>Im Umlauf</Text>
                <Text style={[styles.stockValue, { color: theme.colors.primary }]}>
                  {asset.stock_in_use || 0}
                </Text>
              </View>
              <View style={styles.stockItem}>
                <Text style={styles.stockLabel}>Installiert</Text>
                <Text style={[styles.stockValue, { color: theme.colors.warning }]}>
                  {asset.stock_installed || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Purchase Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>💰 Einkauf</Text>
            <InfoRow label="Lieferant" value={asset.supplier_name || asset.supplier} />
            <InfoRow label="Kaufdatum" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('de-DE') : null} />
            <InfoRow label="Kaufpreis" value={asset.purchase_price ? `${asset.purchase_price} €` : null} />
            <InfoRow label="Garantie bis" value={asset.warranty_until ? new Date(asset.warranty_until).toLocaleDateString('de-DE') : null} />
          </View>

          {/* Notes */}
          {asset.notes && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>📝 Notizen</Text>
              <Text style={styles.notesText}>{asset.notes}</Text>
            </View>
          )}

          {/* Timestamps */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📅 Zeitstempel</Text>
            <InfoRow label="Erstellt" value={asset.created_at ? new Date(asset.created_at).toLocaleString('de-DE') : null} />
            <InfoRow label="Aktualisiert" value={asset.updated_at ? new Date(asset.updated_at).toLocaleString('de-DE') : null} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  );
};

// Filter Chips - Scrollable
const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'verfügbar', label: 'Verfügbar' },
  { id: 'zugewiesen', label: 'Zugewiesen' },
  { id: 'installiert', label: 'Installiert' },
  { id: 'wartung', label: 'Wartung' },
  { id: 'defekt', label: 'Defekt' },
];

const AssetsScreen = ({ navigation, route }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (route.params?.assetId) {
      const asset = assets.find(a => a.asset_id === route.params.assetId);
      if (asset) {
        setSelectedAsset(asset);
        setModalVisible(true);
      }
    }
    if (route.params?.filter) {
      setStatusFilter(route.params.filter);
    }
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params?.assetId, route.params?.filter, route.params?.searchQuery, assets]);

  const loadAssets = async () => {
    try {
      const result = await assetsAPI.getAll();
      if (result?.success && result?.assets) {
        setAssets(result.assets);
      } else if (result?.success && result?.data?.assets) {
        setAssets(result.data.assets);
      } else if (Array.isArray(result?.assets)) {
        setAssets(result.assets);
      } else if (Array.isArray(result?.data)) {
        setAssets(result.data);
      } else if (Array.isArray(result)) {
        setAssets(result);
      } else {
        setAssets([]);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssets();
    setRefreshing(false);
  };

  const handlePrintLabel = async (asset) => {
    const isConnected = bluetoothPrinterService.isConnected();
    if (!isConnected) {
      Alert.alert(
        'Drucker nicht verbunden',
        'Bitte verbinden Sie zuerst einen Drucker in den Einstellungen.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Einstellungen', onPress: () => navigation.navigate('Settings') },
        ]
      );
      return;
    }

    try {
      Alert.alert('Drucke...', 'Label wird gedruckt...');
      await bluetoothPrinterService.printAssetLabel(asset);
      Alert.alert('Erfolg', `Label für ${asset.warehouse_asset_id || asset.asset_id} wurde gedruckt.`);
    } catch (error) {
      Alert.alert('Fehler', error.message);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      asset.warehouse_asset_id?.toLowerCase().includes(query) ||
      asset.asset_id?.toLowerCase().includes(query) ||
      asset.manufacturer_sn?.toLowerCase().includes(query) ||
      asset.imei?.toLowerCase().includes(query) ||
      asset.mac?.toLowerCase().includes(query) ||
      asset.manufacturer?.toLowerCase().includes(query) ||
      asset.type_label?.toLowerCase().includes(query) ||
      asset.tenant_name?.toLowerCase().includes(query) ||
      asset.location_name?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' ||
      asset.status?.toLowerCase().includes(statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="ID, SN, IMEI, MAC, Kunde..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Scrollable Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterChip, statusFilter === filter.id && styles.filterChipActive]}
            onPress={() => setStatusFilter(filter.id)}
          >
            <Text style={[styles.filterChipText, statusFilter === filter.id && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countText}>{filteredAssets.length} Assets</Text>

      {/* List */}
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.asset_id || item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <AssetCard 
            asset={item} 
            onPress={(asset) => { setSelectedAsset(asset); setModalVisible(true); }}
            onPrintLabel={handlePrintLabel}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Keine Assets gefunden</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <AssetDetailModal
        visible={modalVisible}
        asset={selectedAsset}
        onClose={() => { setModalVisible(false); setSelectedAsset(null); }}
        onPrintLabel={handlePrintLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  
  // Compact Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: 10,
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 14 },
  clearIcon: { fontSize: 16, color: theme.colors.textMuted, padding: 4 },
  
  // Filters
  filterScroll: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  
  countText: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 11, color: theme.colors.textMuted },
  listContent: { padding: 10, paddingTop: 0 },
  
  // Asset Card
  assetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  assetId: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  assetDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', marginBottom: 2 },
  detailLabel: { width: 60, fontSize: 12, color: theme.colors.textMuted },
  detailValue: { flex: 1, fontSize: 12, color: theme.colors.textPrimary },
  assetActions: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 },
  printButton: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  
  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 22, color: '#fff' },
  modalContent: { padding: 12 },
  
  idSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  assetIdLarge: { fontSize: 22, fontWeight: '700', color: theme.colors.primary },
  
  printLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  printLabelIcon: { fontSize: 18 },
  printLabelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { fontSize: 13, color: theme.colors.textMuted },
  infoValue: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  notesText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  
  stockRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stockItem: { alignItems: 'center' },
  stockLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 },
  stockValue: { fontSize: 20, fontWeight: '700' },
});

export default AssetsScreen;
