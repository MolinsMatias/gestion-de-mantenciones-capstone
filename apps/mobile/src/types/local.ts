export interface Local {
  id: string;
  nombre: string;
  direccion: string;
  comuna_id: string;
  comuna_nombre: string;
  region_nombre: string | null;
  activo: boolean;
  total_maquinas: number;
  maquinas_operativas: number;
  maquinas_con_observaciones: number;
  maquinas_fuera_de_servicio: number;
}
