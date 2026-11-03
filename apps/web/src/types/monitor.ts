export interface LocalMonitor {
  id: string
  nombre: string
  direccion: string | null
  activo: boolean | null
  ultima_recibida_at: string | null
}

export interface MaquinaMonitor {
  id: string
  local_id: string
  activo: boolean | null
  nombre: string
  codigo_interno: string
}

export interface ResumenLocal extends LocalMonitor {
  total: number
  activas: number
}

export interface IndicadoresMonitor {
  maquinas_operativas: number
  inspecciones_hoy: number
  fecha_chile: string
}

export interface DatosMonitor {
  locales: LocalMonitor[]
  maquinas: MaquinaMonitor[]
  indicadores: IndicadoresMonitor
}
