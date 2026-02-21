import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, healthAPI } from '../services/api';
import theme from '../utils/theme';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 6;
const CARD_WIDTH = (width - 32 - CARD_MARGIN * 2) / 2;

// Compact Stat Card - all same size
const StatCard = ({ title, value, icon, color, onPress, subtitle }) => (
  <TouchableOpacity 
    style={styles.statCard} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.statIconRow}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
    <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

// Quick Action Button
const QuickAction = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.quickActionIcon}>
      <Text style={styles.quickActionIconText}>{icon}</Text>
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Status Badge
const StatusBadge = ({ status, label }) => {
  const color = status === 'online' ? theme.colors.success : 
                status === 'offline' ? theme.colors.error : theme.colors.warning;
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_tenants: 0,
    total_users: 0,
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    in_preparation: 0,
    total_locations: 0,
    total_assets: 0,
  });
  const [serverStatus, setServerStatus] = useState('checking');
  const [currentTenant, setCurrentTenant] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResult, healthResult] = await Promise.all([
        dashboardAPI.getStats().catch(err => null),
        healthAPI.check().catch(err => ({ status: 'error' })),
      ]);

      if (statsResult) {
        const statsData = statsResult.data || statsResult;
        if (statsData.total_devices !== undefined || statsData.total_tenants !== undefined) {
          setStats({
            total_tenants: statsData.total_tenants || 0,
            total_users: statsData.total_users || 0,
            total_devices: statsData.total_devices || 0,
            online_devices: statsData.online_devices || 0,
            offline_devices: statsData.offline_devices || 0,
            in_preparation: statsData.in_preparation || 0,
            total_locations: statsData.total_locations || 0,
            total_assets: statsData.total_assets || 0,
          });
        }
        // Set current tenant from stats or user
        if (statsData.tenant_name || statsData.tenant) {
          setCurrentTenant(statsData.tenant_name || statsData.tenant);
        }
      }
      
      // Get tenant from user data
      if (user?.tenant_name) {
        setCurrentTenant(user.tenant_name);
      } else if (user?.tenant_id) {
        setCurrentTenant(user.tenant_id);
      }
      
      setServerStatus(healthResult?.status === 'healthy' ? 'online' : 'offline');
    } catch (error) {
      console.error('Dashboard load error:', error);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hallo, {user?.name?.split(' ')[0] || 'Benutzer'}</Text>
          <StatusBadge status={serverStatus} label={serverStatus === 'online' ? 'Online' : 'Offline'} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickAction icon="📷" label="Scannen" onPress={() => navigation.navigate('Scanner')} />
        <QuickAction icon="📦" label="Assets" onPress={() => navigation.navigate('Assets')} />
        <QuickAction icon="🏷️" label="Labels" onPress={() => navigation.navigate('Settings')} />
        <QuickAction icon="📍" label="Standorte" onPress={() => navigation.navigate('Assets', { filter: 'locations' })} />
      </View>

      {/* System Overview - Grid Layout */}
      <Text style={styles.sectionTitle}>Systemübersicht</Text>
      <View style={styles.statsGrid}>
        <StatCard 
          icon="📦" 
          title="Geräte gesamt" 
          value={stats.total_devices} 
          onPress={() => navigation.navigate('Assets')}
        />
        <StatCard 
          icon="🟢" 
          title="Online" 
          value={stats.online_devices} 
          color={theme.colors.success}
          onPress={() => navigation.navigate('Assets', { filter: 'online' })}
        />
        <StatCard 
          icon="🔴" 
          title="Offline" 
          value={stats.offline_devices} 
          color={theme.colors.error}
          onPress={() => navigation.navigate('Assets', { filter: 'offline' })}
        />
        <StatCard 
          icon="⏳" 
          title="In Vorbereitung" 
          value={stats.in_preparation} 
          color={theme.colors.warning}
          onPress={() => navigation.navigate('Assets', { filter: 'preparation' })}
        />
        <StatCard 
          icon="📍" 
          title="Standorte" 
          value={stats.total_locations}
          onPress={() => navigation.navigate('Assets', { filter: 'locations' })}
        />
        <StatCard 
          icon="🏢" 
          title="Kunden" 
          value={stats.total_tenants}
          onPress={() => navigation.navigate('Assets', { filter: 'tenants' })}
        />
        <StatCard 
          icon="👥" 
          title="Benutzer" 
          value={stats.total_users}
          onPress={() => navigation.navigate('Settings')}
        />
        <StatCard 
          icon="🗃️" 
          title="Assets" 
          value={stats.total_assets}
          onPress={() => navigation.navigate('Assets')}
        />
      </View>

      {/* Inventory Overview */}
      <Text style={styles.sectionTitle}>Bestand</Text>
      <View style={styles.inventoryCard}>
        <View style={styles.inventoryRow}>
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryLabel}>Auf Lager</Text>
            <Text style={[styles.inventoryValue, { color: theme.colors.success }]}>
              {stats.total_devices - stats.online_devices - stats.in_preparation}
            </Text>
          </View>
          <View style={styles.inventoryDivider} />
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryLabel}>Im Umlauf</Text>
            <Text style={[styles.inventoryValue, { color: theme.colors.primary }]}>
              {stats.online_devices}
            </Text>
          </View>
          <View style={styles.inventoryDivider} />
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryLabel}>Installiert</Text>
            <Text style={[styles.inventoryValue, { color: theme.colors.warning }]}>
              {stats.in_preparation}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  // Compact Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionIconText: {
    fontSize: 18,
  },
  quickActionLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  // Stats Grid - Equal sized cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN,
    marginBottom: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    margin: CARD_MARGIN,
  },
  statIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // Inventory Card
  inventoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inventoryItem: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  inventoryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  inventoryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default DashboardScreen;
