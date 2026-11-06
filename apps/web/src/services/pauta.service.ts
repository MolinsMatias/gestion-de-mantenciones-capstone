import { supabase } from './supabase'

export interface Pauta {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string | null
  version: number
  activo: boolean
}
export interface CategoriaPauta { id: string; nombre: string }
export interface ItemPauta {
  id: string
  seccion_id: string
  descripcion: string
  instrucciones: string | null
  obligatorio: boolean
  permite_no_aplica: boolean
  orden: number
}
interface Seccion {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
}
export interface SeccionPauta extends Seccion { items: ItemPauta[] }

async function leerPaginas<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  signal: AbortSignal,
): Promise<T[]> {
  const filas: T[] = []
  const tamanio = 500
  for (let desde = 0; ; desde += tamanio) {
    signal.throwIfAborted()
    const { data, error } = await consulta(desde, desde + tamanio - 1)
    if (error) throw error
    if (!data) throw new Error('Supabase no devolvió los registros esperados.')
    filas.push(...data)
    if (data.length < tamanio) return filas
  }
}

export async function obtenerCatalogoPautas(signal: AbortSignal) {
  const [pautas, categorias] = await Promise.all([
    leerPaginas<Pauta>((a, b) => supabase.from('pauta')
      .select('id,categoria_id,nombre,descripcion,version,activo')
      .is('eliminado_at', null)
      .order('nombre').order('version', { ascending: false }).order('id')
      .range(a, b).abortSignal(signal), signal),
    leerPaginas<CategoriaPauta>((a, b) => supabase.from('categoria_maquina')
      .select('id,nombre').order('nombre').order('id').range(a, b).abortSignal(signal), signal),
  ])
  return { pautas, categorias }
}

export async function obtenerSeccionesPauta(id: string, signal: AbortSignal): Promise<SeccionPauta[]> {
  const secciones = await leerPaginas<Seccion>((a, b) => supabase.from('seccion_pauta')
    .select('id,nombre,descripcion,orden').eq('pauta_id', id)
    .order('orden').order('id').range(a, b).abortSignal(signal), signal)
  const porSeccion = new Map<string, ItemPauta[]>()

  for (let i = 0; i < secciones.length; i += 100) {
    const ids = secciones.slice(i, i + 100).map(seccion => seccion.id)
    const items = await leerPaginas<ItemPauta>((a, b) => supabase.from('item_pauta')
      .select('id,seccion_id,descripcion,instrucciones,obligatorio,permite_no_aplica,orden')
      .in('seccion_id', ids).order('orden').order('id')
      .range(a, b).abortSignal(signal), signal)
    for (const item of items) {
      const grupo = porSeccion.get(item.seccion_id) ?? []
      grupo.push(item)
      porSeccion.set(item.seccion_id, grupo)
    }
  }
  return secciones.map(seccion => ({ ...seccion, items: porSeccion.get(seccion.id) ?? [] }))
}

export interface ItemPautaBorrador {
  descripcion: string
  instrucciones: string
  obligatorio: boolean
  permite_no_aplica: boolean
}
export interface SeccionPautaBorrador {
  nombre: string
  descripcion: string
  items: ItemPautaBorrador[]
}
export interface PautaBorrador {
  nombre: string
  categoria_id: string
  descripcion: string
  activo: boolean
  secciones: SeccionPautaBorrador[]
}
export type AccionPauta = 'crear' | 'editar' | 'eliminar'

export async function gestionarPauta(
  accion: AccionPauta,
  id: string | null,
  datos: PautaBorrador | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('gestionar_pauta', {
    p_accion: accion, p_id: id, p_datos: datos,
  })
  if (error?.code === 'P0001' || error?.code === '42501') throw new Error(error.message)
  if (error?.code === '23503') throw new Error('Hay registros asociados o una categoría ya no existe.')
  if (error || typeof data !== 'string') {
    throw new Error('No se pudo confirmar el cambio. Actualiza el listado antes de volver a intentarlo.')
  }
  return data
}
