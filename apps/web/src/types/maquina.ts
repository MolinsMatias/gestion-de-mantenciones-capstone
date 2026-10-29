export interface CatalogoOpcion { id: string; nombre: string }

export interface MaquinaRegistro {
  id: string
  local_id: string
  categoria_id: string
  codigo_interno: string
  nombre: string
  marca_id: string | null
  modelo: string | null
  activo: boolean | null
}

export interface MaquinaDetalle extends MaquinaRegistro {
  localNombre: string
  categoriaNombre: string
  marcaNombre: string
}

export interface CatalogoMaquinas {
  maquinas: MaquinaDetalle[]
  locales: CatalogoOpcion[]
  categorias: CatalogoOpcion[]
}
