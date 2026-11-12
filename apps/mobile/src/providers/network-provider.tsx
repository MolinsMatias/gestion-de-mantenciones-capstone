import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export interface UseNetworkStatusResult {
  isOnline: boolean;
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
export function NetworkProvider({ children }: PropsWithChildren) {
  const [isOnline, setIsOnline] = useState<boolean>(getBrowserOnlineFallback);
  const mountedRef = useRef<boolean>(true);

  const checkConnectivityNow = useCallback(async (): Promise<boolean> => {
    const online = await readNetworkOnlineState();
    if (mountedRef.current) {
      setIsOnline(online);
    }
    return online;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void readNetworkOnlineState().then((online) => {
      if (mountedRef.current) {
        setIsOnline(online);
      }
    });

    let networkSubscription: { remove: () => void } | null = null;
    try {
      networkSubscription = Network.addNetworkStateListener((state) => {
        if (mountedRef.current) {
          setIsOnline(isNetworkStateOnline(state));
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
        setIsOnline(true);
      }
    };
    const handleBrowserOffline = () => {
      if (mountedRef.current) {
        setIsOnline(false);
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

  return (
    <NetworkContext.Provider value={{ isOnline, checkConnectivityNow }}>
      {children}
    </NetworkContext.Provider>
  );
}

const NetworkContext = createContext<UseNetworkStatusResult | null>(null);

export function useNetworkStatus(): UseNetworkStatusResult {
  const status = useContext(NetworkContext);
  if (!status) throw new Error('useNetworkStatus requiere NetworkProvider.');
  return status;
}
