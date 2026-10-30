import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/services/supabase';
import type {
  FetchMachinesParams,
  Machine,
  MachineBrand,
  MachineCategory,
  MachineStatus,
  MachineStatusFilter,
  PaginatedMachinesResult,
  QrMachineResolutionResult,
} from '@/types/machine';

export const MACHINES_PAGE_SIZE = 15;

const MACHINES_CACHE_KEY = '@bowling_services/machines_cache';
const MACHINES_CATALOG_CACHE_KEY = '@bowling_services/machines_catalog_cache';
const CATEGORIES_CACHE_KEY = '@bowling_services/machine_categories_cache';
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const MACHINE_IMAGES_BUCKET = 'img_maquinas';
const SIGNED_URL_EXPIRY_SECONDS = 3600;
const SIGNED_URL_CACHE_TTL_MS = 45 * 60 * 1000;

const DEFAULT_CATEGORY_ORDER = [
  'Ticket',
  'Simulador',
  'Flipper',
  'Mesa de aire',
  'Peluchera',
  'Atracción infantil',
];

interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlMemoryCache = new Map<string, SignedUrlCacheEntry>();

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

function parseCategory(raw: unknown, fallbackId: string): MachineCategory {
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (isRecord(item) && typeof item.nombre === 'string') {
    return {
      id: typeof item.id === 'string' ? item.id : fallbackId,
      nombre: formatCategoryDisplayName(item.nombre.trim()),
    };
  }
  return {
    id: fallbackId,
    nombre: 'General',
  };
}

function parseBrand(raw: unknown, fallbackId: string | null): MachineBrand | null {
  if (!fallbackId && !raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (isRecord(item) && typeof item.nombre === 'string' && item.nombre.trim()) {
    return {
      id: typeof item.id === 'string' ? item.id : (fallbackId ?? ''),
      nombre: item.nombre.trim(),
    };
  }
  return null;
}

/**
 * Normalizes database category names for Spanish UI presentation.
 */
export function formatCategoryDisplayName(rawName: string): string {
  const normalized = rawName.trim();
  if (normalized.toLowerCase() === 'atraccion infantil') {
    return 'Atracción infantil';
  }
  return normalized;
}

function sortCategories(categories: MachineCategory[]): MachineCategory[] {
  return [...categories].sort((a, b) => {
    const indexA = DEFAULT_CATEGORY_ORDER.indexOf(a.nombre);
    const indexB = DEFAULT_CATEGORY_ORDER.indexOf(b.nombre);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * Fetches active machine categories from `public.categoria_maquina` with offline cache fallback.
 */
export async function fetchMachineCategories(): Promise<MachineCategory[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('categoria_maquina')
      .select('id, nombre')
      .eq('activo', true);

    if (error) {
      throw new Error(error.message);
    }

    const parsed: MachineCategory[] = [];
    if (Array.isArray(data)) {
      for (const row of data) {
        if (isRecord(row) && typeof row.id === 'string' && typeof row.nombre === 'string') {
          parsed.push({
            id: row.id,
            nombre: formatCategoryDisplayName(row.nombre),
          });
        }
      }
    }

    const sorted = sortCategories(parsed);
    try {
      await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(sorted));
    } catch (cacheErr) {
      console.warn('Could not save machine categories to cache:', cacheErr);
    }
    return sorted;
  } catch (err) {
    console.warn('Error fetching categories from Supabase, falling back to cache:', err);
    return await getCachedMachineCategories();
  }
}

export async function getCachedMachineCategories(): Promise<MachineCategory[]> {
  try {
    const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      const parsed: unknown = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is MachineCategory => isRecord(item) && typeof item.nombre === 'string',
        );
      }
    }
  } catch (err) {
    console.warn('Error reading machine categories from cache:', err);
  }
  return [];
}

/**
 * Resolves signed URLs in batch for private storage paths in `img_maquinas`,
 * reusing valid in-memory URLs to avoid redundant storage requests.
 */
async function resolveMachinePhotoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const now = Date.now();
  const pathsToSign = new Set<string>();

  for (const rawPath of paths) {
    const cleanPath = rawPath?.trim();
    if (!cleanPath || cleanPath === 'default-machine.png') continue;

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      result.set(cleanPath, cleanPath);
      continue;
    }

    const cached = signedUrlMemoryCache.get(cleanPath);
    if (cached && cached.expiresAt > now) {
      result.set(cleanPath, cached.url);
    } else {
      pathsToSign.add(cleanPath);
    }
  }

  if (pathsToSign.size === 0) {
    return result;
  }

  try {
    const supabase = getSupabase();
    const uniquePaths = Array.from(pathsToSign);
    const { data, error } = await supabase.storage
      .from(MACHINE_IMAGES_BUCKET)
      .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRY_SECONDS);

    if (!error && Array.isArray(data)) {
      const expiresAt = Date.now() + SIGNED_URL_CACHE_TTL_MS;
      for (const item of data) {
        if (item.path && item.signedUrl && !item.error) {
          signedUrlMemoryCache.set(item.path, {
            url: item.signedUrl,
            expiresAt,
          });
          result.set(item.path, item.signedUrl);
        }
      }
    }
  } catch (err) {
    console.warn('Could not generate signed URLs for machine photos:', err);
  }

  return result;
}

interface LatestMaintenanceSummary {
  status: MachineStatus;
  finishedAt: string;
}

/**
 * Fetches the latest submitted maintenance status per machine.
 * If `machineIds` is provided, scopes the query to those machines;
 * otherwise resolves the latest status across all machines with submitted maintenances.
 */
async function fetchLatestMaintenanceByMachine(
  machineIds?: string[],
): Promise<Map<string, LatestMaintenanceSummary>> {
  const statusMap = new Map<string, LatestMaintenanceSummary>();
  if (machineIds && machineIds.length === 0) return statusMap;

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('mantencion')
      .select('id, maquina_id, estado_equipo_final, finalizada_at, created_at')
      .eq('estado', 'enviada')
      .not('finalizada_at', 'is', null);

    if (machineIds && machineIds.length > 0) {
      query = query.in('maquina_id', machineIds);
    }

    const { data, error } = await query
      .order('finalizada_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error || !Array.isArray(data)) {
      return statusMap;
    }

    for (const row of data) {
      if (!isRecord(row)) continue;
      const machineId = typeof row.maquina_id === 'string' ? row.maquina_id : null;
      if (!machineId || statusMap.has(machineId)) continue;

      if (isMachineStatus(row.estado_equipo_final) && typeof row.finalizada_at === 'string') {
        statusMap.set(machineId, {
          status: row.estado_equipo_final,
          finishedAt: row.finalizada_at,
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch latest maintenance status per machine:', err);
  }

  return statusMap;
}

async function fetchMatchingBrandIds(cleanSearch: string): Promise<string[]> {
  if (!cleanSearch) return [];
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('marca')
      .select('id')
      .ilike('nombre', `%${cleanSearch}%`);

    if (error || !Array.isArray(data)) return [];
    const ids: string[] = [];
    for (const row of data) {
      if (isRecord(row) && typeof row.id === 'string') {
        ids.push(row.id);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

function sanitizePostgrestSearchTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, ' ').trim();
}

/**
 * Fetches a paginated slice of active machines from Supabase using `.range(from, to)`
 * and `{ count: 'exact' }`, resolving category, search (name/code/model/brand),
 * and operational status filters 100% server-side.
 */
export async function fetchMachinesPage(
  params?: FetchMachinesParams,
): Promise<PaginatedMachinesResult> {
  const offset = Math.max(0, params?.offset ?? 0);
  const limit = Math.max(1, params?.limit ?? MACHINES_PAGE_SIZE);
  const localKey = params?.localId?.trim() || 'all';
  const cleanSearch = sanitizePostgrestSearchTerm(params?.searchQuery ?? '');
  const statusFilter: MachineStatusFilter = params?.statusFilter ?? 'all';

  try {
    const supabase = getSupabase();

    // Si hay filtro por estado operativo o búsqueda por texto, pre-resolvemos en paralelo
    const [preloadedStatusMap, matchingBrandIds] = await Promise.all([
      statusFilter !== 'all' ? fetchLatestMaintenanceByMachine() : Promise.resolve(null),
      cleanSearch.length > 0 ? fetchMatchingBrandIds(cleanSearch) : Promise.resolve([]),
    ]);

    let query = supabase
      .from('maquina')
      .select(
        'id, local_id, categoria_id, codigo_interno, nombre, marca_id, modelo, foto_path, activo, created_at, categoria:categoria_id(id, nombre), marca:marca_id(id, nombre)',
        { count: 'exact' },
      )
      .eq('activo', true);

    if (params?.localId) {
      query = query.eq('local_id', params.localId);
    }

    if (params?.categoryId) {
      query = query.eq('categoria_id', params.categoryId);
    }

    if (cleanSearch.length > 0) {
      const orClauses = [
        `nombre.ilike.%${cleanSearch}%`,
        `codigo_interno.ilike.%${cleanSearch}%`,
        `modelo.ilike.%${cleanSearch}%`,
      ];
      if (matchingBrandIds.length > 0) {
        orClauses.push(`marca_id.in.(${matchingBrandIds.join(',')})`);
      }
      query = query.or(orClauses.join(','));
    }

    if (statusFilter !== 'all' && preloadedStatusMap) {
      if (statusFilter === 'operativa_con_observaciones' || statusFilter === 'fuera_de_servicio') {
        const matchingMachineIds: string[] = [];
        for (const [machineId, summary] of preloadedStatusMap.entries()) {
          if (summary.status === statusFilter) {
            matchingMachineIds.push(machineId);
          }
        }
        if (matchingMachineIds.length === 0) {
          return {
            items: [],
            totalCount: 0,
            hasMore: false,
          };
        }
        query = query.in('id', matchingMachineIds);
      } else if (statusFilter === 'operativa') {
        const nonOperativeIds: string[] = [];
        for (const [machineId, summary] of preloadedStatusMap.entries()) {
          if (summary.status !== 'operativa') {
            nonOperativeIds.push(machineId);
          }
        }
        if (nonOperativeIds.length > 0) {
          query = query.not('id', 'in', `(${nonOperativeIds.join(',')})`);
        }
      }
    }

    const { data, error, count } = await query
      .order('codigo_interno', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rawRows: unknown[] = Array.isArray(data) ? data : [];
    const machineIds: string[] = [];
    const photoPaths: (string | null)[] = [];

    for (const row of rawRows) {
      if (isRecord(row) && typeof row.id === 'string') {
        machineIds.push(row.id);
        photoPaths.push(typeof row.foto_path === 'string' ? row.foto_path : null);
      }
    }

    const [latestMaintenanceMap, signedUrlsMap] = await Promise.all([
      preloadedStatusMap
        ? Promise.resolve(preloadedStatusMap)
        : fetchLatestMaintenanceByMachine(machineIds),
      resolveMachinePhotoUrls(photoPaths),
    ]);

    const items: Machine[] = [];

    for (const row of rawRows) {
      if (!isRecord(row) || typeof row.id !== 'string') continue;

      const id = row.id;
      const localId = typeof row.local_id === 'string' ? row.local_id : '';
      const categoryId = typeof row.categoria_id === 'string' ? row.categoria_id : '';
      const brandId = typeof row.marca_id === 'string' ? row.marca_id : null;
      const photoPath = typeof row.foto_path === 'string' ? row.foto_path.trim() : null;
      const latestMaintenance = latestMaintenanceMap.get(id);

      items.push({
        id,
        local_id: localId,
        categoria_id: categoryId,
        codigo_interno: typeof row.codigo_interno === 'string' ? row.codigo_interno : '',
        nombre: typeof row.nombre === 'string' ? row.nombre : 'Equipo sin nombre',
        marca_id: brandId,
        modelo: typeof row.modelo === 'string' && row.modelo.trim() ? row.modelo.trim() : null,
        foto_path: photoPath,
        foto_url: photoPath ? (signedUrlsMap.get(photoPath) ?? null) : null,
        activo: Boolean(row.activo),
        created_at: typeof row.created_at === 'string' ? row.created_at : '',
        categoria: parseCategory(row.categoria, categoryId),
        marca: parseBrand(row.marca, brandId),
        estado_equipo: latestMaintenance?.status ?? 'operativa',
        ultima_mantencion_at: latestMaintenance?.finishedAt ?? null,
      });
    }

    // Si es una carga sin filtros de texto/categoría/estado, actualizamos la caché local acumulativa
    if (!params?.categoryId && cleanSearch.length === 0 && statusFilter === 'all') {
      void mergeMachinesIntoCache(localKey, items, offset === 0);
    }

    const totalCount = typeof count === 'number' ? count : offset + items.length;
    const hasMore = offset + items.length < totalCount;

    return {
      items,
      totalCount,
      hasMore,
      isFromCache: false,
    };
  } catch (err) {
    const cached = await getCachedMachines(params?.localId);
    if (cached && cached.length > 0) {
      const filtered = filterMachinesInMemory(
        cached,
        params?.categoryId,
        cleanSearch,
        statusFilter,
      );
      const paged = filtered.slice(offset, offset + limit);
      return {
        items: paged,
        totalCount: filtered.length,
        hasMore: offset + paged.length < filtered.length,
        isFromCache: true,
      };
    }

    throw err instanceof Error ? err : new Error('No se pudo cargar el listado de máquinas.');
  }
}

function filterMachinesInMemory(
  machines: Machine[],
  categoryId?: string,
  searchQuery?: string,
  statusFilter: MachineStatusFilter = 'all',
): Machine[] {
  const q = searchQuery?.trim().toLowerCase() ?? '';
  return machines.filter((machine) => {
    const matchesCategory = !categoryId || machine.categoria_id === categoryId;
    const matchesStatus = statusFilter === 'all' || machine.estado_equipo === statusFilter;
    const matchesSearch =
      q.length === 0 ||
      machine.nombre.toLowerCase().includes(q) ||
      machine.codigo_interno.toLowerCase().includes(q) ||
      (machine.marca?.nombre.toLowerCase().includes(q) ?? false) ||
      (machine.modelo?.toLowerCase().includes(q) ?? false);
    return matchesCategory && matchesStatus && matchesSearch;
  });
}

async function mergeMachinesIntoCache(
  localKey: string,
  newItems: Machine[],
  replaceFromStart: boolean,
): Promise<void> {
  try {
    const cacheKey = `${MACHINES_CACHE_KEY}:${localKey}`;
    if (replaceFromStart) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(newItems));
      return;
    }

    const existing = await getCachedMachines(localKey === 'all' ? undefined : localKey);
    if (!existing) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(newItems));
      return;
    }

    const byId = new Map<string, Machine>();
    for (const item of existing) {
      byId.set(item.id, item);
    }
    for (const item of newItems) {
      byId.set(item.id, item);
    }
    const merged = Array.from(byId.values()).sort((a, b) =>
      a.codigo_interno.localeCompare(b.codigo_interno, 'es'),
    );
    await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
  } catch (err) {
    console.warn('Could not update machines local cache:', err);
  }
}

/**
 * Reads cached machines from AsyncStorage for instant initial render or offline fallback.
 */
export async function getCachedMachines(localId?: string): Promise<Machine[] | null> {
  const localKey = localId?.trim() || 'all';
  try {
    const cached = await AsyncStorage.getItem(`${MACHINES_CACHE_KEY}:${localKey}`);
    if (cached) {
      const parsed: unknown = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Machine => isRecord(item) && typeof item.nombre === 'string',
        );
      }
    }
  } catch (err) {
    console.warn('Error reading machines from local cache:', err);
  }
  return null;
}

/**
 * Extracts a lowercase UUID from a scanned QR code string.
 * Returns `null` immediately if the QR payload does not contain a valid UUID.
 */
export function extractMachineUuidFromQr(rawQr: string): string | null {
  const trimmed = rawQr.trim();
  if (!trimmed) return null;
  const match = trimmed.match(UUID_REGEX);
  return match ? match[0].toLowerCase() : null;
}

function mapRawMachineRow(
  row: Record<string, unknown>,
  latestMaintenance?: LatestMaintenanceSummary,
  signedUrlsMap?: Map<string, string>,
): Machine | null {
  if (typeof row.id !== 'string') return null;

  const id = row.id;
  const localId = typeof row.local_id === 'string' ? row.local_id : '';
  const categoryId = typeof row.categoria_id === 'string' ? row.categoria_id : '';
  const brandId = typeof row.marca_id === 'string' ? row.marca_id : null;
  const photoPath = typeof row.foto_path === 'string' ? row.foto_path.trim() : null;

  return {
    id,
    local_id: localId,
    categoria_id: categoryId,
    codigo_interno: typeof row.codigo_interno === 'string' ? row.codigo_interno : '',
    nombre: typeof row.nombre === 'string' ? row.nombre : 'Equipo sin nombre',
    marca_id: brandId,
    modelo: typeof row.modelo === 'string' && row.modelo.trim() ? row.modelo.trim() : null,
    foto_path: photoPath,
    foto_url: photoPath ? (signedUrlsMap?.get(photoPath) ?? null) : null,
    activo: Boolean(row.activo),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    categoria: parseCategory(row.categoria, categoryId),
    marca: parseBrand(row.marca, brandId),
    estado_equipo: latestMaintenance?.status ?? 'operativa',
    ultima_mantencion_at: latestMaintenance?.finishedAt ?? null,
  };
}

/**
 * Pre-syncs the full active machine catalog into AsyncStorage so QR scanning
 * works 100% offline even for machines that haven't been scrolled into view yet.
 */
export async function syncAllActiveMachinesForOfflineCache(): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('maquina')
      .select(
        'id, local_id, categoria_id, codigo_interno, nombre, marca_id, modelo, foto_path, activo, created_at, categoria:categoria_id(id, nombre), marca:marca_id(id, nombre)',
      )
      .eq('activo', true)
      .order('codigo_interno', { ascending: true });

    if (error || !Array.isArray(data)) return;

    const rawRows: Record<string, unknown>[] = [];
    const machineIds: string[] = [];
    const photoPaths: (string | null)[] = [];

    for (const row of data) {
      if (isRecord(row) && typeof row.id === 'string') {
        rawRows.push(row);
        machineIds.push(row.id);
        photoPaths.push(typeof row.foto_path === 'string' ? row.foto_path : null);
      }
    }

    const [latestMaintenanceMap, signedUrlsMap] = await Promise.all([
      fetchLatestMaintenanceByMachine(machineIds),
      resolveMachinePhotoUrls(photoPaths),
    ]);

    const catalog: Machine[] = [];
    for (const row of rawRows) {
      const mapped = mapRawMachineRow(row, latestMaintenanceMap.get(String(row.id)), signedUrlsMap);
      if (mapped) {
        catalog.push(mapped);
      }
    }

    await AsyncStorage.setItem(MACHINES_CATALOG_CACHE_KEY, JSON.stringify(catalog));
  } catch (err) {
    console.warn('Could not pre-sync full machine catalog for offline QR resolution:', err);
  }
}

async function upsertSingleMachineInCatalogCache(machine: Machine): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(MACHINES_CATALOG_CACHE_KEY);
    const list: Machine[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRecord(item) && typeof item.id === 'string' && typeof item.nombre === 'string') {
            list.push(item as unknown as Machine);
          }
        }
      }
    }
    const byId = new Map<string, Machine>();
    for (const item of list) {
      byId.set(item.id.toLowerCase(), item);
    }
    byId.set(machine.id.toLowerCase(), machine);
    await AsyncStorage.setItem(
      MACHINES_CATALOG_CACHE_KEY,
      JSON.stringify(Array.from(byId.values())),
    );
  } catch {
    // Ignore storage errors silently
  }
}

async function findCachedMachineByUuid(uuid: string): Promise<Machine | null> {
  const normalizedTarget = uuid.toLowerCase();

  try {
    const catalogRaw = await AsyncStorage.getItem(MACHINES_CATALOG_CACHE_KEY);
    if (catalogRaw) {
      const parsed: unknown = JSON.parse(catalogRaw);
      if (Array.isArray(parsed)) {
        const match = parsed.find(
          (item): item is Machine =>
            isRecord(item) &&
            typeof item.id === 'string' &&
            item.id.toLowerCase() === normalizedTarget,
        );
        if (match) return match;
      }
    }
  } catch {
    // Fallback to paginated cache below
  }

  const cachedAll = await getCachedMachines();
  if (cachedAll) {
    const match = cachedAll.find((item) => item.id.toLowerCase() === normalizedTarget);
    if (match) return match;
  }

  return null;
}

/**
 * Resolves a machine by its UUID, checking Supabase first and falling back to local cache.
 */
export async function fetchMachineById(machineId: string): Promise<Machine | null> {
  const result = await resolveMachineByQrCode(machineId);
  return result.maquina;
}

/**
 * Resolves a scanned QR code (containing a machine UUID) against Supabase
 * with automatic offline fallback to the local AsyncStorage machine catalog.
 */
export async function resolveMachineByQrCode(
  rawQr: string,
  options?: { preferOffline?: boolean },
): Promise<QrMachineResolutionResult> {
  const uuid = extractMachineUuidFromQr(rawQr);

  if (!uuid) {
    return {
      estado_resolucion: 'invalid_qr',
      maquina: null,
      uuid_detectado: null,
      desde_cache: false,
    };
  }

  if (options?.preferOffline) {
    const cachedMachine = await findCachedMachineByUuid(uuid);
    return {
      estado_resolucion: cachedMachine ? 'found' : 'not_found',
      maquina: cachedMachine,
      uuid_detectado: uuid,
      desde_cache: true,
    };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('maquina')
      .select(
        'id, local_id, categoria_id, codigo_interno, nombre, marca_id, modelo, foto_path, activo, created_at, categoria:categoria_id(id, nombre), marca:marca_id(id, nombre)',
      )
      .eq('id', uuid)
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !isRecord(data)) {
      return {
        estado_resolucion: 'not_found',
        maquina: null,
        uuid_detectado: uuid,
        desde_cache: false,
      };
    }

    const photoPath = typeof data.foto_path === 'string' ? data.foto_path : null;
    const [latestMaintenanceMap, signedUrlsMap] = await Promise.all([
      fetchLatestMaintenanceByMachine([uuid]),
      resolveMachinePhotoUrls([photoPath]),
    ]);

    const machine = mapRawMachineRow(data, latestMaintenanceMap.get(uuid), signedUrlsMap);

    if (!machine) {
      return {
        estado_resolucion: 'not_found',
        maquina: null,
        uuid_detectado: uuid,
        desde_cache: false,
      };
    }

    void upsertSingleMachineInCatalogCache(machine);

    return {
      estado_resolucion: 'found',
      maquina: machine,
      uuid_detectado: uuid,
      desde_cache: false,
    };
  } catch (err) {
    console.warn('Error resolving QR machine from Supabase, falling back to local cache:', err);
    const cachedMachine = await findCachedMachineByUuid(uuid);
    return {
      estado_resolucion: cachedMachine ? 'found' : 'not_found',
      maquina: cachedMachine,
      uuid_detectado: uuid,
      desde_cache: true,
    };
  }
}
