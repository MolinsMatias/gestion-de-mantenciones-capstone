import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, isLoading: isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let mounted = true;
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (mounted) setState({ session, isLoading: false });
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted && !receivedAuthEvent) {
          setState({ session: error ? null : data.session, isLoading: false });
        }
      })
      .catch(() => {
        if (mounted && !receivedAuthEvent) setState({ session: null, isLoading: false });
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requiere AuthProvider.');
  return context;
}
