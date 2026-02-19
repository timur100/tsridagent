/**
 * TSRID Mobile App - Home Screen
 * 
 * Dashboard mit Modul-Kacheln und Sync-Status.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { getEnabledModules, ModuleConfig } from '../../config/modules';
import { syncManager } from '../../services/sync/syncManager';
import assetService from '../../services/api/assets';

// Farben
const COLORS = {
  primary: '#c00000',
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444'
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [stats, setStats] = useState<{
    total_assets: number;
    in_storage: number;
    deployed: number;
  } | null>(null);

  const enabledModules = getEnabledModules(['admin']);

  useEffect(() => {
    loadData();

    const unsubscribe = syncManager.addListener((event) => {
      if (event.type === 'online') setIsOnline(true);
      if (event.type === 'offline') setIsOnline(false);
      if (event.type === 'sync_complete') {
        setQueueLength(syncManager.getStatus().queueLength);
      }
    });

    // Interval für Queue-Update
    const interval = setInterval(() => {
      setQueueLength(syncManager.getStatus().queueLength);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const statsData = await assetService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('[Home] Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const navigateToModule = (module: ModuleConfig) => {
    switch (module.id) {
      case 'goods_receipt':
        navigation.navigate('GoodsReceipt');
        break;
      case 'asset_search':
        navigation.navigate('AssetSearch');
        break;
      case 'label_print':
        navigation.navigate('LabelPrint');
        break;
      case 'inventory':
        navigation.navigate('Inventory');
        break;
      default:
        break;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Willkommen zurück</Text>
          <Text style={styles.title}>TSRID Mobile</Text>
        </View>
        <View style={styles.logoContainer}>
          <Icon name="barcode-scan" size={32} color={COLORS.primary} />
        </View>
      </View>

      {/* Sync Status */}
      <View style={[
        styles.syncCard,
        { borderColor: isOnline ? COLORS.success : COLORS.error }
      ]}>
        <View style={styles.syncIconContainer}>
          <Icon 
            name={isOnline ? 'cloud-check' : 'cloud-off-outline'} 
            size={28} 
            color={isOnline ? COLORS.success : COLORS.error} 
          />
        </View>
        <View style={styles.syncInfo}>
          <Text style={styles.syncStatus}>
            {isOnline ? 'Verbunden' : 'Offline'}
          </Text>
          {queueLength > 0 && (
            <Text style={styles.syncQueue}>
              {queueLength} Aktion{queueLength !== 1 ? 'en' : ''} in Warteschlange
            </Text>
          )}
        </View>
        {queueLength > 0 && isOnline && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={() => syncManager.forceSync()}
          >
            <Icon name="sync" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_assets}</Text>
            <Text style={styles.statLabel}>Gesamt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {stats.in_storage}
            </Text>
            <Text style={styles.statLabel}>Im Lager</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {stats.deployed}
            </Text>
            <Text style={styles.statLabel}>Deployed</Text>
          </View>
        </View>
      )}

      {/* Module Grid */}
      <Text style={styles.sectionTitle}>Module</Text>
      <View style={styles.modulesGrid}>
        {enabledModules.map(module => (
          <TouchableOpacity
            key={module.id}
            style={[styles.moduleCard, { borderColor: module.color }]}
            onPress={() => navigateToModule(module)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconBg, { backgroundColor: `${module.color}20` }]}>
              <Icon name={module.icon} size={28} color={module.color} />
            </View>
            <Text style={styles.moduleName}>{module.name}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>
              {module.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Schnellaktionen</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('GoodsReceipt')}
        >
          <Icon name="barcode-scan" size={24} color={COLORS.success} />
          <Text style={styles.quickActionText}>Scannen</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('LabelPrint')}
        >
          <Icon name="printer" size={24} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Drucken</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('AssetSearch')}
        >
          <Icon name="magnify" size={24} color="#8b5cf6" />
          <Text style={styles.quickActionText}>Suchen</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
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
    padding: 20,
    paddingTop: 56,
    backgroundColor: COLORS.card
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center'
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1
  },
  syncIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  syncInfo: {
    flex: 1,
    marginLeft: 12
  },
  syncStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  syncQueue: {
    fontSize: 13,
    color: COLORS.warning,
    marginTop: 2
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12
  },
  moduleCard: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  moduleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  moduleDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text
  },
  footer: {
    height: 100
  }
});

export default HomeScreen;
