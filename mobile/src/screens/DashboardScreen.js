import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dashboardAPI, healthAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Compact Stat Card
const StatCard = ({ icon, value, label, onPress, color }) => (
  <TouchableOpacity 
    style={styles.statCard} 
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, color && { color }]}>{value || 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// Quick Action
const QuickAction = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <Text style={styles.qaIcon}>{icon}</Text>
    <Text style={styles.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// Burger Menu Modal
const BurgerMenu = ({ visible, onClose, navigation, user, onLogout }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <TouchableOpacity style={styles.menuOverlay} onPress={onClose} activeOpacity={1}>
      <View style={styles.menuContainer}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Menü</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.menuClose}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuUser}>
          <Text style={styles.menuUserIcon}>👤</Text>
          <View>
            <Text style={styles.menuUserName}>{user?.name || 'Benutzer'}</Text>
            <Text style={styles.menuUserEmail}>{user?.email || ''}</Text>
          </View>
        </View>
        
        <View style={styles.menuDivider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Dashboard'); }}>
          <Text style={styles.menuItemIcon}>🏠</Text>
          <Text style={styles.menuItemText}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Scanner'); }}>
          <Text style={styles.menuItemIcon}>📷</Text>
          <Text style={styles.menuItemText}>Scanner</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Assets'); }}>
          <Text style={styles.menuItemIcon}>📦</Text>
          <Text style={styles.menuItemText}>Assets / Geräte</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Locations'); }}>
          <Text style={styles.menuItemIcon}>📍</Text>
          <Text style={styles.menuItemText}>Standorte</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('GoodsReceipt'); }}>
          <Text style={styles.menuItemIcon}>📥</Text>
          <Text style={styles.menuItemText}>Wareneingang</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Settings'); }}>
          <Text style={styles.menuItemIcon}>⚙️</Text>
          <Text style={styles.menuItemText}>Einstellungen</Text>
        </TouchableOpacity>
        
        <View style={styles.menuDivider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Settings'); }}>
          <Text style={styles.menuItemIcon}>🖨️</Text>
          <Text style={styles.menuItemText}>Drucker</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); navigation.navigate('Settings'); }}>
          <Text style={styles.menuItemIcon}>🏷️</Text>
          <Text style={styles.menuItemText}>Labels drucken</Text>
        </TouchableOpacity>
        
        <View style={styles.menuDivider} />
        
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLogout]} onPress={onLogout}>
          <Text style={styles.menuItemIcon}>🚪</Text>
          <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Abmelden</Text>
        </TouchableOpacity>
        
        <Text style={styles.menuVersion}>TSRID Mobile v2.1.0</Text>
      </View>
    </TouchableOpacity>
  </Modal>
);

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    in_preparation: 0,
    total_locations: 0,
    total_customers: 0,
    total_users: 0,
  });
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResult, healthResult] = await Promise.all([
        dashboardAPI.getStats().catch(() => null),
        healthAPI.check().catch(() => ({ status: 'error' })),
      ]);

      if (statsResult) {
        setStats({
          total_devices: statsResult.total_devices || statsResult.devices_count || 0,
          online_devices: statsResult.online_devices || 0,
          offline_devices: statsResult.offline_devices || 0,
          in_preparation: statsResult.in_preparation || 0,
          total_locations: statsResult.total_locations || statsResult.locations_count || 0,
          total_customers: statsResult.total_customers || statsResult.total_tenants || 0,
          total_users: statsResult.total_users || statsResult.users_count || 0,
        });
      }
      setServerStatus(healthResult?.status === 'healthy' ? 'online' : 'offline');
    } catch (error) {
      console.error('Dashboard error:', error);
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

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header with Burger Menu */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hallo, {user?.name?.split(' ')[0] || 'Benutzer'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: serverStatus === 'online' ? '#22c55e20' : '#f59e0b20' }]}>
              <View style={[styles.statusDot, { backgroundColor: serverStatus === 'online' ? '#22c55e' : '#f59e0b' }]} />
              <Text style={[styles.statusText, { color: serverStatus === 'online' ? '#22c55e' : '#f59e0b' }]}>
                {serverStatus === 'online' ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.burgerButton} onPress={() => setMenuVisible(true)}>
            <Text style={styles.burgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Device Stats - Large */}
        <View style={styles.mainStats}>
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatIcon}>📦</Text>
            <Text style={styles.mainStatValue}>{stats.total_devices}</Text>
            <Text style={styles.mainStatLabel}>Geräte</Text>
          </View>
          
          <View style={styles.deviceStatusCol}>
            <View style={styles.deviceStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.deviceStatusValue}>{stats.online_devices}</Text>
              <Text style={styles.deviceStatusLabel}>Online</Text>
            </View>
            <View style={styles.deviceStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.deviceStatusValue}>{stats.offline_devices}</Text>
              <Text style={styles.deviceStatusLabel}>Offline</Text>
            </View>
            <View style={styles.deviceStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.deviceStatusValue}>{stats.in_preparation}</Text>
              <Text style={styles.deviceStatusLabel}>Vorbereitung</Text>
            </View>
          </View>
        </View>

        {/* Secondary Stats Row */}
        <View style={styles.statsRow}>
          <StatCard icon="📍" value={stats.total_locations} label="Standorte" onPress={() => navigation.navigate('Locations')} />
          <StatCard icon="🏢" value={stats.total_customers} label="Kunden" />
          <StatCard icon="👥" value={stats.total_users} label="Benutzer" />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Schnellzugriff</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction icon="📷" label="Scannen" onPress={() => navigation.navigate('Scanner')} />
          <QuickAction icon="📦" label="Assets" onPress={() => navigation.navigate('Assets')} />
          <QuickAction icon="📍" label="Standorte" onPress={() => navigation.navigate('Locations')} />
          <QuickAction icon="🏷️" label="Labels" onPress={() => navigation.navigate('Settings')} />
          <QuickAction icon="📥" label="Wareneingang" onPress={() => navigation.navigate('GoodsReceipt')} />
          <QuickAction icon="⚙️" label="Einstellungen" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScrollView>

      {/* Burger Menu */}
      <BurgerMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
        user={user}
        onLogout={handleLogout}
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
  
  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align to bottom
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  burgerButton: {
    padding: 6,
  },
  burgerIcon: {
    fontSize: 26,
    color: '#fff',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  
  // Main Stats
  mainStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mainStatCard: {
    flex: 1.2,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatIcon: {
    fontSize: 30,
    marginBottom: 4,
  },
  mainStatValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
  },
  mainStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  deviceStatusCol: {
    flex: 1,
    gap: 6,
  },
  deviceStatus: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 8,
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
    minWidth: 30,
  },
  deviceStatusLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  
  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAction: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  qaIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  qaLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  // Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  menuClose: {
    fontSize: 22,
    color: theme.colors.textMuted,
  },
  menuUser: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuUserIcon: {
    fontSize: 36,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  menuUserEmail: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  menuItemLogout: {
    marginTop: 8,
  },
  menuVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 16,
  },
});

export default DashboardScreen;
