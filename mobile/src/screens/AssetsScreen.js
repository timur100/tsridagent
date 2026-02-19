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
} from 'react-native';
import { assetsAPI } from '../services/api';
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

const AssetCard = ({ asset, onPress }) => (
  <TouchableOpacity style={styles.assetCard} onPress={() => onPress(asset)}>
    <View style={styles.assetHeader}>
      <Text style={styles.assetId}>{asset.warehouse_asset_id || asset.asset_id || 'Keine ID'}</Text>
      <StatusBadge status={asset.status} />
    </View>
    <View style={styles.assetDetails}>
      <View style={styles.assetRow}>
        <Text style={styles.assetLabel}>Typ:</Text>
        <Text style={styles.assetValue}>{asset.type_label || asset.type || '-'}</Text>
      </View>
      <View style={styles.assetRow}>
        <Text style={styles.assetLabel}>Hersteller:</Text>
        <Text style={styles.assetValue}>{asset.manufacturer || '-'}</Text>
      </View>
      <View style={styles.assetRow}>
        <Text style={styles.assetLabel}>Seriennr.:</Text>
        <Text style={styles.assetValue}>{asset.manufacturer_sn || '-'}</Text>
      </View>
    </View>
    <View style={styles.assetFooter}>
      <Text style={styles.assetTimestamp}>
        {asset.created_at ? new Date(asset.created_at).toLocaleDateString('de-DE') : '-'}
      </Text>
    </View>
  </TouchableOpacity>
);

const AssetDetailModal = ({ visible, asset, onClose }) => {
  if (!asset) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Asset Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Asset ID */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Asset-ID</Text>
            <Text style={styles.detailValueLarge}>{asset.warehouse_asset_id || asset.asset_id}</Text>
          </View>

          {/* Status */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Status</Text>
            <StatusBadge status={asset.status} />
          </View>

          {/* General Info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Allgemein</Text>
            <DetailRow label="Typ" value={asset.type_label || asset.type} />
            <DetailRow label="Hersteller" value={asset.manufacturer} />
            <DetailRow label="Modell" value={asset.model} />
            <DetailRow label="Seriennummer" value={asset.manufacturer_sn} />
          </View>

          {/* Technical Info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Technisch</Text>
            <DetailRow label="IMEI" value={asset.imei} />
            <DetailRow label="MAC-Adresse" value={asset.mac} />
          </View>

          {/* Purchase Info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Einkauf</Text>
            <DetailRow label="Lieferant" value={asset.supplier_name || asset.supplier} />
            <DetailRow 
              label="Kaufdatum" 
              value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('de-DE') : null} 
            />
            <DetailRow 
              label="Kaufpreis" 
              value={asset.purchase_price ? `${asset.purchase_price} €` : null} 
            />
            <DetailRow 
              label="Garantie bis" 
              value={asset.warranty_until ? new Date(asset.warranty_until).toLocaleDateString('de-DE') : null} 
            />
          </View>

          {/* Notes */}
          {asset.notes && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Notizen</Text>
              <Text style={styles.notesText}>{asset.notes}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
};

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

  // Handle deep linking from scanner
  useEffect(() => {
    if (route.params?.assetId) {
      // Find and show the asset
      const asset = assets.find(a => a.asset_id === route.params.assetId);
      if (asset) {
        setSelectedAsset(asset);
        setModalVisible(true);
      }
    }
  }, [route.params?.assetId, assets]);

  const loadAssets = async () => {
    try {
      const result = await assetsAPI.getAll();
      if (result?.success && result?.data?.assets) {
        setAssets(result.data.assets);
      } else if (Array.isArray(result?.data)) {
        setAssets(result.data);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssets();
    setRefreshing(false);
  };

  const filteredAssets = assets.filter(asset => {
    // Search filter
    const matchesSearch = 
      !searchQuery ||
      asset.warehouse_asset_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.manufacturer_sn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type_label?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = 
      statusFilter === 'all' ||
      asset.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleAssetPress = (asset) => {
    setSelectedAsset(asset);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Assets werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Asset suchen..."
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
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {['all', 'verfügbar', 'zugewiesen', 'wartung', 'defekt'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, statusFilter === filter && styles.filterButtonActive]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
              {filter === 'all' ? 'Alle' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <Text style={styles.resultCount}>
        {filteredAssets.length} Asset{filteredAssets.length !== 1 ? 's' : ''} gefunden
      </Text>

      {/* Asset List */}
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.asset_id || item._id || Math.random().toString()}
        renderItem={({ item }) => <AssetCard asset={item} onPress={handleAssetPress} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Keine Assets gefunden</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Versuchen Sie eine andere Suche' : 'Noch keine Assets vorhanden'}
            </Text>
          </View>
        }
      />

      {/* Asset Detail Modal */}
      <AssetDetailModal
        visible={modalVisible}
        asset={selectedAsset}
        onClose={() => {
          setModalVisible(false);
          setSelectedAsset(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  searchContainer: {
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  clearIcon: {
    fontSize: 18,
    color: theme.colors.textMuted,
    padding: theme.spacing.sm,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  resultCount: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  assetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  assetId: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  assetDetails: {
    marginBottom: theme.spacing.sm,
  },
  assetRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  assetLabel: {
    width: 90,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  assetValue: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  assetFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  assetTimestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
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
  detailSection: {
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  detailValueLarge: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  detailCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailRowLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  detailRowValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default AssetsScreen;
