import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { dashboardAPI, healthAPI, tenantsAPI, locationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

// Status Badge Component
const StatusBadge = ({ status, label }) => {
  const isOnline = status === 'online';
  return (
    <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#22c55e20' : '#f59e0b20' }]}>
      <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22c55e' : '#f59e0b' }]} />
      <Text style={[styles.statusLabel, { color: isOnline ? '#22c55e' : '#f59e0b' }]}>{label}</Text>
    </View>
  );
};

// Stat Card with large numbers
const StatCard = ({ icon, title, value, subtitle, color, onPress }) => (
  <TouchableOpacity 
    style={styles.statCard} 
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.statCardHeader}>
      <Text style={styles.statCardIcon}>{icon}</Text>
      <Text style={styles.statCardTitle}>{title}</Text>
    </View>
    <Text style={[styles.statCardValue, color && { color }]}>{value || 0}</Text>
    {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

// Quick Action Button
const QuickAction = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <Text style={styles.quickActionIcon}>{icon}</Text>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Tenant/Customer List Item
const TenantItem = ({ name, deviceCount, locationCount }) => (
  <View style={styles.tenantItem}>
    <Text style={styles.tenantIcon}>🏢</Text>
    <View style={styles.tenantInfo}>
      <Text style={styles.tenantName}>{name}</Text>
      <Text style={styles.tenantStats}>{deviceCount} Geräte • {locationCount} Standorte</Text>
    </View>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_tenants: 0,
    total_customers: 0,
    total_locations: 0,
    total_devices: 0,
    total_users: 0,
    online_devices: 0,
    offline_devices: 0,
    in_preparation: 0,
    total_assets: 0,
  });
  const [serverStatus, setServerStatus] = useState('checking');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all data in parallel
      const [statsResult, healthResult, tenantsResult, locationsResult] = await Promise.all([
        dashboardAPI.getStats().catch(err => { console.log('Stats error:', err); return null; }),
        healthAPI.check().catch(err => ({ status: 'error' })),
        tenantsAPI?.getAll?.().catch(err => null) || Promise.resolve(null),
        locationsAPI?.getAll?.().catch(err => null) || Promise.resolve(null),
      ]);

      console.log('Dashboard stats loaded:', statsResult);

      if (statsResult) {
        setStats({
          total_tenants: statsResult.total_tenants || statsResult.tenants_count || 0,
          total_customers: statsResult.total_customers || statsResult.customers_count || 0,
          total_locations: statsResult.total_locations || statsResult.locations_count || 0,
          total_devices: statsResult.total_devices || statsResult.devices_count || 0,
          total_users: statsResult.total_users || statsResult.users_count || 0,
          online_devices: statsResult.online_devices || 0,
          offline_devices: statsResult.offline_devices || 0,
          in_preparation: statsResult.in_preparation || 0,
          total_assets: statsResult.total_assets || statsResult.total_devices || 0,
        });
      }
      
      // Set tenants list
      if (tenantsResult?.tenants) {
        setTenants(tenantsResult.tenants.slice(0, 5)); // Show top 5
      }
      
      // Set locations list
      if (locationsResult?.locations) {
        setLocations(locationsResult.locations.slice(0, 5)); // Show top 5
      }
      
      // Get tenant from user data
      if (user?.company) {
        setCurrentTenant(user.company);
      } else if (user?.tenant_name) {
        setCurrentTenant(user.tenant_name);
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
      {/* Header with User & Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hallo, {user?.name?.split(' ')[0] || 'Benutzer'}</Text>
          <StatusBadge status={serverStatus} label={serverStatus === 'online' ? 'Online' : 'Offline'} />
        </View>
      </View>
      
      {/* Current Tenant/Customer Info */}
      {currentTenant && (
        <View style={styles.tenantBar}>
          <Text style={styles.tenantBarIcon}>🏢</Text>
          <View style={styles.tenantBarInfo}>
            <Text style={styles.tenantBarLabel}>Aktiver Kunde</Text>
            <Text style={styles.tenantBarName}>{currentTenant}</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickAction icon="📷" label="Scannen" onPress={() => navigation.navigate('Scanner')} />
        <QuickAction icon="📦" label="Assets" onPress={() => navigation.navigate('Assets')} />
        <QuickAction icon="🏷️" label="Labels" onPress={() => navigation.navigate('Settings')} />
        <QuickAction icon="📍" label="Standorte" onPress={() => navigation.navigate('Locations')} />
      </View>

      {/* Main Stats - Devices */}
      <Text style={styles.sectionTitle}>Geräte Übersicht</Text>
      <View style={styles.mainStatsRow}>
        <TouchableOpacity 
          style={styles.mainStatCard}
          onPress={() => navigation.navigate('Assets')}
        >
          <Text style={styles.mainStatIcon}>📦</Text>
          <Text style={styles.mainStatValue}>{stats.total_devices}</Text>
          <Text style={styles.mainStatLabel}>Geräte gesamt</Text>
        </TouchableOpacity>
        
        <View style={styles.deviceStatusCards}>
          <TouchableOpacity style={styles.deviceStatusCard}>
            <View style={[styles.statusIndicator, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.deviceStatusValue}>{stats.online_devices}</Text>
            <Text style={styles.deviceStatusLabel}>Online</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deviceStatusCard}>
            <View style={[styles.statusIndicator, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.deviceStatusValue}>{stats.offline_devices}</Text>
            <Text style={styles.deviceStatusLabel}>Offline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deviceStatusCard}>
            <View style={[styles.statusIndicator, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.deviceStatusValue}>{stats.in_preparation}</Text>
            <Text style={styles.deviceStatusLabel}>Vorbereitung</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Secondary Stats Grid */}
      <Text style={styles.sectionTitle}>Systemübersicht</Text>
      <View style={styles.statsGrid}>
        <StatCard 
          icon="🏢" 
          title="Kunden" 
          value={stats.total_customers || stats.total_tenants}
        />
        <StatCard 
          icon="📍" 
          title="Standorte" 
          value={stats.total_locations}
        />
        <StatCard 
          icon="👥" 
          title="Benutzer" 
          value={stats.total_users}
        />
        <StatCard 
          icon="🏷️" 
          title="Assets" 
          value={stats.total_assets}
          onPress={() => navigation.navigate('Assets')}
        />
      </View>

      {/* Tenants List */}
      {tenants.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Kunden</Text>
          <View style={styles.tenantsList}>
            {tenants.map((tenant, index) => (
              <TenantItem 
                key={tenant.id || index}
                name={tenant.name || tenant.company_name || `Kunde ${index + 1}`}
                deviceCount={tenant.device_count || 0}
                locationCount={tenant.location_count || 0}
              />
            ))}
          </View>
        </>
      )}

      {/* App Info Footer */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>TSRID Mobile v1.8.0</Text>
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
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  
  // Status Badge
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
    fontWeight: '500',
  },
  
  // Tenant Bar
  tenantBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  tenantBarIcon: {
    fontSize: 24,
  },
  tenantBarInfo: {
    flex: 1,
  },
  tenantBarLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  tenantBarName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  
  // Main Stats Row
  mainStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  mainStatCard: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  mainStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Device Status Cards
  deviceStatusCards: {
    flex: 1,
    gap: 8,
  },
  deviceStatusCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceStatusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  deviceStatusLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statCardIcon: {
    fontSize: 16,
  },
  statCardTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statCardSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  
  // Tenants List
  tenantsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tenantIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tenantStats: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  
  // App Info
  appInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  appInfoText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});

export default DashboardScreen;
