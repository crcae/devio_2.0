import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/context/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import AppLoader from './src/components/AppLoader';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import type { RootStackParamList } from './src/navigation/types';
import LoginScreen from './src/screens/LoginScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import PagosScreen from './src/screens/PagosScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isAuthenticated, isRestoringSession, bootProgress } = useApp();

  if (isRestoringSession) {
    return <AppLoader progress={bootProgress} />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {isAuthenticated ? (
        <>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
          <RootStack.Screen name="Pagos" component={PagosScreen} />
          <RootStack.Screen name="Progress" component={ProgressScreen} />
          <RootStack.Screen name="Documents" component={DocumentsScreen} />
        </>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <StatusBar style="light" />
          <View style={styles.root}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <OfflineBanner />
          </View>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
