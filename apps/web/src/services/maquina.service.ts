import { supabase } from './supabase'
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
    const { data, error } = await supabase.from(tabla).select(columnas)
      .order('id').range(desde, desde + tamanio - 1).abortSignal(signal)
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
