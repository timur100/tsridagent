import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../utils/theme';

const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(email.trim(), password);
      
      if (!result.success) {
        setError(result.error || 'Anmeldung fehlgeschlagen');
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@tsrid.com');
    setPassword('admin123');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>TSRID</Text>
          </View>
          <Text style={styles.title}>Mobile</Text>
          <Text style={styles.subtitle}>Zebra TC78 Scanner App</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Anmelden</Text>
          <Text style={styles.cardSubtitle}>Willkommen zurück</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-Mail</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.input}
                placeholder="ihre.email@firma.de"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                testID="email-input"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Passwort</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                testID="password-input"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                disabled={loading}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Anmelden</Text>
            )}
          </TouchableOpacity>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo-Zugang:</Text>
            <Text style={styles.demoText}>E-Mail: admin@tsrid.com</Text>
            <Text style={styles.demoText}>Passwort: admin123</Text>
            <TouchableOpacity 
              style={styles.demoButton}
              onPress={fillDemoCredentials}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>Demo-Daten einfügen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TSRID Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>Optimiert für Zebra TC78</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadow.lg,
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.lg,
  },
  cardTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  eyeButton: {
    padding: theme.spacing.sm,
  },
  eyeIcon: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadow.md,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  demoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.info,
    marginBottom: theme.spacing.xs,
  },
  demoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.info,
    opacity: 0.8,
  },
  demoButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  demoButtonText: {
    color: theme.colors.info,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  footerSubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
});

export default LoginScreen;
