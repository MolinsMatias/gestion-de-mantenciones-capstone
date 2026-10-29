export interface UbicacionOpcion { id: string; nombre: string }
export type PaisOpcion = UbicacionOpcion
export interface RegionOpcion extends UbicacionOpcion { pais_id: string }
export interface ComunaOpcion extends UbicacionOpcion { region_id: string }
