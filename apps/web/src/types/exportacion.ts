export interface FiltrosHistorial {
  localId: string
  maquinaId: string
  tipo: string
  estado: string
  tecnicoId: string
  mes?: string // YYYY-MM, opcional para el informe
}
export interface RespuestaInforme {
  id: string
  item_id: string | null
  seccion: string | null
  item: string | null
  instrucciones: string | null
  resultado: string | null
  observaciones: string | null
}
export interface RegistroInforme {
  id: string
  local_id: string | null
  maquina_id: string | null
  tecnico_id: string | null
  local: string | null
  direccion: string | null
  comuna: string | null
  maquina: string | null
  codigo: string | null
  tecnico: string | null
  pauta_id: string | null
  pauta: string | null
  version: number | null
  tipo: string | null
  estado: string | null
  iniciada_at: string | null
  finalizada_at: string
  enviada_at: string | null
  recibida_at: string | null
  falla_reportada: string | null
  trabajos_realizados: string | null
  requiere_repuestos: boolean | null
  detalle_repuestos: string | null
  pendientes: string | null
  observaciones: string | null
  respuestas: RespuestaInforme[]
}
export interface HistorialExportacion { generado_at: string; registros: RegistroInforme[] }
export interface OpcionesInforme {
  orden: string
  encargado: string
  recomendaciones: string
  conclusiones: string
  responsable: string
}
