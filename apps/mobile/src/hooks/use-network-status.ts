import * as Network from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export interface UseNetworkStatusResult {
  isOnline: boolean;
  isSimulatingOffline: boolean;
  toggleSimulatedOffline: () => void;
  checkConnectivityNow: () => Promise<boolean>;
}

function isNetworkStateOnline(state: Network.NetworkState): boolean {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return false;
  }
  return state.isConnected ?? true;
}

function getBrowserOnlineFallback(): boolean {
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean'
  ) {
    return navigator.onLine;
  }
  return true;
}

async function readNetworkOnlineState(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return isNetworkStateOnline(state);
  } catch {
    return getBrowserOnlineFallback();
  }
}

/**
 * Detects real internet connectivity across both Android APK and Web PWA
 * using native OS/browser connectivity events (`expo-network`) without HTTP polling.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [realIsOnline, setRealIsOnline] = useState<boolean>(getBrowserOnlineFallback);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const checkConnectivityNow = useCallback(async (): Promise<boolean> => {
    const online = await readNetworkOnlineState();
    if (mountedRef.current) {
      setRealIsOnline(online);
    }
    return online;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void readNetworkOnlineState().then((online) => {
      if (mountedRef.current) {
        setRealIsOnline(online);
      }
    });

    let networkSubscription: { remove: () => void } | null = null;
    try {
      networkSubscription = Network.addNetworkStateListener((state) => {
        if (mountedRef.current) {
          setRealIsOnline(isNetworkStateOnline(state));
        }
      });
    } catch {
      // Fallback safely if native module is unavailable in an older binary
    }

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void checkConnectivityNow();
      }
    });

    const handleBrowserOnline = () => {
      if (mountedRef.current) {
        setRealIsOnline(true);
      }
    };
    const handleBrowserOffline = () => {
      if (mountedRef.current) {
        setRealIsOnline(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', handleBrowserOnline);
      window.addEventListener('offline', handleBrowserOffline);
    }

    return () => {
      mountedRef.current = false;
      networkSubscription?.remove();
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
