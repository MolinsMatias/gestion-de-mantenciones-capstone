import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useLayoutEffect } from 'react';
import { LogBox, Platform, StatusBar, useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useSupabaseSessionRefresh } from '@/hooks/use-supabase-session-refresh';
import { PendingMaintenanceSync } from '@/components/maintenance/pending-maintenance-sync';
import { AuthProvider } from '@/providers/auth-provider';
import { LocalProvider } from '@/providers/local-provider';
import { NetworkProvider } from '@/providers/network-provider';

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

function WebKeyboardViewport() {
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const root = document.getElementById('root');
    if (!viewport || !root) return;

    const update = () => {
      root.style.setProperty('--keyboard-viewport-top', `${viewport.offsetTop}px`);
      root.style.setProperty('--keyboard-viewport-height', `${viewport.height}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--keyboard-viewport-top');
      root.style.removeProperty('--keyboard-viewport-height');
    };
  }, []);

  return null;
}

export default function RootLayout() {
  useSupabaseSessionRefresh();
  const colorScheme = useColorScheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
    syncWebStatusBarMeta();
    if (Platform.OS === 'web' && !__DEV__ && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.warn('Could not prepare the web app for offline startup:', error);
      });
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
      {Platform.OS === 'web' ? <WebKeyboardViewport /> : null}
      {Platform.OS === 'android' ? <NavigationBar style="dark" hidden={false} /> : null}
      <StatusBar
        backgroundColor={HEADER_STATUS_BAR_COLOR}
        barStyle="light-content"
        translucent={false}
      />
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <NetworkProvider>
          <AuthProvider>
            <PendingMaintenanceSync />
            <LocalProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: HEADER_STATUS_BAR_COLOR },
                }}
              >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="maintenance/[machineId]"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: '#f8fafc' },
                  }}
                />
              </Stack>
            </LocalProvider>
          </AuthProvider>
        </NetworkProvider>
      </KeyboardProvider>
    </ThemeProvider>
  );
}
