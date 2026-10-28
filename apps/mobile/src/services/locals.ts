import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/services/supabase';
import type { Local } from '@/types/local';
import type { MachineStatus } from '@/types/machine';

const LOCALS_CACHE_KEY = '@bowling_services/locals_cache_v2';
const ACTIVE_LOCAL_ID_KEY = '@bowling_services/active_local_id';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMachineStatus(value: unknown): value is MachineStatus {
  return (
    value === 'operativa' ||
    value === 'operativa_con_observaciones' ||
    value === 'fuera_de_servicio'
  );
}

interface ParsedCommuneInfo {
  communeName: string;
  regionName: string | null;
}

function parseCommune(raw: unknown): ParsedCommuneInfo {
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!isRecord(item)) {
    return {
      communeName: 'Sin comuna',
      regionName: null,
    };
  }

  const communeName =
    typeof item.nombre === 'string' && item.nombre.trim() ? item.nombre.trim() : 'Sin comuna';

  const rawRegion = Array.isArray(item.region) ? item.region[0] : item.region;
  const regionName =
    isRecord(rawRegion) && typeof rawRegion.nombre === 'string' && rawRegion.nombre.trim()
      ? rawRegion.nombre.trim()
      : null;

  return {
    communeName,
    regionName,
  };
}

interface LocalMachineStats {
  totalMachines: number;
  operationalMachines: number;
}

async function fetchMachineStatsByLocal(
  localIds: string[],
): Promise<Map<string, LocalMachineStats>> {
  const statsMap = new Map<string, LocalMachineStats>();
  if (localIds.length === 0) return statsMap;

  try {
    const supabase = getSupabase();
    const { data: machinesData, error: machinesError } = await supabase
      .from('maquina')
      .select('id, local_id')
      .eq('activo', true)
      .in('local_id', localIds);

    if (machinesError || !Array.isArray(machinesData)) {
      return statsMap;
    }

    const machineIds: string[] = [];
    const machineToLocal = new Map<string, string>();

    for (const row of machinesData) {
      if (isRecord(row) && typeof row.id === 'string' && typeof row.local_id === 'string') {
        machineIds.push(row.id);
        machineToLocal.set(row.id, row.local_id);
      }
    }

    const latestStatusByMachine = new Map<string, MachineStatus>();

    if (machineIds.length > 0) {
      const { data: maintData, error: maintError } = await supabase
        .from('mantencion')
        .select('id, maquina_id, estado_equipo_final, finalizada_at, created_at')
        .eq('estado', 'enviada')
        .not('finalizada_at', 'is', null)
        .in('maquina_id', machineIds)
        .order('finalizada_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (!maintError && Array.isArray(maintData)) {
        for (const row of maintData) {
          if (!isRecord(row) || typeof row.maquina_id !== 'string') continue;
          if (latestStatusByMachine.has(row.maquina_id)) continue;

          if (isMachineStatus(row.estado_equipo_final)) {
            latestStatusByMachine.set(row.maquina_id, row.estado_equipo_final);
          }
        }
      }
    }

    for (const [machineId, localId] of machineToLocal.entries()) {
      const current = statsMap.get(localId) ?? { totalMachines: 0, operationalMachines: 0 };
      current.totalMachines += 1;

      const status = latestStatusByMachine.get(machineId) ?? 'operativa';
      if (status === 'operativa') {
        current.operationalMachines += 1;
      }

      statsMap.set(localId, current);
    }
  } catch (err) {
    console.warn('Could not fetch machine stats per local:', err);
  }

  return statsMap;
}

/**
 * Fetches active locals from `public.local` joined with `public.comuna` and `public.region`,
 * enriched with active and operational machine counts. Falls back to AsyncStorage cache when offline.
 */
export async function fetchLocals(): Promise<Local[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('local')
      .select(
        'id, nombre, direccion, activo, comuna_id, comuna:comuna_id(id, nombre, region:region_id(id, nombre))',
      )
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rawRows: unknown[] = Array.isArray(data) ? data : [];
    const localIds: string[] = [];

    for (const row of rawRows) {
      if (isRecord(row) && typeof row.id === 'string') {
        localIds.push(row.id);
      }
    }

    const statsByLocal = await fetchMachineStatsByLocal(localIds);
    const locals: Local[] = [];

    for (const row of rawRows) {
      if (!isRecord(row) || typeof row.id !== 'string') continue;

      const id = row.id;
      const { communeName, regionName } = parseCommune(row.comuna);
      const stats = statsByLocal.get(id) ?? { totalMachines: 0, operationalMachines: 0 };

      locals.push({
        id,
        nombre: typeof row.nombre === 'string' && row.nombre.trim() ? row.nombre.trim() : 'Local',
        direccion:
          typeof row.direccion === 'string' && row.direccion.trim()
            ? row.direccion.trim()
            : 'Sin dirección registrada',
        comuna_id: typeof row.comuna_id === 'string' ? row.comuna_id : '',
        comuna_nombre: communeName,
        region_nombre: regionName,
        activo: Boolean(row.activo),
        total_maquinas: stats.totalMachines,
        maquinas_operativas: stats.operationalMachines,
      });
    }

    try {
      await AsyncStorage.setItem(LOCALS_CACHE_KEY, JSON.stringify(locals));
    } catch (cacheErr) {
      console.warn('Could not save locals to local cache:', cacheErr);
    }

    return locals;
  } catch (err) {
    console.warn('Error fetching locals from Supabase, falling back to cache:', err);
    const cached = await getCachedLocals();
    if (cached.length > 0) {
      return cached;
    }
    throw err instanceof Error ? err : new Error('No se pudieron cargar los locales.');
  }
}

export async function getCachedLocals(): Promise<Local[]> {
  try {
    const cached = await AsyncStorage.getItem(LOCALS_CACHE_KEY);
    if (cached) {
      const parsed: unknown = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Local => isRecord(item) && typeof item.nombre === 'string',
        );
      }
    }
  } catch (err) {
    console.warn('Error reading locals from local cache:', err);
  }
  return [];
}

export async function getSavedActiveLocalId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_LOCAL_ID_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveLocalId(localId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_LOCAL_ID_KEY, localId);
  } catch (err) {
    console.warn('Could not persist active local ID:', err);
  }
}
