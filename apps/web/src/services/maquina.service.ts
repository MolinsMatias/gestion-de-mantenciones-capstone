import { supabase } from './supabase'
import { retirarRegistro } from './retiro-catalogo.service'
import type { CatalogoMaquinas, CatalogoOpcion, MaquinaRegistro } from '../types/maquina'

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function esOpcion(value: unknown): value is CatalogoOpcion {
  return esObjeto(value) && typeof value.id === 'string' && typeof value.nombre === 'string'
}
function esTextoONulo(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}
function esMaquina(value: unknown): value is MaquinaRegistro {
  return esObjeto(value) && typeof value.id === 'string' &&
    typeof value.local_id === 'string' && typeof value.categoria_id === 'string' &&
    typeof value.codigo_interno === 'string' && typeof value.nombre === 'string' &&
    esTextoONulo(value.marca_id) && esTextoONulo(value.modelo) &&
    (typeof value.activo === 'boolean' || value.activo === null)
}

async function obtenerPaginas<T>(
  tabla: 'maquina' | 'local' | 'categoria_maquina' | 'marca',
  columnas: string,
  validar: (value: unknown) => value is T,
  signal: AbortSignal,
): Promise<T[]> {
  const registros: T[] = []
  const tamanio = 500
  let desde = 0
  while (true) {
    signal.throwIfAborted()
    let consulta = supabase.from(tabla).select(columnas)
    if (tabla === 'maquina') consulta = consulta.is('eliminado_at', null)
    const { data, error } = await consulta.order('id').range(desde, desde + tamanio - 1).abortSignal(signal)
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

export async function obtenerCatalogoMaquinas(signal: AbortSignal): Promise<CatalogoMaquinas> {
  const [maquinas, locales, categorias, marcas] = await Promise.all([
    obtenerPaginas('maquina', 'id, local_id, categoria_id, codigo_interno, nombre, marca_id, modelo, activo', esMaquina, signal),
    obtenerPaginas('local', 'id, nombre', esOpcion, signal),
    obtenerPaginas('categoria_maquina', 'id, nombre', esOpcion, signal),
    obtenerPaginas('marca', 'id, nombre', esOpcion, signal),
  ])
  const porNombre = (a: CatalogoOpcion, b: CatalogoOpcion) => a.nombre.localeCompare(b.nombre, 'es')
  const localesPorId = new Map(locales.map(local => [local.id, local.nombre]))
  const categoriasPorId = new Map(categorias.map(categoria => [categoria.id, categoria.nombre]))
  const marcasPorId = new Map(marcas.map(marca => [marca.id, marca.nombre]))
  return {
    locales: locales.sort(porNombre),
    categorias: categorias.sort(porNombre),
    maquinas: maquinas.map(maquina => ({
      ...maquina,
      localNombre: localesPorId.get(maquina.local_id) ?? 'Local no disponible',
      categoriaNombre: categoriasPorId.get(maquina.categoria_id) ?? 'Categoría no disponible',
      marcaNombre: maquina.marca_id ? marcasPorId.get(maquina.marca_id) ?? 'Marca no disponible' : 'Sin marca',
    })).sort(porNombre),
  }
}

export async function reasignarMaquina(
  maquinaId: string,
  localOrigenId: string,
  localDestinoId: string,
): Promise<void> {
  if (!localDestinoId || localDestinoId === localOrigenId) {
    throw new Error('Selecciona un local distinto al actual.')
  }

  const { data, error } = await supabase
    .from('maquina')
    .update({ local_id: localDestinoId })
    .eq('id', maquinaId)
    .eq('local_id', localOrigenId)
    .select('id')
    .maybeSingle()

  if (error?.code === '23503') {
    throw new Error('El local de destino ya no está disponible.')
  }

  if (error) {
    throw new Error('No se pudo confirmar el traslado. Actualiza el catálogo antes de reintentar.')
  }

  if (!data) {
    throw new Error('La ubicación cambió o no tienes permiso. Actualiza el catálogo.')
  }
}

export interface CambiosMaquina {
  nombre: string
  categoria_id: string
  marca_id: string | null
  modelo: string | null
  activo: boolean | null
}

export async function actualizarMaquina(id: string, cambios: CambiosMaquina): Promise<void> {
  const nombre = cambios.nombre.trim()

  if (!nombre || !cambios.categoria_id) {
    throw new Error('El nombre y la categoría son obligatorios.')
  }

  const { data, error } = await supabase
    .from('maquina')
    .update({
      nombre,
      categoria_id: cambios.categoria_id,
      marca_id: cambios.marca_id || null,
      modelo: cambios.modelo?.trim() || null,
      activo: cambios.activo,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error?.code === '23503') {
    throw new Error('La categoría o la marca seleccionada ya no está disponible.')
  }
  if (error) {
    throw new Error('No se pudo confirmar el guardado. Actualiza el catálogo y revisa la ficha.')
  }
  if (!data) {
    throw new Error('La máquina ya no está disponible o no tienes permiso para editarla.')
  }
}

export async function retirarMaquina(id: string): Promise<void> {
  await retirarRegistro('maquina', id)
}

export async function eliminarMaquina(id: string): Promise<void> {
  await retirarRegistro('maquina', id)
}

export async function cambiarEstadoMaquina(id: string, activo: boolean): Promise<void> {
  const { data, error } = await supabase.rpc('cambiar_estado_maquina', { p_id: id, p_activo: activo })
  if (error?.code === 'P0001' || error?.code === '42501') throw new Error(error.message)
  if (error || data !== id) throw new Error('No se pudo confirmar el cambio de estado. Actualiza el inventario.')
}
