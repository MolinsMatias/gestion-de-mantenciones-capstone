import type { UbicacionOpcion } from './ubicaciones'
export interface LocalRegistro {
  id: string
  nombre: string
  direccion: string | null
  prefijo: string | null
  comuna_id: string | null
  activo: boolean | null
  created_at: string | null
}
export interface LocalDetalle extends LocalRegistro {
  pais: UbicacionOpcion | null
  region: UbicacionOpcion | null
  comuna: UbicacionOpcion | null
}
export interface EditarLocalInput {
  nombre: string
  direccion: string
  comuna_id: string
  activo: boolean
}
