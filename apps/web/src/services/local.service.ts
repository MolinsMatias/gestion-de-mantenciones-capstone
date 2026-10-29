import { supabase } from './supabase'
import type { CrearLocalInput, LocalCreado } from '../types/local'

function esLocal(value: unknown): value is LocalCreado {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const dato = value as Record<string, unknown>
  return typeof dato.id === 'string' && typeof dato.nombre === 'string' &&
    typeof dato.prefijo === 'string' && typeof dato.direccion === 'string' &&
    typeof dato.comuna_id === 'string' && typeof dato.activo === 'boolean'
}

export async function crearLocal(input: CrearLocalInput): Promise<LocalCreado> {
  const payload: CrearLocalInput = {
    nombre: input.nombre.trim(),
    prefijo: input.prefijo.trim().toUpperCase(),
    direccion: input.direccion.trim(),
    comuna_id: input.comuna_id,
    activo: input.activo,
  }
  if (!payload.nombre || !payload.direccion || !payload.comuna_id || !payload.prefijo) {
    throw new Error('Completa el nombre, prefijo, dirección y ubicación.')
  }
  if (!/^[A-Z0-9]+$/.test(payload.prefijo)) throw new Error('El prefijo debe contener solamente letras y números.')
  const { data, error } = await supabase.from('local').insert(payload)
    .select('id, nombre, prefijo, direccion, comuna_id, activo').single()
  if (error) {
    if (error.code === '42501') throw new Error('Tu cuenta no tiene permiso para crear locales.')
    if (error.code === '23503') throw new Error('La comuna seleccionada ya no está disponible. Vuelve a cargar la ubicación.')
    if (error.code === '23505') throw new Error('El prefijo u otro dato único ya está registrado.')
    throw new Error('No se pudo confirmar el guardado. Actualiza el monitor antes de reintentar para comprobar si el local quedó creado.')
  }
  const resultado: unknown = data
  if (!esLocal(resultado)) throw new Error('No se pudo confirmar la respuesta. Actualiza el monitor antes de reintentar.')
  return resultado
}
