import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar, useColorScheme } from 'react-native';

import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { AuthProvider } from '@/providers/auth-provider';

LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device']);

void SplashScreen.preventAutoHideAsync();

const HEADER_STATUS_BAR_COLOR = '#07172C';

const AppLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: HEADER_STATUS_BAR_COLOR,
  },
};

const AppDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: HEADER_STATUS_BAR_COLOR,
  },
};

function syncWebStatusBarMeta(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.documentElement.style.backgroundColor = HEADER_STATUS_BAR_COLOR;
  if (document.body) {
    document.body.style.backgroundColor = HEADER_STATUS_BAR_COLOR;
  }

  const ensureMeta = (name: string, content: string) => {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  ensureMeta('theme-color', HEADER_STATUS_BAR_COLOR);
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
}

export default function RootLayout() {
  useSupabaseSessionRefresh();
  const colorScheme = useColorScheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
    syncWebStatusBarMeta();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
      <StatusBar
        backgroundColor={HEADER_STATUS_BAR_COLOR}
        barStyle="light-content"
        translucent={false}
      />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: HEADER_STATUS_BAR_COLOR },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
