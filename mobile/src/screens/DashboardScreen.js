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
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, healthAPI } from '../services/api';
import theme from '../utils/theme';

const StatCard = ({ title, value, icon, color, onPress }) => (
  <TouchableOpacity 
    style={[styles.statCard, onPress && styles.statCardClickable]} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.statContent}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statTextContainer}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const StatusBadge = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return theme.colors.success;
      case 'offline':
        return theme.colors.error;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <Text style={[styles.statusLabel, { color: getStatusColor() }]}>{label}</Text>
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load dashboard stats
      const [statsResult, healthResult] = await Promise.all([
        dashboardAPI.getStats().catch(err => {
          console.error('Stats error:', err);
          return null;
        }),
        healthAPI.check().catch(err => {
          console.error('Health error:', err);
          return { status: 'error' };
        }),
      ]);

      // Handle stats - API returns direct data without success wrapper
      if (statsResult) {
        // Check if response has data wrapper or is direct
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
        <Text style={styles.loadingText}>Daten werden geladen...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Willkommen zurück,</Text>
        <Text style={styles.userName}>{user?.name || user?.email || 'Benutzer'}</Text>
        <StatusBadge 
          status={serverStatus} 
          label={serverStatus === 'online' ? 'Server verbunden' : 'Server offline'} 
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schnellzugriff</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Text style={styles.quickActionIcon}>📷</Text>
            <Text style={styles.quickActionText}>Scannen</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('Assets')}
          >
            <Text style={styles.quickActionIcon}>📦</Text>
            <Text style={styles.quickActionText}>Assets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => {}}
          >
            <Text style={styles.quickActionIcon}>🏷️</Text>
            <Text style={styles.quickActionText}>Labels</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => {}}
          >
            <Text style={styles.quickActionIcon}>📍</Text>
            <Text style={styles.quickActionText}>Standorte</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Systemübersicht</Text>
        
        <View style={styles.statsGrid}>
          <StatCard 
            title="Geräte" 
            value={stats.total_devices} 
            icon="📱"
          />
          <StatCard 
            title="Online" 
            value={stats.online_devices} 
            icon="🟢"
            color={theme.colors.success}
          />
          <StatCard 
            title="Offline" 
            value={stats.offline_devices} 
            icon="🔴"
            color={theme.colors.error}
          />
          <StatCard 
            title="Standorte" 
            value={stats.total_locations} 
            icon="📍"
          />
          <StatCard 
            title="Kunden" 
            value={stats.total_tenants} 
            icon="👥"
          />
          <StatCard 
            title="Mitarbeiter" 
            value={stats.total_users} 
            icon="👤"
          />
        </View>
      </View>

      {/* Device Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gerätestatus</Text>
        <View style={styles.deviceStatusCard}>
          <View style={styles.deviceStatusRow}>
            <View style={styles.deviceStatusItem}>
              <View style={[styles.deviceStatusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.deviceStatusLabel}>Online</Text>
              <Text style={styles.deviceStatusValue}>{stats.online_devices}</Text>
            </View>
            <View style={styles.deviceStatusItem}>
              <View style={[styles.deviceStatusDot, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.deviceStatusLabel}>Offline</Text>
              <Text style={styles.deviceStatusValue}>{stats.offline_devices}</Text>
            </View>
            <View style={styles.deviceStatusItem}>
              <View style={[styles.deviceStatusDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.deviceStatusLabel}>Vorbereitung</Text>
              <Text style={styles.deviceStatusValue}>{stats.in_preparation}</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.colors.success,
                  flex: stats.online_devices || 1,
                }
              ]} 
            />
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.colors.error,
                  flex: stats.offline_devices || 0.1,
                }
              ]} 
            />
            <View 
              style={[
                styles.progressSegment, 
                { 
                  backgroundColor: theme.colors.warning,
                  flex: stats.in_preparation || 0.1,
                }
              ]} 
            />
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
    padding: theme.spacing.md,
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
    fontSize: theme.fontSize.md,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  userName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.sm,
  },
  quickActionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  statCard: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  statCardClickable: {
    opacity: 1,
  },
  statContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  statIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  deviceStatusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  deviceStatusItem: {
    alignItems: 'center',
  },
  deviceStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: theme.spacing.xs,
  },
  deviceStatusLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  deviceStatusValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceLight,
  },
  progressSegment: {
    height: '100%',
  },
});

export default DashboardScreen;
