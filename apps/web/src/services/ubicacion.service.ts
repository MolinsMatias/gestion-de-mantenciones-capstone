import { supabase } from './supabase'
import type { PaisOpcion, RegionOpcion, ComunaOpcion, UbicacionOpcion } from '../types/ubicaciones'

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function esOpcion(value: unknown): value is UbicacionOpcion {
  return esObjeto(value) && typeof value.id === 'string' && typeof value.nombre === 'string'
}
function esRegion(value: unknown): value is RegionOpcion {
  return esOpcion(value) && 'pais_id' in value && typeof value.pais_id === 'string'
}
function esComuna(value: unknown): value is ComunaOpcion {
  return esOpcion(value) && 'region_id' in value && typeof value.region_id === 'string'
}

async function leerCatalogo<T>(
  tabla: 'pais' | 'region' | 'comuna', columnas: string,
  validar: (value: unknown) => value is T, signal: AbortSignal,
  filtro?: { columna: 'pais_id' | 'region_id'; valor: string },
): Promise<T[]> {
  const resultado: T[] = []
  const tamanio = 500
  for (let desde = 0; ; desde += tamanio) {
    signal.throwIfAborted()
    let consulta = supabase.from(tabla).select(columnas).order('id')
      .range(desde, desde + tamanio - 1)
    if (filtro) consulta = consulta.eq(filtro.columna, filtro.valor)
    const { data, error } = await consulta.abortSignal(signal)
    if (error) throw new Error('No se pudo cargar la ubicación. Revisa tu conexión y permisos.')
    const pagina: unknown = data
    if (!Array.isArray(pagina) || !pagina.every(validar)) throw new Error('El catálogo devolvió una respuesta no válida.')
    resultado.push(...pagina)
    if (pagina.length < tamanio) return resultado
  }
}
const ordenar = <T extends UbicacionOpcion>(datos: T[]) =>
  datos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

export async function obtenerPaises(signal: AbortSignal): Promise<PaisOpcion[]> {
  return ordenar(await leerCatalogo('pais', 'id, nombre', esOpcion, signal))
}
export async function obtenerRegiones(paisId: string, signal: AbortSignal): Promise<RegionOpcion[]> {
  if (!paisId) return []
  return ordenar(await leerCatalogo('region', 'id, nombre, pais_id', esRegion, signal,
    { columna: 'pais_id', valor: paisId }))
}
export async function obtenerComunas(regionId: string, signal: AbortSignal): Promise<ComunaOpcion[]> {
  if (!regionId) return []
  return ordenar(await leerCatalogo('comuna', 'id, nombre, region_id', esComuna, signal,
    { columna: 'region_id', valor: regionId }))
}
