import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface DatosTecnico {
  nombre: string
  segundo_nombre: string
  apellido_paterno: string
  apellido_materno: string
}
export interface TecnicoListado extends Omit<DatosTecnico, 'segundo_nombre' | 'apellido_materno'> {
  id: string
  primer_nombre: string
  segundo_nombre: string | null
  apellido_materno: string | null
  activo: boolean | null
  created_at: string | null
}
export interface TecnicosPagina { filas: TecnicoListado[]; total: number; pagina: number }

export async function listarTecnicos(
  filtros: { busqueda: string; estado: '' | 'activo' | 'inactivo'; pagina: number },
  signal: AbortSignal,
): Promise<TecnicosPagina> {
  const { data, error } = await supabase.rpc('listar_tecnicos_panel', {
    p_busqueda: filtros.busqueda,
    p_activo: filtros.estado ? filtros.estado === 'activo' : null,
    p_pagina: filtros.pagina,
  }).abortSignal(signal)
  if (error) throw new Error(error.message)
  if (!data || !Array.isArray(data.filas) || typeof data.total !== 'number' || typeof data.pagina !== 'number') {
    throw new Error('El servidor devolvió un listado no válido.')
  }
  return data as TecnicosPagina
}

export async function crearTecnico(datos: DatosTecnico & { run: string; email: string; password: string }) {
  const { data, error } = await supabase.functions.invoke('crear-tecnico', { body: datos })
  if (error instanceof FunctionsHttpError) {
    const respuesta = await error.context.json().catch(() => null)
    if (typeof respuesta?.error === 'string') throw new Error(respuesta.error)
  }
  if (error || typeof data?.id !== 'string') throw new Error('No se pudo confirmar la creación.')
}

export async function gestionarPerfilTecnico(id: string, accion: 'editar' | 'deshabilitar', datos?: DatosTecnico) {
  const { data, error } = await supabase.rpc('gestionar_perfil_tecnico', {
    p_id: id, p_accion: accion, p_datos: datos ?? {},
  })
  if (error?.code === 'P0001' || error?.code === '42501') throw new Error(error.message)
  if (error || data !== id) throw new Error('No se pudo confirmar el cambio del técnico.')
}
