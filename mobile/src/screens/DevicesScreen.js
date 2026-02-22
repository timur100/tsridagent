import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { devicesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

// Status badge component
const StatusBadge = ({ status }) => {
  const isOnline = status?.toLowerCase() === 'online';
  const isVorbereitung = status?.toLowerCase() === 'vorbereitung' || status?.toLowerCase() === 'preparation';
  
  let bgColor = '#ef444420';
  let textColor = '#ef4444';
  let label = 'Offline';
  
  if (isOnline) {
    bgColor = '#22c55e20';
    textColor = '#22c55e';
    label = 'Online';
  } else if (isVorbereitung) {
    bgColor = '#f59e0b20';
    textColor = '#f59e0b';
    label = 'Vorbereitung';
  }
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

// Device Card component
const DeviceCard = ({ device, onPress }) => (
  <TouchableOpacity style={styles.deviceCard} onPress={() => onPress(device)}>
    <View style={styles.deviceHeader}>
      <Text style={styles.deviceId}>{device.device_id || '-'}</Text>
      <StatusBadge status={device.status} />
    </View>
    
    <View style={styles.deviceDetails}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Standort:</Text>
        <Text style={styles.detailValue}>{device.locationcode || device.location_code || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Straße:</Text>
        <Text style={styles.detailValue} numberOfLines={1}>{device.street || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>PLZ/Ort:</Text>
        <Text style={styles.detailValue}>{device.zip || ''} {device.city || '-'}</Text>
      </View>
      {device.sn_pc && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SN-PC:</Text>
          <Text style={styles.detailValue}>{device.sn_pc}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// Device Detail Modal
const DeviceDetailModal = ({ visible, device, onClose }) => {
  if (!device) return null;
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{device.device_id || '-'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalStatusRow}>
              <StatusBadge status={device.status} />
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Standort</Text>
              <Text style={styles.modalValue}>{device.locationcode || device.location_code || '-'}</Text>
              <Text style={styles.modalSubValue}>{device.street || '-'}</Text>
              <Text style={styles.modalSubValue}>
                {device.zip || ''} {device.city || '-'}
              </Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Geräteinformationen</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device-ID:</Text>
                <Text style={styles.infoValue}>{device.device_id || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SN-PC:</Text>
                <Text style={styles.infoValue}>{device.sn_pc || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SN-SC:</Text>
                <Text style={styles.infoValue}>{device.sn_sc || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>TV-ID:</Text>
                <Text style={styles.infoValue}>{device.teamviewer_id || device.tv_id || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MAC:</Text>
                <Text style={styles.infoValue}>{device.mac_address || '-'}</Text>
              </View>
            </View>
            
            {device.last_seen && (
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Letzter Kontakt</Text>
                <Text style={styles.modalValue}>
                  {new Date(device.last_seen).toLocaleString('de-DE')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const DevicesScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    preparation: 0,
  });
  
  // Get tenant_id (support both single and array format)
  const tenantId = user?.tenant_id || (user?.tenant_ids && user?.tenant_ids[0]) || null;

  useEffect(() => {
    loadDevices();
  }, [tenantId]);

  useEffect(() => {
    filterDevices();
  }, [devices, searchQuery, statusFilter]);

  const loadDevices = async () => {
    try {
      let result;
      if (user?.tenant_id) {
        result = await devicesAPI.getByTenant(user.tenant_id);
      } else {
        result = await devicesAPI.getAll();
      }
      
      const deviceList = result?.devices || [];
      const summary = result?.summary || { total: 0, online: 0, offline: 0, in_vorbereitung: 0 };
      
      setDevices(deviceList);
      
      // Use backend summary stats if available
      setStats({
        total: summary.total || deviceList.length,
        online: summary.online || deviceList.filter(d => d.status?.toLowerCase() === 'online').length,
        offline: summary.offline || deviceList.filter(d => d.status?.toLowerCase() === 'offline').length,
        preparation: summary.in_vorbereitung || deviceList.filter(d => 
          d.status?.toLowerCase() === 'in_vorbereitung' || d.status?.toLowerCase() === 'vorbereitung'
        ).length,
      });
    } catch (error) {
      console.error('Error loading devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = [...devices];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        const status = d.status?.toLowerCase();
        if (statusFilter === 'online') return status === 'online';
        if (statusFilter === 'offline') return status === 'offline';
        if (statusFilter === 'preparation') return status === 'in_vorbereitung' || status === 'vorbereitung' || status === 'preparation';
        return true;
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        (d.device_id || '').toLowerCase().includes(query) ||
        (d.locationcode || d.location_code || '').toLowerCase().includes(query) ||
        (d.city || '').toLowerCase().includes(query) ||
        (d.sn_pc || '').toLowerCase().includes(query) ||
        (d.street || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredDevices(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  const handleDevicePress = (device) => {
    setSelectedDevice(device);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Lade Geräte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Tenant */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Geräte</Text>
          {user?.tenant_name && (
            <Text style={styles.tenantLabel}>{user.tenant_name}</Text>
          )}
        </View>
        <Text style={styles.count}>{filteredDevices.length} von {stats.total}</Text>
      </View>
      
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard, statusFilter === 'all' && styles.statCardActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, statusFilter === 'online' && styles.statCardActive]}
          onPress={() => setStatusFilter('online')}
        >
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.online}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, statusFilter === 'offline' && styles.statCardActive]}
          onPress={() => setStatusFilter('offline')}
        >
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.offline}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, statusFilter === 'preparation' && styles.statCardActive]}
          onPress={() => setStatusFilter('preparation')}
        >
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.preparation}</Text>
          <Text style={styles.statLabel}>Vorb.</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Suche nach Device-ID, Location, Stadt, S/N..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Device List */}
      <FlatList
        data={filteredDevices}
        keyExtractor={(item, index) => item.device_id || item.deviceId || item._id || `device-${index}`}
        renderItem={({ item }) => (
          <DeviceCard device={item} onPress={handleDevicePress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Keine Geräte gefunden</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Versuchen Sie eine andere Suche' : 'Keine Geräte verfügbar'}
            </Text>
          </View>
        }
      />

      {/* Device Detail Modal */}
      <DeviceDetailModal
        visible={modalVisible}
        device={selectedDevice}
        onClose={() => {
          setModalVisible(false);
          setSelectedDevice(null);
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
    marginTop: 12,
    color: theme.colors.textMuted,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tenantLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  count: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardActive: {
    borderColor: theme.colors.primary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  clearSearch: {
    position: 'absolute',
    right: 24,
    padding: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  
  // List
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  
  // Device Card
  deviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deviceId: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  deviceDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    width: 60,
  },
  detailValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  
  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  modalContent: {
    padding: 16,
  },
  modalStatusRow: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  modalSubValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
});

export default DevicesScreen;
