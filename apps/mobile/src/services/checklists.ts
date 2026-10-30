import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/services/supabase';
import type {
  Checklist,
  ChecklistItem,
  ChecklistSection,
  MaintenanceDraft,
  SubmitMaintenanceResult,
} from '@/types/checklist';

const CHECKLIST_CACHE_PREFIX = '@bowling_services/checklist_cache';
const DRAFT_CACHE_PREFIX = '@bowling_services/maintenance_draft';
const OFFLINE_QUEUE_KEY = '@bowling_services/offline_maintenance_queue';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChecklistItem(raw: unknown, seccionId: string): ChecklistItem | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.descripcion !== 'string') {
    return null;
  }

  return {
    id: raw.id,
    seccion_id: typeof raw.seccion_id === 'string' ? raw.seccion_id : seccionId,
    descripcion: raw.descripcion.trim(),
    instrucciones: typeof raw.instrucciones === 'string' ? raw.instrucciones.trim() : null,
    obligatorio: Boolean(raw.obligatorio ?? true),
    permite_no_aplica: Boolean(raw.permite_no_aplica ?? true),
    orden: typeof raw.orden === 'number' ? raw.orden : 0,
  };
}

function parseChecklistSection(raw: unknown, pautaId: string): ChecklistSection | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.nombre !== 'string') {
    return null;
  }

  const sectionId = raw.id;
  const items: ChecklistItem[] = [];

  const rawItems = Array.isArray(raw.item_pauta) ? raw.item_pauta : [];
  for (const rawItem of rawItems) {
    const item = parseChecklistItem(rawItem, sectionId);
    if (item) {
      items.push(item);
    }
  }

  items.sort((a, b) => a.orden - b.orden);

  return {
    id: sectionId,
    pauta_id: typeof raw.pauta_id === 'string' ? raw.pauta_id : pautaId,
    nombre: raw.nombre.trim(),
    descripcion: typeof raw.descripcion === 'string' ? raw.descripcion.trim() : null,
    orden: typeof raw.orden === 'number' ? raw.orden : 0,
    items,
  };
}

/**
 * Fetches the active maintenance checklist (pauta) for a specific machine category,
 * with automatic fallback to local AsyncStorage cache for offline operation.
 */
export async function fetchActiveChecklistByCategory(
  categoriaId: string,
): Promise<Checklist | null> {
  const cacheKey = `${CHECKLIST_CACHE_PREFIX}:${categoriaId.toLowerCase()}`;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('pauta')
      .select(
        `
        id,
        categoria_id,
        nombre,
        descripcion,
        version,
        activo,
        created_at,
        seccion_pauta (
          id,
          pauta_id,
          nombre,
          descripcion,
          orden,
          item_pauta (
            id,
            seccion_id,
            descripcion,
            instrucciones,
            obligatorio,
            permite_no_aplica,
            orden
          )
        )
      `,
      )
      .eq('categoria_id', categoriaId)
      .eq('activo', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !isRecord(data) || typeof data.id !== 'string') {
      return await getCachedChecklist(categoriaId);
    }

    const pautaId = data.id;
    const secciones: ChecklistSection[] = [];

    const rawSections = Array.isArray(data.seccion_pauta) ? data.seccion_pauta : [];
    for (const rawSection of rawSections) {
      const section = parseChecklistSection(rawSection, pautaId);
      if (section) {
        secciones.push(section);
      }
    }

    secciones.sort((a, b) => a.orden - b.orden);

    const checklist: Checklist = {
      id: pautaId,
      categoria_id: typeof data.categoria_id === 'string' ? data.categoria_id : categoriaId,
      nombre: typeof data.nombre === 'string' ? data.nombre : 'Pauta de Mantenimiento',
      descripcion: typeof data.descripcion === 'string' ? data.descripcion : null,
      version: typeof data.version === 'number' ? data.version : 1,
      activo: Boolean(data.activo),
      created_at: typeof data.created_at === 'string' ? data.created_at : '',
      secciones,
    };

    void AsyncStorage.setItem(cacheKey, JSON.stringify(checklist)).catch(() => {});

    return checklist;
  } catch (err) {
    console.warn('Error fetching active checklist from Supabase, loading from cache:', err);
    return await getCachedChecklist(categoriaId);
  }
}

/**
 * Loads a cached checklist from AsyncStorage.
 */
export async function getCachedChecklist(categoriaId: string): Promise<Checklist | null> {
  const cacheKey = `${CHECKLIST_CACHE_PREFIX}:${categoriaId.toLowerCase()}`;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.id === 'string' && Array.isArray(parsed.secciones)) {
      return parsed as unknown as Checklist;
    }
  } catch (err) {
    console.warn('Error reading checklist from local cache:', err);
  }
  return null;
}

/**
 * Saves an in-progress maintenance draft to AsyncStorage.
 */
export async function saveMaintenanceDraft(draft: MaintenanceDraft): Promise<void> {
  try {
    const key = `${DRAFT_CACHE_PREFIX}:${draft.maquina_id.toLowerCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.warn('Could not save maintenance draft:', err);
  }
}

/**
 * Retrieves an existing in-progress draft for a given machine, if any.
 */
export async function getMaintenanceDraft(maquinaId: string): Promise<MaintenanceDraft | null> {
  try {
    const key = `${DRAFT_CACHE_PREFIX}:${maquinaId.toLowerCase()}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.mantencion_id === 'string') {
      return parsed as unknown as MaintenanceDraft;
    }
  } catch {
    // Ignore draft parse errors
  }
  return null;
}

/**
 * Clears an in-progress maintenance draft from AsyncStorage upon successful submission.
 */
export async function clearMaintenanceDraft(maquinaId: string): Promise<void> {
  try {
    const key = `${DRAFT_CACHE_PREFIX}:${maquinaId.toLowerCase()}`;
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore draft cleanup errors
  }
}

async function queueMaintenanceOffline(draft: MaintenanceDraft): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: MaintenanceDraft[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRecord(item) && typeof item.mantencion_id === 'string') {
            queue.push(item as unknown as MaintenanceDraft);
          }
        }
      }
    }

    const byId = new Map<string, MaintenanceDraft>();
    for (const item of queue) {
      byId.set(item.mantencion_id.toLowerCase(), item);
    }
    byId.set(draft.mantencion_id.toLowerCase(), draft);

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(Array.from(byId.values())));
  } catch (err) {
    console.warn('Could not queue maintenance offline:', err);
  }
}

/**
 * Submits the completed maintenance checklist.
 * Saves the draft in `mantencion` and `respuesta_item`, and executes `submit_maintenance(p_id)`.
 * If offline or the network fails, it queues the record locally in AsyncStorage.
 */
export async function submitMaintenanceRecord(
  draft: MaintenanceDraft,
  tecnicoId: string,
  isOnline: boolean,
): Promise<SubmitMaintenanceResult> {
  const nowIso = new Date().toISOString();

  if (!isOnline) {
    await queueMaintenanceOffline(draft);
    await clearMaintenanceDraft(draft.maquina_id);
    return {
      exito: true,
      mantencion_id: draft.mantencion_id,
      guardado_offline: true,
      mensaje:
        'Intervención guardada en el dispositivo. Se enviará automáticamente cuando recuperes la conexión.',
    };
  }

  try {
    const supabase = getSupabase();

    // 1. Guardar la fila principal de la intervención en estado 'borrador'
    const { error: headerError } = await supabase.from('mantencion').upsert({
      id: draft.mantencion_id,
      maquina_id: draft.maquina_id,
      pauta_id: draft.pauta_id,
      tecnico_id: tecnicoId,
      local_id: draft.local_id,
      tipo: draft.tipo,
      estado: 'borrador',
      iniciada_at: draft.iniciada_at,
      finalizada_at: nowIso,
      enviada_at: nowIso,
      trabajos_realizados: draft.trabajos_realizados.trim(),
      estado_equipo_final: draft.estado_equipo_final,
      requiere_repuestos: draft.requiere_repuestos,
      detalle_repuestos: draft.requiere_repuestos ? draft.detalle_repuestos.trim() : null,
      pendientes: draft.pendientes.trim() || null,
      observaciones: draft.observaciones.trim() || null,
    });

    if (headerError) {
      throw new Error(`Error al guardar mantención: ${headerError.message}`);
    }

    // 2. Guardar las respuestas de los ítems de la pauta
    const answersList = Object.values(draft.respuestas).filter((ans) => ans.resultado !== null);

    if (answersList.length > 0) {
      const responseRows = answersList.map((ans) => ({
        mantencion_id: draft.mantencion_id,
        item_id: ans.item_id,
        resultado: ans.resultado,
        observaciones: ans.observaciones.trim() || null,
      }));

      const { error: itemsError } = await supabase
        .from('respuesta_item')
        .upsert(responseRows, { onConflict: 'mantencion_id,item_id' });

      if (itemsError) {
        throw new Error(`Error al guardar respuestas: ${itemsError.message}`);
      }
    }

    // 3. Confirmar la intervención llamando a la RPC transaccional submit_maintenance
    const { error: rpcError } = await supabase.rpc('submit_maintenance', {
      p_id: draft.mantencion_id,
    });

    if (rpcError) {
      throw new Error(`Error al confirmar envío: ${rpcError.message}`);
    }

    await clearMaintenanceDraft(draft.maquina_id);

    return {
      exito: true,
      mantencion_id: draft.mantencion_id,
      guardado_offline: false,
      mensaje: 'Mantención registrada y enviada exitosamente.',
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'No se pudo confirmar el envío al servidor.';
    await queueMaintenanceOffline(draft);
    await clearMaintenanceDraft(draft.maquina_id);
    return {
      exito: true,
      mantencion_id: draft.mantencion_id,
      guardado_offline: true,
      mensaje: `No se pudo confirmar el envío. La intervención quedó guardada localmente para reintentar. Detalle: ${errorMessage}`,
    };
  }
}
