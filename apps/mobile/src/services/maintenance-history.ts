import AsyncStorage from '@react-native-async-storage/async-storage';
import { readPendingMaintenances } from '@/services/checklists';
import { fetchMachineById } from '@/services/machines';
import { getSupabase } from '@/services/supabase';
import type {
  MaintenanceItem,
  HistoryRecord,
  HistoryPage,
  HistoryQuery,
} from '@/types/maintenance';

export const HISTORY_PAGE_SIZE = 20;
const cacheKey = (query: HistoryQuery) =>
  `@bowling_services/history/v1/${encodeURIComponent(JSON.stringify(query))}`;
const normalizeSearch = (value: string) => value.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();

const formatHistoryDate = (date: string) =>
  new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export async function readPendingHistory(query: HistoryQuery): Promise<HistoryRecord[]> {
  const pending = await readPendingMaintenances(query.userId);
  const search = normalizeSearch(query.search).toLowerCase();
  const matches = pending.filter(
    ({ draft, finalizedAt }) =>
      draft.local_id === query.localId &&
      (query.type === 'all' || draft.tipo === query.type) &&
      (!query.completedFrom || Date.parse(finalizedAt) >= Date.parse(query.completedFrom)) &&
      (!query.completedBefore || Date.parse(finalizedAt) < Date.parse(query.completedBefore)),
  );
  const items = await Promise.all(
    matches.map(async ({ draft, finalizedAt, machine }): Promise<HistoryRecord | null> => {
      const cached = machine ? null : await fetchMachineById(draft.maquina_id, false);
      const categoryId = machine?.categoryId ?? cached?.categoria_id;
      const title = machine?.name ?? cached?.nombre ?? 'Equipo';
      const code = machine?.code ?? cached?.codigo_interno ?? '';
      if (query.categoryId && query.categoryId !== categoryId) return null;
      if (search && ![title, code].some((value) => value.toLowerCase().includes(search)))
        return null;
      return {
        id: draft.mantencion_id,
        titulo: title,
        codigo_interno: code,
        categoria: machine?.categoryName ?? cached?.categoria.nombre ?? 'Sin categoría',
        ubicacion: '',
        etiqueta_tiempo: formatHistoryDate(finalizedAt),
        tipo_icono: 'wrench',
        tipo: draft.tipo,
        iniciada_at: draft.iniciada_at,
        finalizada_at: finalizedAt,
        enviada_at: null,
        pendiente_envio: true,
        trabajos_realizados: draft.trabajos_realizados,
        estado_equipo_final: draft.estado_equipo_final,
        requiere_repuestos: draft.requiere_repuestos,
        detalle_repuestos: draft.requiere_repuestos ? draft.detalle_repuestos : null,
        pendientes: draft.pendientes,
        observaciones: draft.observaciones,
      };
    }),
  );
  return items.filter((item): item is HistoryRecord => item !== null);
}

export async function readHistoryCache(query: HistoryQuery): Promise<HistoryPage | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const value = JSON.parse(raw) as HistoryPage;
    return Array.isArray(value.items) && typeof value.totalCount === 'number' ? value : null;
  } catch {
    return null;
  }
}

export async function fetchHistoryPage(query: HistoryQuery, offset = 0): Promise<HistoryPage> {
  if (!query.userId || !query.localId) throw new Error('Selecciona un local e inicia sesión.');
  let request = getSupabase()
    .from('mantencion')
    .select(
      `
    id, tipo, estado, iniciada_at, finalizada_at, enviada_at, trabajos_realizados,
    estado_equipo_final, requiere_repuestos, detalle_repuestos, pendientes, observaciones,
    maquina:maquina!inner(nombre, codigo_interno, categoria_id, categoria:categoria_maquina(nombre))
  `,
      { count: 'exact' },
    )
    .eq('tecnico_id', query.userId)
    .eq('local_id', query.localId)
    .eq('estado', 'enviada');
  if (query.completedFrom) request = request.gte('finalizada_at', query.completedFrom);
  if (query.completedBefore) request = request.lt('finalizada_at', query.completedBefore);
  if (query.categoryId) request = request.eq('maquina.categoria_id', query.categoryId);
  if (query.type !== 'all') request = request.eq('tipo', query.type);
  const search = normalizeSearch(query.search);
  if (search)
    request = request.or(`nombre.ilike.%${search}%,codigo_interno.ilike.%${search}%`, {
      referencedTable: 'maquina',
    });
  const { data, error, count } = await request
    .order('finalizada_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE - 1);
  if (error)
    throw new Error(
      'No se pudo actualizar el historial. Revisa tu conexión e inténtalo nuevamente.',
    );
  const items = (data ?? []).map((raw): HistoryRecord => {
    const row = raw as unknown as Omit<HistoryRecord, keyof MaintenanceItem> & {
      id: string;
      estado_equipo_final: HistoryRecord['estado_equipo_final'];
      maquina: { nombre: string; codigo_interno: string; categoria: { nombre: string } | null };
    };
    return {
      ...row,
      titulo: row.maquina.nombre,
      categoria: row.maquina.categoria?.nombre ?? 'Sin categoría',
      codigo_interno: row.maquina.codigo_interno,
      ubicacion: '',
      etiqueta_tiempo: formatHistoryDate(row.finalizada_at ?? row.enviada_at ?? row.iniciada_at),
      tipo_icono: 'completed',
    };
  });
  const result = {
    items,
    totalCount: count ?? items.length,
    hasMore: offset + items.length < (count ?? 0),
  };
  if (offset === 0) {
    try {
      await AsyncStorage.setItem(cacheKey(query), JSON.stringify(result));
    } catch {
      /* La lectura del servidor sigue siendo válida si falla la caché. */
    }
  }
  return result;
}
