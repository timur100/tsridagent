import React, { useState, useEffect, useCallback } from 'react';
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
  Vibration,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { locationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket, useRealtimeUpdates, usePollingUpdates } from '../contexts/WebSocketContext';
import BluetoothPrinterService from '../services/BluetoothPrinterService';
import theme from '../utils/theme';

// Helper function to open navigation
const openNavigation = (location) => {
  if (!location) return;
  
  // Build address for navigation
  const address = [
    location.street,
    location.postal_code,
    location.city,
    location.country || 'Deutschland'
  ].filter(Boolean).join(', ');
  
  // Use Google Maps for navigation
  const encodedAddress = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps://app?daddr=${encodedAddress}`,
    android: `google.navigation:q=${encodedAddress}`,
  });
  
  // Fallback to Google Maps URL
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Linking.openURL(fallbackUrl);
    }
  }).catch(() => {
    Linking.openURL(fallbackUrl);
  });
};

// Helper function to make phone call
const makePhoneCall = (phoneNumber) => {
  if (!phoneNumber || phoneNumber === '-') return;
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const url = Platform.OS === 'android' ? `tel:${cleanNumber}` : `telprompt:${cleanNumber}`;
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    }
  });
};

// Location Detail Modal
const LocationDetailModal = ({ visible, location, onClose, onPrintLabel }) => {
  if (!location) return null;
  
  const phone = location.phone || location.telefon || null;
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Standort Details</Text>
          <View style={{ width: 30 }} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.detailCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationName}>{location.station_name || '-'}</Text>
            <Text style={styles.locationId}>{location.location_code || '-'}</Text>
            
            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              {/* Navigation Button */}
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => openNavigation(location)}
              >
                <Text style={styles.actionButtonIcon}>🧭</Text>
                <Text style={styles.actionButtonText}>Navigation</Text>
              </TouchableOpacity>
              
              {/* Call Button */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonCall, !phone && styles.actionButtonDisabled]}
                onPress={() => phone && makePhoneCall(phone)}
                disabled={!phone}
              >
                <Text style={styles.actionButtonIcon}>📞</Text>
                <Text style={styles.actionButtonText}>Anrufen</Text>
              </TouchableOpacity>
              
              {/* Print Label Button */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonPrint]}
                onPress={() => onPrintLabel && onPrintLabel(location)}
              >
                <Text style={styles.actionButtonIcon}>🏷️</Text>
                <Text style={styles.actionButtonText}>Label</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            <InfoRow label="Straße" value={location.street} />
            <InfoRow label="PLZ / Stadt" value={`${location.postal_code || ''} ${location.city || ''}`} />
            <InfoRow label="Bundesland" value={location.state} />
            <InfoRow label="Land" value={location.country} />
            <InfoRow label="Kontinent" value={location.continent} />
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Kontakt</Text>
            <InfoRow label="Manager" value={location.manager} />
            <InfoRow label="Telefon" value={location.phone} />
            <InfoRow label="Telefon Int." value={location.phone_internal} />
            <InfoRow label="E-Mail" value={location.email} />
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Geräte</Text>
            <InfoRow label="Geräte" value={`${location.online_device_count || 0} / ${location.device_count || 0} online`} />
            <InfoRow label="SN-PC" value={location.sn_pc} />
            <InfoRow label="SN-SC" value={location.sn_sc} />
            <InfoRow label="TV-ID" value={location.tv_id} />
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            <InfoRow label="Standort-ID" value={location.location_id} />
            <InfoRow label="Typ" value={location.main_type} />
            <InfoRow label="Status" value={location.status} />
            <InfoRow label="Erstellt" value={formatDate(location.created_at)} />
            <InfoRow label="Aktualisiert" value={formatDate(location.updated_at)} />
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
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

// Location Card - Code top left, Station name on same row
const LocationCard = ({ location, onPress }) => {
  // Determine online status based on device_count and online_device_count
  const deviceCount = location.device_count || 0;
  const onlineCount = location.online_device_count || 0;
  const isOnline = onlineCount > 0;
  
  // Determine main status
  const status = location.status || 'active';
  const isActive = status === 'active';
  
  return (
    <TouchableOpacity style={styles.locationCard} onPress={() => onPress(location)}>
      {/* Row 1: Code (top left) + Status Badges (right) */}
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardCodeTopLeft}>{location.location_code || '-'}</Text>
        <View style={styles.badgesRow}>
          <View style={[styles.onlineBadge, { backgroundColor: isOnline ? '#22c55e20' : '#ef444420' }]}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
            <Text style={[styles.onlineText, { color: isOnline ? '#22c55e' : '#ef4444' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#3b82f620' : '#f59e0b20' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#3b82f6' : '#f59e0b' }]}>
              {isActive ? 'Aktiv' : status}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Row 2: Station Name (full width) */}
      <Text style={styles.cardStationFull} numberOfLines={2}>
        {location.station_name || '-'}
      </Text>
      
      {/* Row 3: Address Details */}
      <View style={styles.cardRowDetails}>
        <View style={styles.detailsLeft}>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {location.street || '-'}
          </Text>
          <Text style={styles.cardCity} numberOfLines={1}>
            {location.postal_code || ''} {location.city || '-'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const LocationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
  });
  
  // Get tenant_id (support both single and array format)
  const tenantId = user?.tenant_id || (user?.tenant_ids && user?.tenant_ids[0]) || null;

  // Handle realtime location updates
  const handleLocationUpdate = useCallback((data) => {
    console.log('[LocationsScreen] WebSocket update received:', data);
    
    // Vibrate to indicate update
    Vibration.vibrate(100);
    
    // Reload locations to get fresh data
    loadLocations();
  }, [tenantId]);

  // Subscribe to WebSocket updates
  useRealtimeUpdates('location_update', handleLocationUpdate);
  
  // Subscribe to polling updates (fallback every 30 seconds)
  usePollingUpdates(useCallback(() => {
    console.log('[LocationsScreen] Polling update triggered');
    loadLocations();
  }, [tenantId]));

  useEffect(() => {
    loadLocations();
  }, [tenantId]);

  useEffect(() => {
    filterLocations();
  }, [locations, searchQuery, statusFilter]);

  const loadLocations = async () => {
    try {
      // Load tenant-specific locations
      let result;
      if (tenantId) {
        result = await locationsAPI.getByTenant(tenantId);
      } else {
        result = await locationsAPI.getAll();
      }
      
      const locationList = result?.locations || [];
      setLocations(locationList);
      
      // Calculate stats
      const online = locationList.filter(l => (l.online_device_count || 0) > 0).length;
      const offline = locationList.filter(l => (l.online_device_count || 0) === 0).length;
      
      setStats({
        total: locationList.length,
        online,
        offline,
      });
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = [...locations];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => {
        const hasOnlineDevices = (l.online_device_count || 0) > 0;
        if (statusFilter === 'online') return hasOnlineDevices;
        if (statusFilter === 'offline') return !hasOnlineDevices;
        return true;
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        (l.location_code || '').toLowerCase().includes(query) ||
        (l.station_name || '').toLowerCase().includes(query) ||
        (l.city || '').toLowerCase().includes(query) ||
        (l.postal_code || '').toLowerCase().includes(query) ||
        (l.street || '').toLowerCase().includes(query)
      );
    }
    
    setFilteredLocations(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  };

  const handleLocationPress = (location) => {
    setSelectedLocation(location);
    setModalVisible(true);
  };

  // Handle label printing for a location
  const handlePrintLabel = async (location) => {
    try {
      // Check if printer is connected
      const printerStatus = BluetoothPrinterService.getConnectionStatus();
      
      if (!printerStatus.isConnected) {
        Alert.alert(
          'Drucker nicht verbunden',
          'Bitte verbinden Sie zuerst einen Drucker in den Einstellungen.',
          [
            { text: 'OK' }
          ]
        );
        return;
      }
      
      // Build location data for label
      const locationData = {
        location_code: location.location_code || '-',
        station_name: location.station_name || '-',
        street: location.street || '-',
        postal_code: location.postal_code || '',
        city: location.city || '-',
        phone: location.phone || '-',
        manager: location.manager || '-',
        device_count: location.device_count || 0,
      };
      
      Alert.alert(
        'Label drucken',
        `Standort-Label für ${locationData.location_code} drucken?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { 
            text: 'Drucken', 
            onPress: async () => {
              try {
                await BluetoothPrinterService.printLocationLabel(locationData);
                Alert.alert('Erfolg', 'Label wurde gedruckt!');
              } catch (printError) {
                console.error('Print error:', printError);
                Alert.alert('Fehler', `Druckfehler: ${printError.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Print label error:', error);
      Alert.alert('Fehler', `Fehler: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Lade Standorte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Tenant Info and Live Indicator */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Standorte</Text>
            {isConnected ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            ) : (
              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineText}>OFFLINE</Text>
              </View>
            )}
          </View>
          {user?.tenant_name && (
            <Text style={styles.tenantLabel}>{user.tenant_name}</Text>
          )}
        </View>
        <Text style={styles.count}>{filteredLocations.length} von {stats.total}</Text>
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
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Suche nach Code, Station, Stadt..."
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

      {/* List */}
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.location_id || item.location_code || Math.random().toString()}
        renderItem={({ item }) => (
          <LocationCard location={item} onPress={handleLocationPress} />
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
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>Keine Standorte gefunden</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Versuchen Sie eine andere Suche' : 'Keine Standorte verfügbar'}
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <LocationDetailModal
        visible={modalVisible}
        location={selectedLocation}
        onClose={() => { setModalVisible(false); setSelectedLocation(null); }}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22c55e',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444420',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  offlineText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ef4444',
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
  
  // Stats Row
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
  
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  
  // Location Card - Code top left layout
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCodeTopLeft: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cardStationFull: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  
  // Online Badge
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '600',
  },
  
  // Status Badge
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  
  // Row - Details
  cardRowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  detailsLeft: {
    flex: 1,
  },
  detailsRight: {
    alignItems: 'flex-end',
  },
  cardAddress: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  cardCity: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  deviceCount: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
  },
  closeButton: {
    fontSize: 22,
    color: '#fff',
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  
  // Detail Card
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  locationName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  locationId: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: 16,
  },
  
  // Navigation Button
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  navButtonIcon: {
    fontSize: 20,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Info Section
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    width: 100,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
});

export default LocationsScreen;
