import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { AuthProvider } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSupabaseSessionRefresh();
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar backgroundColor="#07172C" barStyle="light-content" translucent={false} />
      <AuthProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8fafc' } }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
