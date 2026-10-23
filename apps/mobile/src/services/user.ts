import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/services/supabase';
import type { UserProfile, UserRole } from '@/types/user';

const USER_PROFILE_CACHE_KEY = '@bowling_services/user_profile';

let activeFetchPromise: Promise<UserProfile | null> | null = null;
let activeFetchUserId: string | null = null;

/**
 * Fetches user profile from Supabase with in-flight request deduplication
 * and local offline caching (AsyncStorage).
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  if (activeFetchPromise && activeFetchUserId === userId) {
    return activeFetchPromise;
  }

  activeFetchUserId = userId;
  activeFetchPromise = (async () => {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('usuario')
        .select(
          'id, run, dv, nombre, segundo_nombre, apellido_paterno, apellido_materno, rol_id, activo, created_at, rol:rol_id(id, nombre, created_at)',
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching user profile from Supabase:', error.message);
      }

      if (!error && data) {
        const rawRole = Array.isArray(data.rol) ? data.rol[0] : data.rol;
        const parsedRole: UserRole | null =
          rawRole &&
          typeof rawRole === 'object' &&
          'nombre' in rawRole &&
          typeof rawRole.nombre === 'string'
            ? {
                id: String(rawRole.id ?? data.rol_id),
                nombre: rawRole.nombre,
                created_at:
                  'created_at' in rawRole && typeof rawRole.created_at === 'string'
                    ? rawRole.created_at
                    : undefined,
              }
            : null;

        const profile: UserProfile = {
          id: data.id,
          run: data.run,
          dv: data.dv,
          nombre: data.nombre ?? '',
          segundo_nombre: data.segundo_nombre ?? null,
          apellido_paterno: data.apellido_paterno ?? '',
          apellido_materno: data.apellido_materno ?? null,
          rol_id: String(data.rol_id),
          rol: parsedRole,
          activo: Boolean(data.activo),
          created_at: data.created_at,
        };

        try {
          await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(profile));
        } catch (cacheErr) {
          console.warn('Could not save user profile to local cache:', cacheErr);
        }

        return profile;
      }
    } catch (err) {
      console.warn('Network error fetching profile, falling back to cache:', err);
    } finally {
      activeFetchPromise = null;
      activeFetchUserId = null;
    }

    return await getCachedUserProfile();
  })();

  return activeFetchPromise;
}

/**
 * Retrieves cached user profile from AsyncStorage for offline usage.
 */
export async function getCachedUserProfile(): Promise<UserProfile | null> {
  try {
    const cached = await AsyncStorage.getItem(USER_PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as UserProfile;
    }
  } catch (err) {
    console.warn('Error reading user profile from cache:', err);
  }
  return null;
}

/**
 * Clears user profile from local cache on logout.
 */
export async function clearCachedUserProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_PROFILE_CACHE_KEY);
  } catch (err) {
    console.warn('Error clearing user profile from cache:', err);
  }
}

/**
 * Returns the first name for user greetings with fallbacks.
 */
export function getGreetingName(
  profile: UserProfile | null,
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
): string {
  if (profile?.nombre?.trim()) {
    return profile.nombre.trim();
  }
  if (typeof userMetadata?.nombre === 'string' && userMetadata.nombre.trim()) {
    return userMetadata.nombre.trim();
  }
  if (typeof userMetadata?.full_name === 'string' && userMetadata.full_name.trim()) {
    return userMetadata.full_name.trim().split(' ')[0];
  }
  if (email) {
    const username = email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return 'Técnico';
}

/**
 * Returns short display name (first name + paternal surname, e.g. "Matías Rojas").
 */
export function getDisplayName(
  profile: UserProfile | null,
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
): string {
  if (profile) {
    const parts = [profile.nombre?.trim(), profile.apellido_paterno?.trim()].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  return getFullName(profile, userMetadata, email);
}

/**
 * Returns full concatenated user name.
 */
export function getFullName(
  profile: UserProfile | null,
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
): string {
  if (profile) {
    const parts = [
      profile.nombre,
      profile.segundo_nombre,
      profile.apellido_paterno,
      profile.apellido_materno,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  if (typeof userMetadata?.full_name === 'string' && userMetadata.full_name.trim()) {
    return userMetadata.full_name.trim();
  }
  if (typeof userMetadata?.nombre === 'string' && userMetadata.nombre.trim()) {
    return userMetadata.nombre.trim();
  }
  if (email) {
    return email;
  }
  return 'Usuario';
}

/**
 * Returns up to 2 uppercase initials for avatar circles.
 */
export function getUserInitials(profile: UserProfile | null, email?: string | null): string {
  const n = profile?.nombre?.trim();
  const ap = profile?.apellido_paterno?.trim();
  if (n && ap) {
    return `${n[0]}${ap[0]}`.toUpperCase();
  }
  if (n) {
    return n.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'BS';
}

/**
 * Returns the human-readable role name from the user's profile (`rol.nombre`).
 */
export function getRoleName(profile: UserProfile | null | undefined): string {
  const roleName = profile?.rol?.nombre?.trim();
  if (roleName) {
    return roleName;
  }
  return 'Sin rol asignado';
}
