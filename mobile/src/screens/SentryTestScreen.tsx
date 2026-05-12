// TODO(sentry-validation): TEMPORARY — remove this file and its Stack.Screen entry
// in RootNavigator.tsx after confirming Sentry receives events in the dashboard.

import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export default function SentryTestScreen() {
  const dsn: string = Constants.expoConfig?.extra?.sentryDsn ?? '';

  function handleCaptureMessage() {
    if (!dsn) {
      Alert.alert('Sentry inactive', 'sentryDsn is empty in app.json. Sentry is not initialised.');
      return;
    }
    Sentry.captureMessage('Mobile Sentry test', 'info');
    Alert.alert('✅ Message sent', 'Sentry.captureMessage() fired. Check your Sentry dashboard.');
  }

  function handleThrowError() {
    if (!dsn) {
      Alert.alert('Sentry inactive', 'sentryDsn is empty in app.json. Sentry is not initialised.');
      return;
    }
    // Throwing synchronously — Sentry's React Native error handler captures it.
    throw new Error('Mobile Sentry test error');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Sentry Validation</Text>
      <Text style={styles.subtitle}>(TEMPORARY — dev only)</Text>

      <Text style={styles.dsnStatus}>
        DSN: {dsn ? '✅ configured' : '❌ not set'}
      </Text>

      <TouchableOpacity
        testID="sentry-test-message-btn"
        style={[styles.btn, { backgroundColor: '#2563eb' }]}
        onPress={handleCaptureMessage}
      >
        <Text style={styles.btnText}>Send captureMessage (no error)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="sentry-test-error-btn"
        style={[styles.btn, { backgroundColor: '#dc2626' }]}
        onPress={handleThrowError}
      >
        <Text style={styles.btnText}>Throw Error (triggers error event)</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        TODO(sentry-validation): Remove after validation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    marginTop: -8,
  },
  dsnStatus: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    color: '#3f3f46',
    fontSize: 11,
    marginTop: 32,
    textAlign: 'center',
  },
});
