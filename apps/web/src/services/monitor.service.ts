import { supabase } from './supabase'
import type {
  DatosMonitor, IndicadoresMonitor, LocalMonitor, MaquinaMonitor,
} from '../types/monitor'

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function esBooleanoONulo(value: unknown): value is boolean | null {
  return typeof value === 'boolean' || value === null
}

function esLocal(value: unknown): value is LocalMonitor {
  return esObjeto(value) && typeof value.id === 'string' &&
    typeof value.nombre === 'string' &&
    (typeof value.direccion === 'string' || value.direccion === null) &&
    esBooleanoONulo(value.activo)
}

function esMaquina(value: unknown): value is MaquinaMonitor {
  return esObjeto(value) && typeof value.id === 'string' &&
    typeof value.local_id === 'string' && esBooleanoONulo(value.activo)
}

function esConteo(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function esIndicador(value: unknown): value is IndicadoresMonitor {
  return esObjeto(value) && esConteo(value.maquinas_operativas) &&
    esConteo(value.inspecciones_hoy) && typeof value.fecha_chile === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.fecha_chile)
}

async function obtenerPaginas<T>(
  tabla: 'local' | 'maquina',
  columnas: string,
  validar: (value: unknown) => value is T,
  signal: AbortSignal,
): Promise<T[]> {
  const registros: T[] = []
  const tamanio = 500
  let desde = 0
  while (true) {
    signal.throwIfAborted()
    const { data, error } = await supabase.from(tabla)
      .select(columnas).order('id')
      .range(desde, desde + tamanio - 1).abortSignal(signal)
    if (error) throw error
    const pagina: unknown = data
    if (!Array.isArray(pagina) || !pagina.every(validar)) {
      throw new Error(`Respuesta inválida de ${tabla}.`)
    }
    registros.push(...pagina)
    if (pagina.length < tamanio) return registros
    desde += tamanio
  }
}

export async function obtenerIndicadoresMonitor(
  signal: AbortSignal,
): Promise<IndicadoresMonitor> {
  const { data, error } = await supabase.rpc('obtener_indicadores_monitor')
    .abortSignal(signal)
  if (error) throw error
  const resultado: unknown = data
  if (!esIndicador(resultado)) throw new Error('Respuesta de indicadores inválida.')
  return resultado
}

export async function obtenerDatosMonitor(signal: AbortSignal): Promise<DatosMonitor> {
  const [locales, maquinas, indicadores] = await Promise.all([
    obtenerPaginas('local', 'id, nombre, direccion, activo', esLocal, signal),
    obtenerPaginas('maquina', 'id, local_id, activo', esMaquina, signal),
    obtenerIndicadoresMonitor(signal),
  ])
  return {
    locales: locales.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    maquinas,
    indicadores,
  }
}
