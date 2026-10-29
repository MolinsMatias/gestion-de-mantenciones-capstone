export interface CrearLocalInput {
  nombre: string
  prefijo: string
  direccion: string
  comuna_id: string
  activo: boolean
}

export interface LocalCreado extends CrearLocalInput {
  id: string
}
