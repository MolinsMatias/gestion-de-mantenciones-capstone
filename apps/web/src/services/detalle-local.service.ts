import { supabase } from './supabase'
import type { EditarLocalInput, LocalDetalle, LocalRegistro } from '../types/detalle-local'

const columnas = 'id, nombre, direccion, prefijo, comuna_id, activo, created_at'
const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const textoONulo = (v: unknown) => v === null || typeof v === 'string'
function esLocal(v: unknown): v is LocalRegistro {
  return objeto(v) && typeof v.id === 'string' && typeof v.nombre === 'string' &&
    textoONulo(v.direccion) && textoONulo(v.prefijo) && textoONulo(v.comuna_id) &&
    textoONulo(v.created_at) && (v.activo === null || typeof v.activo === 'boolean')
}
async function leerUbicacion(tabla: 'pais' | 'region' | 'comuna', id: string, padre: 'pais_id' | 'region_id' | null, signal: AbortSignal) {
  const { data, error } = await supabase.from(tabla).select(padre ? `id, nombre, ${padre}` : 'id, nombre')
    .eq('id', id).abortSignal(signal).maybeSingle()
  if (error) throw new Error('No se pudo consultar la ubicación del local.')
  const v: unknown = data
  if (v === null) return null
  if (!objeto(v) || typeof v.id !== 'string' || typeof v.nombre !== 'string' ||
    (padre && typeof v[padre] !== 'string')) throw new Error('La ubicación recibida no es válida.')
  return { id: v.id, nombre: v.nombre, padreId: padre ? v[padre] as string : null }
}
export async function obtenerDetalleLocal(id: string, signal: AbortSignal): Promise<LocalDetalle> {
  const { data, error } = await supabase.from('local').select(columnas).eq('id', id).abortSignal(signal).maybeSingle()
  if (error) throw new Error('No se pudo cargar el local. Revisa tu conexión y permisos.')
  if (data === null) throw new Error('El local ya no está disponible o no tienes acceso.')
  if (!esLocal(data)) throw new Error('Los datos recibidos del local no son válidos.')
  const comuna = data.comuna_id ? await leerUbicacion('comuna', data.comuna_id, 'region_id', signal) : null
  const region = comuna?.padreId ? await leerUbicacion('region', comuna.padreId, 'pais_id', signal) : null
  const pais = region?.padreId ? await leerUbicacion('pais', region.padreId, null, signal) : null
  return { ...data, comuna, region, pais }
}
export async function actualizarLocal(original: LocalRegistro, input: EditarLocalInput): Promise<LocalRegistro> {
  const payload = { nombre: input.nombre.trim(), direccion: input.direccion.trim(), comuna_id: input.comuna_id, activo: input.activo }
  if (!payload.nombre || !payload.direccion || !payload.comuna_id || typeof payload.activo !== 'boolean') {
    throw new Error('Completa el nombre, la dirección y la ubicación.')
  }
  // Guarda solo si los campos siguen como cuando abrimos la ficha.
  let consulta = supabase.from('local').update(payload).eq('id', original.id).eq('nombre', original.nombre)
  for (const campo of ['direccion', 'comuna_id', 'activo', 'prefijo'] as const) {
    const valor = original[campo]
    consulta = valor === null ? consulta.is(campo, null) : consulta.eq(campo, valor)
  }
  const { data, error } = await consulta.select(columnas).maybeSingle()
  if (error) {
    if (error.code === '42501') throw new Error('Tu cuenta no tiene permiso para editar locales.')
    if (error.code === '23503') throw new Error('La comuna seleccionada ya no está disponible. Recarga la ficha.')
    throw new Error('No se pudo confirmar el guardado. Cancela la edición y recarga la ficha para revisar los datos antes de reintentar.')
  }
  if (data === null) throw new Error('El local cambió, ya no existe o no tienes permiso. Cancela la edición y recarga la ficha.')
  if (!esLocal(data)) throw new Error('No se pudo confirmar la respuesta. Cancela la edición y recarga antes de reintentar.')
  return data
}
