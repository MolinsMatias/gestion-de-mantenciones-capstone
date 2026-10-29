import type { CatalogoOpcion, MaquinaRegistro } from './maquina'

export interface CrearMaquinaInput {
  nombre: string
  local_id: string
  categoria_id: string
  marca_id: string | null
  modelo: string | null
  activo: boolean
}

export interface OpcionesCrearMaquina {
  locales: CatalogoOpcion[]
  categorias: CatalogoOpcion[]
  marcas: CatalogoOpcion[]
}

export type MaquinaCreada = MaquinaRegistro
