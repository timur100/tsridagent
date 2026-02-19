/**
 * TSRID Mobile App - Asset Search Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import assetService, { Asset } from '../../services/api/assets';
import { dataWedgeService } from '../../services/hardware/datawedge';

const COLORS = {
  primary: '#c00000',
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  success: '#22c55e'
};

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    // Scanner-Listener für direkte Suche
    const unsubscribe = dataWedgeService.addListener((result) => {
      setQuery(result.data);
      searchAssets(result.data);
    });
    return unsubscribe;
  }, []);

  const searchAssets = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await assetService.searchAsset(searchQuery);
      setResults(response.items || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    searchAssets(query);
  };

  const renderAsset = ({ item }: { item: Asset }) => (
    <TouchableOpacity 
      style={styles.assetCard}
      onPress={() => setSelectedAsset(item)}
    >
      <View style={styles.assetIcon}>
        <Icon name="package-variant" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetId}>{item.asset_id || item.warehouse_asset_id}</Text>
        <Text style={styles.assetSN}>{item.manufacturer_sn}</Text>
        <Text style={styles.assetType}>{item.type_label || item.type}</Text>
      </View>
      <View style={[
        styles.statusBadge,
        { backgroundColor: item.status === 'deployed' ? COLORS.primary + '20' : COLORS.success + '20' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: item.status === 'deployed' ? COLORS.primary : COLORS.success }
        ]}>
          {item.status === 'deployed' ? 'Deployed' : 'Lager'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Asset-Suche</Text>
      </View>

      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Asset-ID oder Seriennummer..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator color={COLORS.primary} />}
      </View>

      <Text style={styles.hint}>
        <Icon name="barcode-scan" size={14} color={COLORS.textSecondary} /> 
        {' '}Oder Barcode scannen für direkte Suche
      </Text>

      <FlatList
        data={results}
        renderItem={renderAsset}
        keyExtractor={item => item.asset_id || item.warehouse_asset_id || item.manufacturer_sn}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="magnify" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              {query ? 'Keine Assets gefunden' : 'Suche starten...'}
            </Text>
          </View>
        }
      />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginHorizontal: 16,
    marginBottom: 8
  },
  list: {
    padding: 16
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center'
  },
  assetInfo: {
    flex: 1,
    marginLeft: 12
  },
  assetId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  assetSN: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace'
  },
  assetType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 16
  }
});

export default SearchScreen;
