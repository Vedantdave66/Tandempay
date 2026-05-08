import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';

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
    </ThemeProvider>
  );
}

