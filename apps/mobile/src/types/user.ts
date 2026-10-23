export interface UserRole {
  id: string;
  nombre: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  run: number;
  dv: string;
  nombre: string;
  segundo_nombre: string | null;
  apellido_paterno: string;
  apellido_materno: string | null;
  rol_id: string;
  rol?: UserRole | null;
  activo: boolean;
  created_at?: string;
}
