import { supabase } from './supabase'
export interface LocalInforme { id: string; nombre: string }
/** No filtrar activo/eliminado_at: también se emiten informes históricos. */
export async function obtenerLocalesInforme(signal: AbortSignal): Promise<LocalInforme[]> {
  const filas: LocalInforme[] = []
  for (let desde = 0; ; desde += 100) {
    signal.throwIfAborted()
    const { data, error } = await supabase.from('local').select('id,nombre')
      .order('nombre').order('id').range(desde, desde + 99).abortSignal(signal)
    if (error) throw new Error('No se pudieron cargar los locales. Intenta nuevamente.')
    filas.push(...(data ?? []))
    if (!data || data.length < 100) return filas
  }
}
