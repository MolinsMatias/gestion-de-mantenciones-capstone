export interface ComunaOpcion {
  id: string
  nombre: string
}

export interface CrearLocalInput {
  nombre: string
  direccion: string
  comuna_id: string
  activo: boolean
}

export interface LocalCreado extends CrearLocalInput {
  id: string
}
