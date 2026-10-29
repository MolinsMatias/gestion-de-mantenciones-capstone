import { supabase } from './supabase'
import type { CatalogoOpcion } from '../types/maquina'
import type { CrearMaquinaInput, MaquinaCreada, OpcionesCrearMaquina } from '../types/crear-maquina'

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function esOpcion(value: unknown): value is CatalogoOpcion {
  return esObjeto(value) && typeof value.id === 'string' && typeof value.nombre === 'string'
}
function esTextoONulo(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}
function esMaquina(value: unknown): value is MaquinaCreada {
  return esObjeto(value) && typeof value.id === 'string' && typeof value.nombre === 'string' &&
    typeof value.codigo_interno === 'string' && typeof value.local_id === 'string' &&
    typeof value.categoria_id === 'string' && esTextoONulo(value.marca_id) &&
    esTextoONulo(value.modelo) && typeof value.activo === 'boolean'
}

async function leerOpciones(
  tabla: 'local' | 'categoria_maquina' | 'marca',
  signal: AbortSignal,
): Promise<CatalogoOpcion[]> {
  const resultado: CatalogoOpcion[] = []
  const tamanio = 500
  for (let desde = 0; ; desde += tamanio) {
    signal.throwIfAborted()
    let consulta = supabase.from(tabla).select('id, nombre').order('id')
      .range(desde, desde + tamanio - 1)
    if (tabla !== 'marca') consulta = consulta.eq('activo', true)
    const { data, error } = await consulta.abortSignal(signal)
    if (error) throw new Error('No se pudieron cargar las opciones del formulario. Revisa tu conexión y permisos.')
    const pagina: unknown = data
    if (!Array.isArray(pagina) || !pagina.every(esOpcion)) {
      throw new Error('El servidor devolvió un catálogo no válido.')
    }
    resultado.push(...pagina)
    if (pagina.length < tamanio) break
  }
  return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function obtenerOpcionesCrearMaquina(signal: AbortSignal): Promise<OpcionesCrearMaquina> {
  const [locales, categorias, marcas] = await Promise.all([
    leerOpciones('local', signal),
    leerOpciones('categoria_maquina', signal),
    leerOpciones('marca', signal),
  ])
  return { locales, categorias, marcas }
}

export async function crearMaquina(input: CrearMaquinaInput): Promise<MaquinaCreada> {
  const payload: CrearMaquinaInput = {
    nombre: input.nombre.trim(),
    codigo_interno: input.codigo_interno.trim(),
    local_id: input.local_id,
    categoria_id: input.categoria_id,
    marca_id: input.marca_id || null,
    modelo: input.modelo?.trim() || null,
    activo: input.activo,
  }
  if (!payload.nombre || !payload.codigo_interno || !payload.local_id || !payload.categoria_id) {
    throw new Error('Completa el nombre, el código interno, el local y la categoría.')
  }
  const { data, error } = await supabase.from('maquina').insert(payload)
    .select('id, nombre, codigo_interno, local_id, categoria_id, marca_id, modelo, activo').single()
  if (error) {
    if (error.code === '23505') throw new Error('El código interno ya está registrado. Utiliza otro código.')
    if (error.code === '23503') throw new Error('El local, la categoría o la marca ya no están disponibles. Vuelve a cargar las opciones.')
    if (error.code === '42501') throw new Error('Tu cuenta no tiene permiso para agregar máquinas.')
    throw new Error('No se pudo confirmar el guardado. Actualiza el catálogo antes de reintentar para comprobar si la máquina quedó registrada.')
  }
  const resultado: unknown = data
  if (!esMaquina(resultado)) throw new Error('No se pudo confirmar la respuesta. Actualiza el catálogo antes de reintentar.')
  return resultado
}
