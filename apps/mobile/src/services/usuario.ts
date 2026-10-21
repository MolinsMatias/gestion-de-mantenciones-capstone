import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/services/supabase';
import type { PerfilUsuario } from '@/types/usuario';

const PERFIL_CACHE_KEY = '@bowling_services/perfil_usuario';

let activeFetchPromise: Promise<PerfilUsuario | null> | null = null;
let activeFetchUserId: string | null = null;

/**
 * Obtiene el perfil del usuario desde Supabase consultando la tabla `usuario`
 * con los campos reales de la base de datos:
 * id, run, dv, nombre, segundo_nombre, apellido_paterno, apellido_materno, rol_id, activo, created_at.
 * Incluye deduplicación en vuelo y lectura en almacenamiento local (AsyncStorage) para funcionamiento offline.
 */
export async function fetchPerfilUsuario(userId: string): Promise<PerfilUsuario | null> {
  if (!userId) return null;

  // Si ya hay una petición en curso para este mismo usuario, reutilizar la misma promesa
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
          'id, run, dv, nombre, segundo_nombre, apellido_paterno, apellido_materno, rol_id, activo',
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error al consultar perfil de usuario en Supabase:', error.message);
      }

      if (!error && data) {
        const perfil: PerfilUsuario = {
          id: data.id,
          run: data.run,
          dv: data.dv,
          nombre: data.nombre ?? '',
          segundo_nombre: data.segundo_nombre ?? null,
          apellido_paterno: data.apellido_paterno ?? '',
          apellido_materno: data.apellido_materno ?? null,
          rol_id: data.rol_id,
          activo: Boolean(data.activo),
        };

        // Guardar en caché local para soporte sin conexión
        try {
          await AsyncStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify(perfil));
        } catch (cacheErr) {
          console.warn('No se pudo guardar el perfil en caché local:', cacheErr);
        }

        return perfil;
      }
    } catch {
      // Si la llamada de red falla (modo offline), intentar cargar desde caché local
    } finally {
      activeFetchPromise = null;
      activeFetchUserId = null;
    }

    return await getCachedPerfilUsuario();
  })();

  return activeFetchPromise;
}

/**
 * Lee el perfil almacenado en caché local cuando no hay conexión.
 */
export async function getCachedPerfilUsuario(): Promise<PerfilUsuario | null> {
  try {
    const cached = await AsyncStorage.getItem(PERFIL_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as PerfilUsuario;
    }
  } catch (err) {
    console.warn('Error leyendo perfil de caché local:', err);
  }
  return null;
}

/**
 * Limpia el perfil de la caché al cerrar sesión.
 */
export async function clearCachedPerfilUsuario(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERFIL_CACHE_KEY);
  } catch (err) {
    console.warn('Error al limpiar perfil de caché local:', err);
  }
}

/**
 * Extrae el primer nombre para el saludo de bienvenida con fallbacks limpios.
 */
export function getNombreSaludo(
  profile: PerfilUsuario | null,
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
 * Retorna el nombre completo concatenando nombre, segundo_nombre, apellido_paterno y apellido_materno.
 */
export function getNombreCompleto(
  profile: PerfilUsuario | null,
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
): string {
  if (profile) {
    const partes = [
      profile.nombre,
      profile.segundo_nombre,
      profile.apellido_paterno,
      profile.apellido_materno,
    ].filter(Boolean);

    if (partes.length > 0) {
      return partes.join(' ');
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
 * Obtiene las iniciales del usuario para avatares a partir de nombre y apellido_paterno.
 */
export function getInicialesUsuario(profile: PerfilUsuario | null, email?: string | null): string {
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
 * Mapea el identificador de rol a su etiqueta legible.
 */
export function getNombreRol(rolId: number | string | undefined | null): string {
  if (rolId === 1 || rolId === '1' || rolId === 'admin') return 'Administrador';
  if (rolId === 2 || rolId === '2' || rolId === 'tecnico') return 'Técnico de Mantención';
  return 'Técnico de Mantención';
}
