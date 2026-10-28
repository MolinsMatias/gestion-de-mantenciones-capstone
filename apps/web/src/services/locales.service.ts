import { supabase } from './supabase'
import type { ComunaOpcion, CrearLocalInput, LocalCreado } from '../types/local'

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function esComuna(value: unknown): value is ComunaOpcion {
  return esObjeto(value) && typeof value.id === 'string' && typeof value.nombre === 'string'
}

function esLocal(value: unknown): value is LocalCreado {
  return esObjeto(value) && typeof value.id === 'string' &&
    typeof value.nombre === 'string' && typeof value.direccion === 'string' &&
    typeof value.comuna_id === 'string' && typeof value.activo === 'boolean'
}

export async function obtenerComunas(signal: AbortSignal): Promise<ComunaOpcion[]> {
  const comunas: ComunaOpcion[] = []
  const tamanio = 500
  let desde = 0
  while (true) {
    signal.throwIfAborted()
    const { data, error } = await supabase.from('comuna')
      .select('id, nombre').order('id')
      .range(desde, desde + tamanio - 1).abortSignal(signal)
    if (error) throw new Error('No se pudieron cargar las comunas. Revisa tu conexión y permisos.')
    const pagina: unknown = data
    if (!Array.isArray(pagina) || !pagina.every(esComuna)) {
      throw new Error('El catálogo de comunas devolvió una respuesta no válida.')
    }
    comunas.push(...pagina)
    if (pagina.length < tamanio) break
    desde += tamanio
  }
  return comunas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function crearLocal(input: CrearLocalInput): Promise<LocalCreado> {
  const payload: CrearLocalInput = {
    nombre: input.nombre.trim(),
    direccion: input.direccion.trim(),
    comuna_id: input.comuna_id,
    activo: input.activo,
  }
  if (!payload.nombre || !payload.direccion || !payload.comuna_id) {
    throw new Error('Completa el nombre, la dirección y la comuna.')
  }
  const { data, error } = await supabase.from('local').insert(payload)
    .select('id, nombre, direccion, comuna_id, activo').single()
  if (error) {
    if (error.code === '42501') throw new Error('Tu cuenta no tiene permiso para crear locales.')
    if (error.code === '23503') throw new Error('La comuna seleccionada no está disponible. Recarga el listado.')
    if (error.code === '23505') throw new Error('Ya existe un registro con esos datos únicos.')
    throw new Error('No se pudo confirmar la creación. Actualiza el monitor antes de reintentar para comprobar si el local quedó guardado.')
  }
  const resultado: unknown = data
  if (!esLocal(resultado)) {
    throw new Error('El servidor no devolvió el local creado. Actualiza el monitor antes de reintentar.')
  }
  return resultado
}
