import { supabase } from './supabase'
import type { FiltrosHistorial, HistorialExportacion } from '../types/exportacion'

export async function obtenerHistorialExportacion(filtros: FiltrosHistorial, signal: AbortSignal): Promise<HistorialExportacion> {
  const { data, error } = await supabase.rpc('exportar_historial_mantenciones', {
    p_local: filtros.localId || null,
    p_maquina: filtros.maquinaId || null,
    p_tipo: filtros.tipo,
    p_estado: filtros.estado,
    p_tecnico: filtros.tecnicoId || null,
    p_mes: filtros.mes ? `${filtros.mes}-01` : null,
  }).abortSignal(signal)
  if (error?.code === 'P0001' || error?.code === '42501') throw new Error(error.message)
  if (error || !data || !Array.isArray(data.registros) || typeof data.generado_at !== 'string') {
    throw new Error('No se pudo obtener el historial completo. No se descargó un archivo parcial.')
  }
  return data as HistorialExportacion
}
