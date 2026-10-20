import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Configura la URL y la clave Publishable de Supabase en apps/mobile/.env');
  }

  if (!supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new Error(
      'Usa una clave Publishable de Supabase; este cliente no admite claves secretas.',
    );
  }

  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      // La ruta de recuperación implementará explícitamente el intercambio del enlace.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return client;
}
