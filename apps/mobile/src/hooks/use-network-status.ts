import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/+$/, '');
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY
)?.trim();

const PROBE_INTERVAL_MS = 3500;
const PROBE_TIMEOUT_MS = 3000;

export interface UseNetworkStatusResult {
  isOnline: boolean;
  isSimulatingOffline: boolean;
  toggleSimulatedOffline: () => void;
  checkConnectivityNow: () => Promise<boolean>;
}

async function probeInternetReachability(): Promise<boolean> {
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean' &&
    !navigator.onLine
  ) {
    return false;
  }

  const endpoint = supabaseUrl
    ? `${supabaseUrl}/rest/v1/`
    : 'https://clients3.google.com/generate_204';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, PROBE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (supabaseUrl && supabasePublishableKey) {
      headers.apikey = supabasePublishableKey;
    }

    const response = await fetch(endpoint, {
      method: 'HEAD',
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });

    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Detects real internet connectivity across both Android APK and Web PWA.
 * Combines browser `online`/`offline` events (Web), `AppState` foreground transitions
 * (when the user toggles Wi-Fi/Mobile Data in the Android quick settings shade),
 * and lightweight reachability probes against the backend.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [realIsOnline, setRealIsOnline] = useState<boolean>(() => {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.onLine === 'boolean'
    ) {
      return navigator.onLine;
    }
    return true;
  });

  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const checkConnectivityNow = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) {
      return realIsOnline;
    }

    isCheckingRef.current = true;
    try {
      const reachable = await probeInternetReachability();
      if (mountedRef.current) {
        setRealIsOnline(reachable);
      }
      return reachable;
    } finally {
      isCheckingRef.current = false;
    }
  }, [realIsOnline]);

  useEffect(() => {
    mountedRef.current = true;

    void checkConnectivityNow();

    // Intervalo periódico ligero para detectar apagado/encendido de Wi-Fi o datos móviles en Android APK
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        void checkConnectivityNow();
      }
    }, PROBE_INTERVAL_MS);

    // Al volver del panel de notificaciones/ajustes rápidos de Android, verificar de inmediato
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void checkConnectivityNow();
      }
    });

    // En Web/PWA escuchar también los eventos nativos del navegador para respuesta instantánea
    const handleBrowserOnline = () => {
      setRealIsOnline(true);
      void checkConnectivityNow();
    };
    const handleBrowserOffline = () => {
      setRealIsOnline(false);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', handleBrowserOnline);
      window.addEventListener('offline', handleBrowserOffline);
    }

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      appStateSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', handleBrowserOnline);
        window.removeEventListener('offline', handleBrowserOffline);
      }
    };
  }, [checkConnectivityNow]);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatingOffline((prev) => {
      const next = !prev;
      if (!next) {
        void checkConnectivityNow();
      }
      return next;
    });
  }, [checkConnectivityNow]);

  const effectiveIsOnline = isSimulatingOffline ? false : realIsOnline;

  return {
    isOnline: effectiveIsOnline,
    isSimulatingOffline,
    toggleSimulatedOffline,
    checkConnectivityNow,
  };
}
