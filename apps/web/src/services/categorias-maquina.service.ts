import { supabase } from './supabase'

export interface CategoriaGestion {
  id: string
  nombre: string
  archivada_at: string | null
  maquinas: number
  pautas: number
}

export type AccionCategoria = 'crear' | 'renombrar' | 'archivar' | 'reactivar'

export async function listarCategoriasGestion(signal: AbortSignal): Promise<CategoriaGestion[]> {
  const filas: CategoriaGestion[] = []
  const limite = 100
  for (let desde = 0; ; desde += limite) {
    signal.throwIfAborted()
    const { data, error } = await supabase.rpc('listar_categorias_gestion')
      .order('nombre').order('id').range(desde, desde + limite - 1).abortSignal(signal)
    if (error) throw new Error(error.message)
    filas.push(...data)
    if (data.length < limite) return filas
  }
}

export async function gestionarCategoria(accion: AccionCategoria, id: string | null, nombre: string | null): Promise<void> {
  const { data, error } = await supabase.rpc('gestionar_categoria_maquina', { p_accion: accion, p_id: id, p_nombre: nombre })
  if (error?.code === '23505') throw new Error('Ya existe una categoría con ese nombre.')
  if (error) throw new Error(error.message)
  if (typeof data !== 'string') throw new Error('No se pudo confirmar el cambio. Recarga las categorías.')
}
