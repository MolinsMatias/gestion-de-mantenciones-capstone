import { supabase } from './supabase'

export async function retirarRegistro(tipo: 'local' | 'maquina', id: string): Promise<void> {
  const { data, error } = await supabase.rpc('retirar_registro_catalogo', {
    p_tipo: tipo,
    p_id: id,
  })

  if (error?.code === 'P0001' || error?.code === '42501') throw new Error(error.message)
  if (error || data !== id) {
    throw new Error('No se pudo confirmar el retiro. Actualiza el catálogo antes de reintentar.')
  }
}
