import { supabase } from './supabase'

export type AccionLocal = 'suspender' | 'reabrir' | 'cerrar'

export async function gestionarEstadoLocal(accion: AccionLocal, id: string): Promise<void> {
  const { data, error } = await supabase.rpc('gestionar_estado_local', { p_accion: accion, p_id: id })
  if (error) throw new Error(error.message)
  if (data !== id) throw new Error('No se pudo confirmar el cambio del local.')
}

export async function obtenerMaquinasPendientes(id: string) {
  const limite = 100
  const filas: { id: string; nombre: string; codigo_interno: string }[] = []
  for (let desde = 0; ; desde += limite) {
    const { data, error } = await supabase.rpc('maquinas_pendientes_cierre', { p_id: id })
      .order('nombre').order('id').range(desde, desde + limite - 1)
    if (error) throw new Error(error.message)
    filas.push(...data)
    if (data.length < limite) return filas
  }
}
