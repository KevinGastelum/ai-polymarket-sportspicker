/**
 * AuthScreen - Login/Signup Screen Component
 * 
 * Premium dark mode styled authentication screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onGuestLogin?: () => void;
  loading?: boolean;
}

export function AuthScreen({ onSignIn, onSignUp, onGuestLogin, loading = false }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    
    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const result = isSignUp 
        ? await onSignUp(email.trim(), password)
        : await onSignIn(email.trim(), password);
      
      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setConfirmPassword('');
  };

  const isLoading = loading || submitting;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>⚡</Text>
          <Text style={styles.logoText}>PolyPick</Text>
          <Text style={styles.tagline}>AI-Powered Sports Predictions</Text>
        </View>

        {/* Auth Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>
          
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
          )}
          
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.neonLime, '#aacc00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={toggleMode}
            style={styles.toggleBtn}
            disabled={isLoading}
          >
            <Text style={styles.toggleText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          {/* Guest Access Button */}
          {!isLoading && (
            <TouchableOpacity 
              onPress={onGuestLogin}
              style={{ marginTop: 24, padding: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: theme.colors.textSecondary, 
                fontSize: theme.fontSize.sm, 
                textAlign: 'center',
                textDecorationLine: 'underline' 
              }}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.featureItem}>✓ Real-time Polymarket data</Text>
          <Text style={styles.featureItem}>✓ AI prediction models</Text>
          <Text style={styles.featureItem}>✓ Track your portfolio</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgApp,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  tagline: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  formContainer: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.bgApp,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  submitBtn: {
    borderRadius: theme.radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitBtnText: {
    color: '#000',
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  toggleBtn: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    color: theme.colors.neonLime,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  features: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  featureItem: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
});

export default AuthScreen;
