import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, Platform, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
]);
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import { API_URL } from './config';

// Add basic configuration
axios.defaults.timeout = 60000;

// Add interceptor to bypass localtunnel reminder page
axios.interceptors.request.use(config => {
  config.headers['Bypass-Tunnel-Reminder'] = 'true';
  console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
  return config;
}, error => {
  return Promise.reject(error);
});

axios.interceptors.response.use(
  response => response,
  error => {
    console.warn(`[API Error] ${error.config?.url}: ${error.message}`);
    return Promise.reject(error);
  }
);
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userPhone, setUserPhone] = useState(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    console.log("[App] Checking login status...");
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve('TIMEOUT'), 5000)
      );

      const storePromise = SecureStore.getItemAsync('user_phone');

      // Race the store against timeout
      const result = await Promise.race([storePromise, timeoutPromise]);

      if (result === 'TIMEOUT') {
        console.warn("[App] SecureStore timed out. Proceeding as logged out.");
      } else if (result) {
        console.log("[App] User found:", result);
        setUserPhone(result);
      } else {
        console.log("[App] No user logged in.");
      }
    } catch (e) {
      console.warn('Error loading token', e);
    } finally {
      console.log("[App] Initialization complete.");
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (phone) => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('user_phone', phone);
      }
    } catch (e) {
      console.warn('SecureStore save failed, ignoring:', e);
    }
    setUserPhone(phone);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('user_phone');
    setUserPhone(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        {userPhone ? (
          <HomeScreen onLogout={handleLogout} />
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
