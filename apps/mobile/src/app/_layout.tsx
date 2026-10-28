import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { LogBox, StatusBar, useColorScheme } from 'react-native';

import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { AuthProvider } from '@/providers/auth-provider';

LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device']);

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSupabaseSessionRefresh();
  const colorScheme = useColorScheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar backgroundColor="#07172C" barStyle="light-content" translucent={false} />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8fafc' } }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
