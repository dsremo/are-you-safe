import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {COLORS} from '../utils/constants';

const LoginScreen: React.FC = () => {
  const {signIn} = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const success = await signIn();
      if (!success) {
        // User cancelled - no need to show error
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.topSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🛡️</Text>
        </View>
        <Text style={styles.title}>Are You Safe?</Text>
        <Text style={styles.subtitle}>Daily Safety Check-in</Text>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.description}>
          A simple app that checks on you daily.{'\n'}
          If you don't check in, your emergency{'\n'}
          contacts will be notified.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>One tap daily check-in</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Automatic SMS & email alerts</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Server-side monitoring (no battery drain)</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Your data stays secure on the cloud</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.googleButton, isSigningIn && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}>
          {isSigningIn ? (
            <ActivityIndicator color="#333" size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 30,
  },
  topSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  middleSection: {
    flex: 2,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
  },
  featureIcon: {
    fontSize: 16,
    color: COLORS.success,
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  terms: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
  },
});

export default LoginScreen;
