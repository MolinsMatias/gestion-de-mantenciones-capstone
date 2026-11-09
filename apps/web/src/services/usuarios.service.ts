import { supabase } from './supabase'

export interface UsuarioListado {
  id: string
  nombre: string
  rol: string | null
  activo: boolean | null
  created_at: string | null
}
export interface UsuariosPagina {
  filas: UsuarioListado[]
  roles: { id: string; nombre: string }[]
  total: number
  pagina: number
}

export async function listarUsuarios(
  filtros: { busqueda: string; rol: string; estado: '' | 'activo' | 'inactivo'; pagina: number },
  signal: AbortSignal,
): Promise<UsuariosPagina> {
  const { data, error } = await supabase.rpc('listar_usuarios_panel', {
    p_busqueda: filtros.busqueda,
    p_rol: filtros.rol || null,
    p_activo: filtros.estado ? filtros.estado === 'activo' : null,
    p_pagina: filtros.pagina,
  }).abortSignal(signal)
  if (error) throw new Error(error.message)
  if (!data || !Array.isArray(data.filas) || !Array.isArray(data.roles)
    || typeof data.total !== 'number' || typeof data.pagina !== 'number') {
    throw new Error('El servidor devolvió un listado no válido.')
  }
  return data as UsuariosPagina
}
