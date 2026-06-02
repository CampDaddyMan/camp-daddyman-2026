import { LogBox } from 'react-native';
import React from 'react';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs([
  'Each child in a list should have a unique',
  'VirtualizedLists should never be nested',
]);
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { DrawerProvider } from './src/context/DrawerContext';
import { PlayerProvider } from './src/context/PlayerContext';
import RootNavigator from './src/navigation/RootNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import MenuDrawer from './src/components/MenuDrawer';
import MiniPlayer from './src/components/MiniPlayer';
import { navigationRef } from './src/lib/navigationRef';
import { usePushNotifications } from './src/hooks/usePushNotifications';

function AppInner() {
  const { loading, user } = useAuth();
  usePushNotifications(user?.id ?? null);

  if (loading) return <LoadingScreen />;
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <RootNavigator isLoggedIn={!!user} />
      <MenuDrawer />
      <MiniPlayer />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <DrawerProvider>
            <PlayerProvider>
              <AppInner />
            </PlayerProvider>
          </DrawerProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
