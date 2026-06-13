import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/components/SplashScreen';

// ── Sentry error monitoring ──────────────────────────────────────────────────
// DSN is read from app.json extra.sentryDsn so it can be swapped per
// environment without code changes. Leave the field empty (or omit it) to
// disable Sentry entirely — safe for local dev and open-source clones.
const _SENTRY_DSN: string =
  Constants.expoConfig?.extra?.sentryDsn ?? '';

if (_SENTRY_DSN) {
  const FORBIDDEN = [
    'password', 'token', 'secret',
    'hashed_password', 'stripe_payment_intent', 'interac',
  ];

  Sentry.init({
    dsn: _SENTRY_DSN,
    tracesSampleRate: 0.1,                       // 10% of transactions
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      // Drop any event whose serialised text contains sensitive keywords
      const text = JSON.stringify(event).toLowerCase();
      if (FORBIDDEN.some((term) => text.includes(term))) return null;
      return event;
    },
    // Replay is intentionally NOT enabled — privacy-invasive
  });
}

function ConnectedApp() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [splashDone, setSplashDone] = useState(false);

  // TEMP — dev-only onboarding reset for testing. Remove after testing.
  useEffect(() => {
    (async () => {
      if (__DEV__) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('@onboarding_seen');
        await AsyncStorage.removeItem('@onboarding_character');
      }
    })();
  }, []);

  if (!fontsLoaded) return null;

  // STRIPE KEY — loaded from app.json extra.stripePublishableKey.
  // For live production builds, swap the value in app.json to pk_live_...
  const stripeKey: string =
    Constants.expoConfig?.extra?.stripePublishableKey ??
    'pk_test_MISSING';

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.ca.tandempay.app">
            <ConnectedApp />
          </StripeProvider>
        </NotificationProvider>
      </AuthProvider>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
    </ThemeProvider>
  );
}


