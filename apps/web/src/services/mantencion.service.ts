import { supabase } from './supabase'

interface Mantencion {
  id: string
  local_id: string | null
  maquina_id: string | null
  tipo: string | null
  tecnico_id: string | null
  estado: string | null
  estado_equipo_final: string | null
  recibida_at: string | null
  finalizada_at: string | null
}
export interface LocalMantencion { id: string; nombre: string }
export interface MaquinaMantencion { id: string; nombre: string; codigo_interno: string }
export interface FilaMantencion extends Mantencion {
  local: LocalMantencion | null
  maquina: MaquinaMantencion | null
  tecnico: string | null
}

export const POR_PAGINA = 20

export async function obtenerLocalesMantenciones(signal: AbortSignal): Promise<LocalMantencion[]> {
  const locales: LocalMantencion[] = []
  const limite = 100
  for (let desde = 0; ; desde += limite) {
    signal.throwIfAborted()
    const { data, error } = await supabase.from('local').select('id,nombre')
      .order('nombre').order('id').range(desde, desde + limite - 1).abortSignal(signal)
    if (error) throw error
    locales.push(...data)
    if (data.length < limite) return locales
  }
}

export async function obtenerMaquinasMantenciones(signal: AbortSignal): Promise<MaquinaMantencion[]> {
  // El historial incluye máquinas retiradas y máquinas que cambiaron de local.
  return leerDetallePaginado<MaquinaMantencion>((desde, hasta) => supabase.from('maquina')
    .select('id,nombre,codigo_interno').order('nombre').order('codigo_interno').order('id')
    .range(desde, hasta).abortSignal(signal))
}

export async function obtenerMaquinasDelHistorialLocal(localId: string, signal: AbortSignal): Promise<Set<string>> {
  const filas = await leerDetallePaginado<{ maquina_id: string }>((desde, hasta) => supabase.from('mantencion')
    .select('maquina_id')
    .eq('local_id', localId).eq('estado', 'enviada')
    .not('finalizada_at', 'is', null).not('maquina_id', 'is', null)
    .order('id').range(desde, hasta).abortSignal(signal))
  return new Set(filas.map(fila => fila.maquina_id))
}

export async function obtenerMantenciones(
  filtros: { pagina: number; localId: string; maquinaId?: string; tipo: string, estado: string, tecnicoId?: string },
  locales: LocalMantencion[],
  signal: AbortSignal,
): Promise<{ filas: FilaMantencion[]; total: number }> {
  const desde = (filtros.pagina - 1) * POR_PAGINA
  let consulta = supabase.from('mantencion')
    .select('id,local_id,maquina_id,tipo,tecnico_id,estado,estado_equipo_final,recibida_at,finalizada_at', { count: 'exact' })
    .eq('estado', 'enviada').not('finalizada_at', 'is', null)
  if (filtros.localId) consulta = consulta.eq('local_id', filtros.localId)
  if (filtros.maquinaId) consulta = consulta.eq('maquina_id', filtros.maquinaId)
  if (filtros.tecnicoId) { consulta = consulta.eq('tecnico_id', filtros.tecnicoId) }
  if (filtros.tipo) consulta = consulta.eq('tipo', filtros.tipo)
  if (filtros.estado) consulta = consulta.eq('estado_equipo_final', filtros.estado)
  const { data, count, error } = await consulta
    .order('finalizada_at', { ascending: false }).order('id', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1).abortSignal(signal)
  if (error) throw error

  const registros = data as Mantencion[]
  const ids = [...new Set(registros.flatMap(fila => fila.maquina_id ? [fila.maquina_id] : []))]
  const maquinas = new Map<string, MaquinaMantencion>()
  if (ids.length) {
    const resultado = await supabase.from('maquina').select('id,nombre,codigo_interno')
      .in('id', ids).abortSignal(signal)
    if (resultado.error) throw resultado.error
    for (const maquina of resultado.data) maquinas.set(maquina.id, maquina)
  }
  const idsTecnicos = [...new Set(
    registros.map(fila => fila.tecnico_id).filter((id): id is string => Boolean(id)),
  )]
  const tecnicosPorId = new Map<string, string>()

  if (idsTecnicos.length) {
    const { data: tecnicos, error: errorTecnicos } = await supabase
      .from('usuario')
      .select('id,nombre,segundo_nombre,apellido_paterno,apellido_materno')
      .in('id', idsTecnicos)
      .abortSignal(signal)

    if (errorTecnicos) throw errorTecnicos

    for (const tecnico of tecnicos ?? []) {
      const nombre = [
        tecnico.nombre,
        tecnico.segundo_nombre,
        tecnico.apellido_paterno,
        tecnico.apellido_materno,
      ].map(parte => parte?.trim()).filter(Boolean).join(' ')

      if (nombre) tecnicosPorId.set(tecnico.id, nombre)
    }
  }
  const localesPorId = new Map(locales.map(local => [local.id, local]))
  return {
    total: count ?? 0,
    filas: registros.map(fila => ({
      ...fila,
      local: localesPorId.get(fila.local_id ?? '') ?? null,
      maquina: maquinas.get(fila.maquina_id ?? '') ?? null,
      tecnico: tecnicosPorId.get(fila.tecnico_id ?? '') ?? null,
    })),
  }
}

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago',
})

export function fechaMantencion(valor: string | null): string {
  const fecha = valor ? new Date(valor) : null
  return fecha && Number.isFinite(fecha.getTime()) ? formatoFecha.format(fecha) : 'Sin fecha'
}

export function etiquetaMantencion(valor: string | null): string {
  if (!valor) return 'Sin registro'
  if (valor === 'inspeccion') return 'Inspección'
  return valor.replace(/_/g, ' ').replace(/^./, letra => letra.toUpperCase())
}


export interface EvidenciaMantencion {
  id: string
  respuesta_item_id: string | null
  archivo_path: string | null
  descripcion: string | null
  created_at: string | null
}

async function leerDetallePaginado<T>(
  consultar: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += 100) {
    const { data, error } = await consultar(desde, desde + 99)
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < 100) return filas
  }
}

export async function obtenerDetalleMantencion(id: string, signal: AbortSignal) {
  const { data: registro, error } = await supabase.from('mantencion')
    .select('id,pauta_id,tecnico_id,iniciada_at,enviada_at,recibida_at,finalizada_at,falla_reportada,trabajos_realizados,requiere_repuestos,detalle_repuestos,pendientes,observaciones')
    .eq('id', id).eq('estado', 'enviada').not('finalizada_at', 'is', null)
    .abortSignal(signal).single()
  if (error) throw error

  const [pauta, tecnico, respuestas, evidencias] = await Promise.all([
    registro.pauta_id ? supabase.from('pauta').select('nombre,version')
      .eq('id', registro.pauta_id).abortSignal(signal).maybeSingle() : null,
    registro.tecnico_id ? supabase.from('usuario').select('nombre,segundo_nombre,apellido_paterno,apellido_materno')
      .eq('id', registro.tecnico_id).abortSignal(signal).maybeSingle() : null,
    leerDetallePaginado((desde, hasta) => supabase.from('respuesta_item')
      .select('id,item_id,resultado,observaciones,created_at').eq('mantencion_id', id)
      .order('created_at').order('id').range(desde, hasta).abortSignal(signal)),
    leerDetallePaginado<EvidenciaMantencion>((desde, hasta) => supabase.from('evidencia')
      .select('id,respuesta_item_id,archivo_path,descripcion,created_at').eq('mantencion_id', id)
      .order('created_at').order('id').range(desde, hasta).abortSignal(signal)),
  ])
  const items = new Map<string, string>()
  const ids = [...new Set(respuestas.map(respuesta => respuesta.item_id as string).filter(Boolean))]
  for (let i = 0; i < ids.length; i += 100) {
    signal.throwIfAborted()
    const resultado = await supabase.from('item_pauta').select('id,descripcion')
      .in('id', ids.slice(i, i + 100)).abortSignal(signal)
    if (resultado.error) throw resultado.error
    for (const item of resultado.data) items.set(item.id, item.descripcion)
  }

  const persona = tecnico?.data
  const nombreTecnico = persona
    ? [persona.nombre, persona.segundo_nombre, persona.apellido_paterno, persona.apellido_materno]
      .filter(Boolean).join(' ')
    : null
  return {
    registro,
    pauta: pauta?.data ?? null,
    nombreTecnico,
    respuestas: respuestas.map(respuesta => ({
      ...respuesta,
      pregunta: items.get(respuesta.item_id) ?? 'Ítem no disponible',
    })),
    evidencias,
  }
}

const bucketEvidencias = (import.meta.env.VITE_SUPABASE_EVIDENCIAS_BUCKET as string | undefined)?.trim()
export const puedeAbrirEvidencias = Boolean(bucketEvidencias)

export async function obtenerEnlaceEvidencia(ruta: string): Promise<string> {
  if (!bucketEvidencias) throw new Error('Bucket de evidencias no configurado.')
  const { data, error } = await supabase.storage.from(bucketEvidencias).createSignedUrl(ruta, 60)
  if (error) throw error
  return data.signedUrl
}
export async function obtenerTecnicosMantenciones(signal: AbortSignal) {
  const registros = await leerDetallePaginado<{ tecnico_id: string }>(
    (desde, hasta) => supabase
      .from('mantencion')
      .select('tecnico_id')
      .eq('estado', 'enviada')
      .not('finalizada_at', 'is', null)
      .not('tecnico_id', 'is', null)
      .order('id')
      .range(desde, hasta)
      .abortSignal(signal),
  )

  const ids = [...new Set(registros.map(fila => fila.tecnico_id))]
  const opciones: { id: string; nombre: string }[] = []

  for (let desde = 0; desde < ids.length; desde += 100) {
    const { data, error } = await supabase
      .from('usuario')
      .select('id,nombre,segundo_nombre,apellido_paterno,apellido_materno')
      .in('id', ids.slice(desde, desde + 100))
      .abortSignal(signal)

    if (error) throw error

    for (const usuario of data ?? []) {
      const nombre = [
        usuario.nombre,
        usuario.segundo_nombre,
        usuario.apellido_paterno,
        usuario.apellido_materno,
      ].map(parte => parte?.trim()).filter(Boolean).join(' ')

      if (nombre) opciones.push({ id: usuario.id, nombre })
    }
  }

  return opciones.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'))
}