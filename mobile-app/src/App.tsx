/**
 * TSRID Mobile App - Haupt-App Komponente
 * 
 * React Native App für Zebra TC78 mit:
 * - Navigation
 * - DataWedge Scanner
 * - Bluetooth Drucker
 * - Offline-Sync
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Services
import { dataWedgeService } from './services/hardware/datawedge';
import { syncManager } from './services/sync/syncManager';

// Screens (werden als Platzhalter erstellt)
import HomeScreen from './screens/home/HomeScreen';
import GoodsReceiptScreen from './screens/goods-receipt/ScanScreen';
import AssetSearchScreen from './screens/asset-search/SearchScreen';
import LabelPrintScreen from './screens/label-print/PrintScreen';
import InventoryScreen from './screens/inventory/InventoryScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import LoginScreen from './screens/auth/LoginScreen';

// Config
import { getEnabledModules } from './config/modules';

// Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  GoodsReceiptConfirm: { scannedData: string };
  AssetDetail: { assetId: string };
  PrinterSelect: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  GoodsReceipt: undefined;
  AssetSearch: undefined;
  LabelPrint: undefined;
  Inventory: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Farben (passend zum Admin Portal)
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

/**
 * Main Tab Navigator
 */
const MainTabs = () => {
  const enabledModules = getEnabledModules(['admin']); // TODO: Echte Berechtigungen

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500'
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          )
        }}
      />
      
      {enabledModules.find(m => m.id === 'goods_receipt') && (
        <Tab.Screen
          name="GoodsReceipt"
          component={GoodsReceiptScreen}
          options={{
            tabBarLabel: 'Wareneingang',
            tabBarIcon: ({ color, size }) => (
              <Icon name="package-variant" size={size} color={color} />
            )
          }}
        />
      )}

      {enabledModules.find(m => m.id === 'asset_search') && (
        <Tab.Screen
          name="AssetSearch"
          component={AssetSearchScreen}
          options={{
            tabBarLabel: 'Suche',
            tabBarIcon: ({ color, size }) => (
              <Icon name="magnify" size={size} color={color} />
            )
          }}
        />
      )}

      {enabledModules.find(m => m.id === 'label_print') && (
        <Tab.Screen
          name="LabelPrint"
          component={LabelPrintScreen}
          options={{
            tabBarLabel: 'Drucken',
            tabBarIcon: ({ color, size }) => (
              <Icon name="printer" size={size} color={color} />
            )
          }}
        />
      )}

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Einstellungen',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * App Komponente
 */
const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup
      dataWedgeService.destroy();
      syncManager.destroy();
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[App] Initializing...');

      // Sync Manager initialisieren
      await syncManager.initialize();

      // DataWedge initialisieren (nur auf Zebra-Geräten)
      const scannerInitialized = await dataWedgeService.initialize();
      if (!scannerInitialized) {
        console.warn('[App] Scanner initialization failed - may not be on Zebra device');
      }

      // TODO: Auth-Status prüfen
      // const token = await AsyncStorage.getItem('auth_token');
      // setIsAuthenticated(!!token);

      setIsInitialized(true);
      console.log('[App] Initialized successfully');
    } catch (error: any) {
      console.error('[App] Initialization failed:', error);
      setInitError(error.message);
      setIsInitialized(true); // Trotzdem fortfahren
    }
  };

  // Loading Screen
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>TSRID Mobile wird geladen...</Text>
      </View>
    );
  }

  // Error Screen
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Icon name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Initialisierungsfehler</Text>
        <Text style={styles.errorDetail}>{initError}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: COLORS.primary,
          background: COLORS.background,
          card: COLORS.card,
          text: COLORS.text,
          border: COLORS.border,
          notification: COLORS.primary
        }
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background }
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 16,
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32
  },
  errorText: {
    color: COLORS.error,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16
  },
  errorDetail: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  }
});

export default App;
