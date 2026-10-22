export interface UserProfile {
  id: string;
  run: number;
  dv: string;
  nombre: string;
  segundo_nombre: string | null;
  apellido_paterno: string;
  apellido_materno: string | null;
  rol_id: number | string;
  activo: boolean;
  created_at?: string;
}
