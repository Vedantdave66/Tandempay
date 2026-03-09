import React from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      {/* We use a dark status bar to fade into the web app's dark mode background */}
      <StatusBar style="light" backgroundColor="#09090B" />
      <WebView
        source={{ uri: 'https://splitease-web.onrender.com/' }}
        style={styles.webview}
        // These props help the webview feel more like a native app
        bounces={false}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    // Ensure the webview doesn't overlap the Android/iOS status bar
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#09090B',
  },
});
