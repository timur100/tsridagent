import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen, { BurgerMenu } from '../screens/DashboardScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AssetsScreen from '../screens/AssetsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LocationsScreen from '../screens/LocationsScreen';
import GoodsReceiptScreen from '../screens/GoodsReceiptScreen';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

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

// Custom Header with Burger Menu - With StatusBar padding
const CustomHeader = ({ title, navigation, showMenu, onMenuPress }) => (
  <View style={{
    backgroundColor: theme.colors.primary,
    paddingTop: STATUSBAR_HEIGHT + 8,
    paddingBottom: 12,
    paddingHorizontal: 12,
  }}>
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Text style={{ 
        color: '#fff', 
        fontSize: 18, 
        fontWeight: '700',
      }} numberOfLines={1}>
        {title}
      </Text>
      {showMenu && (
        <TouchableOpacity onPress={onMenuPress} style={{ padding: 8 }}>
          <Text style={{ fontSize: 24, color: '#fff' }}>☰</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Main Tab Navigator (after login)
const MainTabs = () => {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
  };

  // Screen options generator with burger menu
  const getScreenOptions = (title, IconComponent, navigation) => ({
    title,
    tabBarIcon: ({ color, size }) => <IconComponent color={color} size={size} />,
    header: () => (
      <CustomHeader 
        title={title} 
        navigation={navigation}
        showMenu={true}
        onMenuPress={() => setMenuVisible(true)}
      />
    ),
  });

  return (
    <>
      <Tab.Navigator
        screenOptions={({ navigation }) => ({
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            height: 56,
            paddingBottom: 6,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          headerShown: true,
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={({ navigation }) => ({
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} />,
            headerShown: false, // Dashboard has its own header
          })}
        />
        <Tab.Screen
          name="Scanner"
          component={ScannerScreen}
          options={({ navigation }) => ({
            title: 'Scanner',
            tabBarIcon: ({ color, size }) => <IconScan color={color} size={size} />,
            header: () => (
              <CustomHeader 
                title="Scanner" 
                navigation={navigation}
                showMenu={true}
                onMenuPress={() => setMenuVisible(true)}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Assets"
          component={AssetsScreen}
          options={({ navigation }) => ({
            title: 'Assets',
            tabBarIcon: ({ color, size }) => <IconBox color={color} size={size} />,
            header: () => (
              <CustomHeader 
                title="Assets" 
                navigation={navigation}
                showMenu={true}
                onMenuPress={() => setMenuVisible(true)}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Locations"
          component={LocationsScreen}
          options={({ navigation }) => ({
            title: 'Standorte',
            tabBarIcon: ({ color, size }) => <IconLocation color={color} size={size} />,
            header: () => (
              <CustomHeader 
                title="Standorte" 
                navigation={navigation}
                showMenu={true}
                onMenuPress={() => setMenuVisible(true)}
              />
            ),
          })}
        />
        <Tab.Screen
          name="GoodsReceipt"
          component={GoodsReceiptScreen}
          options={({ navigation }) => ({
            title: 'Wareneingang',
            tabBarIcon: ({ color, size }) => (
              <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color, fontSize: size * 0.8 }}>📥</Text>
              </View>
            ),
            header: () => (
              <CustomHeader 
                title="Wareneingang" 
                navigation={navigation}
                showMenu={true}
                onMenuPress={() => setMenuVisible(true)}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            title: 'Einstellungen',
            tabBarIcon: ({ color, size }) => <IconSettings color={color} size={size} />,
            header: () => (
              <CustomHeader 
                title="Einstellungen" 
                navigation={navigation}
                showMenu={true}
                onMenuPress={() => setMenuVisible(true)}
              />
            ),
          })}
        />
      </Tab.Navigator>
      
      {/* Global Burger Menu */}
      <BurgerMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        navigation={null}
        user={user}
        onLogout={handleLogout}
      />
    </>
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
