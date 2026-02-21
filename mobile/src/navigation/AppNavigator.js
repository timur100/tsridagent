import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AssetsScreen from '../screens/AssetsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LocationsScreen from '../screens/LocationsScreen';
import GoodsReceiptScreen from '../screens/GoodsReceiptScreen';

// Simple icon components (Lucide-style)
const IconHome = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size * 0.8 }}>🏠</Text>
  </View>
);

const IconScan = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size * 0.8 }}>📷</Text>
  </View>
);

const IconBox = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size * 0.8 }}>📦</Text>
  </View>
);

const IconLocation = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size * 0.8 }}>📍</Text>
  </View>
);

const IconSettings = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color, fontSize: size * 0.8 }}>⚙️</Text>
  </View>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator (after login)
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 56,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: {
          backgroundColor: theme.colors.primary,
          height: 50, // Smaller header
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
        },
        headerStatusBarHeight: 0, // Reduce status bar padding
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, size }) => <IconScan color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{
          title: 'Assets',
          tabBarIcon: ({ color, size }) => <IconBox color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Locations"
        component={LocationsScreen}
        options={{
          title: 'Standorte',
          tabBarIcon: ({ color, size }) => <IconLocation color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color, size }) => <IconSettings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: theme.colors.background 
  }}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={{ 
      color: theme.colors.textPrimary, 
      marginTop: 16,
      fontSize: 16 
    }}>
      Wird geladen...
    </Text>
  </View>
);

// Main App Navigator
const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
