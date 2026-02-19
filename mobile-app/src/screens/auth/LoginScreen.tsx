/**
 * TSRID Mobile App - Login Screen
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const COLORS = {
  primary: '#c00000',
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#9ca3af'
};

const LoginScreen = ({ navigation }: any) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (pin.length < 4) {
      setError('PIN muss mindestens 4 Stellen haben');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // TODO: Implement actual PIN login
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Main');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Icon name="barcode-scan" size={64} color={COLORS.primary} />
        <Text style={styles.title}>TSRID Mobile</Text>
        <Text style={styles.subtitle}>Zebra TC78</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>PIN eingeben</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor={COLORS.textSecondary}
        />
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Anmelden</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 32
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  form: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 8
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 12
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default LoginScreen;
