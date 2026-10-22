import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import { clearCachedUserProfile, fetchUserProfile, getCachedUserProfile } from '@/services/user';
import type { UserProfile } from '@/types/user';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const loadedUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (targetUserId: string, force = false) => {
    if (!force && loadedUserIdRef.current === targetUserId) {
      return;
    }
    loadedUserIdRef.current = targetUserId;

    // 1. Cargar caché inmediata para no bloquear
    const cached = await getCachedUserProfile();
    if (cached && cached.id === targetUserId) {
      setProfile(cached);
    }
    // 2. Traer versión fresca de Supabase (deduplicada en vuelo)
    const freshProfile = await fetchUserProfile(targetUserId);
    if (freshProfile) {
      setProfile(freshProfile);
    }
  }, []);

  const userId = session?.user?.id;
  const refreshProfile = useCallback(async () => {
    if (userId) {
      await loadProfile(userId, true);
    }
  }, [loadProfile, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let mounted = true;
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      receivedAuthEvent = true;
      if (!mounted) return;

      setSession(currentSession);
      setIsLoading(false);

      if (currentSession?.user?.id) {
        if (loadedUserIdRef.current !== currentSession.user.id) {
          void loadProfile(currentSession.user.id);
        }
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
        void clearCachedUserProfile();
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted && !receivedAuthEvent) {
          const activeSession = error ? null : data.session;
          setSession(activeSession);
          setIsLoading(false);
          if (activeSession?.user?.id && loadedUserIdRef.current !== activeSession.user.id) {
            void loadProfile(activeSession.user.id);
          }
        }
      })
      .catch(() => {
        if (mounted && !receivedAuthEvent) {
          loadedUserIdRef.current = null;
          setSession(null);
          setProfile(null);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requiere AuthProvider.');
  return context;
}
