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
  Alert,
} from 'react-native';
import { goodsReceiptAPI } from '../services/api';
import theme from '../utils/theme';

const StatusBadge = ({ status }) => {
  const getStyle = () => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'abgeschlossen':
        return { bg: '#22c55e20', color: '#22c55e', text: 'Abgeschlossen' };
      case 'pending':
      case 'ausstehend':
        return { bg: '#f59e0b20', color: '#f59e0b', text: 'Ausstehend' };
      case 'in_progress':
      case 'in_bearbeitung':
        return { bg: '#3b82f620', color: '#3b82f6', text: 'In Bearbeitung' };
      default:
        return { bg: '#6b728020', color: '#6b7280', text: status || 'Unbekannt' };
    }
  };
  const s = getStyle();
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.color }]}>{s.text}</Text>
    </View>
  );
};

const ReceiptCard = ({ receipt, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(receipt)}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardId}>{receipt.receipt_id || receipt.id}</Text>
      <StatusBadge status={receipt.status} />
    </View>
    <View style={styles.cardDetails}>
      <Text style={styles.cardDetail}>📦 {receipt.items_count || 0} Artikel</Text>
      <Text style={styles.cardDetail}>📅 {formatDate(receipt.created_at)}</Text>
    </View>
    {receipt.supplier && (
      <Text style={styles.cardSupplier}>🏭 {receipt.supplier}</Text>
    )}
  </TouchableOpacity>
);

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE');
  } catch (e) {
    return dateStr;
  }
};

const GoodsReceiptScreen = ({ navigation }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const result = await goodsReceiptAPI.getAll();
      if (result?.receipts) {
        setReceipts(result.receipts);
      } else if (Array.isArray(result)) {
        setReceipts(result);
      } else {
        setReceipts([]);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  };

  const handleReceiptPress = (receipt) => {
    Alert.alert(
      'Wareneingang',
      `ID: ${receipt.receipt_id || receipt.id}\nStatus: ${receipt.status}\nArtikel: ${receipt.items_count || 0}`,
      [{ text: 'OK' }]
    );
  };

  const handleNewReceipt = () => {
    navigation.navigate('Scanner');
    Alert.alert('Neuer Wareneingang', 'Scannen Sie die Artikel für den Wareneingang.');
  };

  const filteredReceipts = receipts.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (r.receipt_id || r.id || '').toLowerCase().includes(query) ||
      (r.supplier || '').toLowerCase().includes(query)
    );
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wareneingang</Text>
        <TouchableOpacity style={styles.newButton} onPress={handleNewReceipt}>
          <Text style={styles.newButtonText}>+ Neu</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.receipt_id || item.id || Math.random().toString()}
        renderItem={({ item }) => (
          <ReceiptCard receipt={item} onPress={handleReceiptPress} />
        )}
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
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyText}>Keine Wareneingänge</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewReceipt}>
              <Text style={styles.emptyButtonText}>Neuen Wareneingang starten</Text>
            </TouchableOpacity>
          </View>
        }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  newButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  cardDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardSupplier: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
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
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GoodsReceiptScreen;
