import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export function useSupabaseSessionRefresh() {
  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') return;

    const supabase = getSupabase();
    const updateAutoRefresh = (state: string) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    updateAutoRefresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateAutoRefresh);

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
