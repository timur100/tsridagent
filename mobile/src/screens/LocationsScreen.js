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
} from 'react-native';
import { locationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

// Location Detail Modal
const LocationDetailModal = ({ visible, location, onClose }) => {
  if (!location) return null;
  
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
            <Text style={styles.locationName}>{location.name}</Text>
            <Text style={styles.locationId}>{location.location_id}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            <InfoRow label="Straße" value={location.address} />
            <InfoRow label="Stadt" value={location.city} />
            <InfoRow label="Land" value={location.country} />
            {location.latitude && <InfoRow label="Koordinaten" value={`${location.latitude}, ${location.longitude}`} />}
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            <InfoRow label="Standort-ID" value={location.location_id} />
            <InfoRow label="Tenant-ID" value={location.tenant_id} />
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

// Location Card
const LocationCard = ({ location, onPress }) => (
  <TouchableOpacity style={styles.locationCard} onPress={() => onPress(location)}>
    <View style={styles.cardLeft}>
      <Text style={styles.cardIcon}>📍</Text>
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardName}>{location.name}</Text>
      <Text style={styles.cardId}>{location.location_id}</Text>
      <Text style={styles.cardAddress}>
        {[location.address, location.city, location.country].filter(Boolean).join(', ')}
      </Text>
    </View>
    <Text style={styles.cardArrow}>›</Text>
  </TouchableOpacity>
);

const LocationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadLocations();
  }, [user?.tenant_id]);

  const loadLocations = async () => {
    try {
      // Try to load tenant-specific locations first
      let result;
      if (user?.tenant_id) {
        result = await locationsAPI.getByTenant(user.tenant_id);
      }
      
      // Fallback to all locations
      if (!result?.locations?.length) {
        result = await locationsAPI.getAll();
      }
      
      if (result?.locations) {
        setLocations(result.locations);
      } else if (Array.isArray(result)) {
        setLocations(result);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Tenant Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Standorte</Text>
          {user?.tenant_name && (
            <Text style={styles.tenantLabel}>{user.tenant_name}</Text>
          )}
        </View>
        <Text style={styles.count}>{locations.length} Standorte</Text>
      </View>

      {/* List */}
      <FlatList
        data={locations}
        keyExtractor={(item) => item.location_id || item.id || Math.random().toString()}
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
  listContent: {
    padding: 12,
  },
  
  // Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardLeft: {
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardId: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  cardArrow: {
    fontSize: 24,
    color: theme.colors.textMuted,
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
    fontSize: 14,
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
