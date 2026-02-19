import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingsRow = ({ icon, label, value, onPress, showArrow = true }) => (
  <TouchableOpacity style={styles.settingsRow} onPress={onPress} disabled={!onPress}>
    <View style={styles.settingsRowLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={styles.settingsLabel}>{label}</Text>
    </View>
    <View style={styles.settingsRowRight}>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      {showArrow && onPress && <Text style={styles.arrow}>›</Text>}
    </View>
  </TouchableOpacity>
);

const SettingsToggle = ({ icon, label, value, onValueChange }) => (
  <View style={styles.settingsRow}>
    <View style={styles.settingsRowLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={styles.settingsLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor="#fff"
    />
  </View>
);

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Benutzer'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Benutzer'}</Text>
          </View>
        </View>
      </View>

      {/* Scanner Settings */}
      <SettingsSection title="Scanner">
        <SettingsToggle
          icon="📷"
          label="Automatischer Fokus"
          value={true}
          onValueChange={() => {}}
        />
        <SettingsToggle
          icon="💡"
          label="Blitz automatisch"
          value={false}
          onValueChange={() => {}}
        />
        <SettingsToggle
          icon="🔊"
          label="Ton bei Scan"
          value={true}
          onValueChange={() => {}}
        />
        <SettingsToggle
          icon="📳"
          label="Vibration bei Scan"
          value={true}
          onValueChange={() => {}}
        />
      </SettingsSection>

      {/* Printer Settings */}
      <SettingsSection title="Drucker">
        <SettingsRow
          icon="🖨️"
          label="Bluetooth-Drucker"
          value="Nicht verbunden"
          onPress={() => Alert.alert('Drucker', 'Bluetooth-Drucker werden gesucht...')}
        />
        <SettingsRow
          icon="🏷️"
          label="Label-Format"
          value="50x30mm"
          onPress={() => {}}
        />
        <SettingsRow
          icon="📐"
          label="Label-Vorlage"
          value="Standard"
          onPress={() => {}}
        />
      </SettingsSection>

      {/* Sync Settings */}
      <SettingsSection title="Synchronisation">
        <SettingsToggle
          icon="🔄"
          label="Automatische Sync"
          value={true}
          onValueChange={() => {}}
        />
        <SettingsRow
          icon="📶"
          label="Sync-Intervall"
          value="5 Minuten"
          onPress={() => {}}
        />
        <SettingsRow
          icon="💾"
          label="Offline-Daten"
          value="12 MB"
          onPress={() => {}}
        />
        <SettingsRow
          icon="🔃"
          label="Jetzt synchronisieren"
          onPress={() => Alert.alert('Sync', 'Daten werden synchronisiert...')}
        />
      </SettingsSection>

      {/* App Settings */}
      <SettingsSection title="App">
        <SettingsRow
          icon="🌐"
          label="Server-URL"
          value="production"
          onPress={() => {}}
        />
        <SettingsRow
          icon="ℹ️"
          label="App-Version"
          value="1.0.0"
          showArrow={false}
        />
        <SettingsRow
          icon="📱"
          label="Gerät"
          value="Zebra TC78"
          showArrow={false}
        />
      </SettingsSection>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TSRID Mobile v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2024 TSRID GmbH</Text>
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
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadow.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  roleText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  settingsLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.sm,
  },
  arrow: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  logoutText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  footerSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});

export default SettingsScreen;
