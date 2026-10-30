export type MachineStatus = 'operativa' | 'operativa_con_observaciones' | 'fuera_de_servicio';

export type MachineStatusFilter = 'all' | MachineStatus;

export interface MachineCategory {
  id: string;
  nombre: string;
}

export interface MachineBrand {
  id: string;
  nombre: string;
}

export interface Machine {
  id: string;
  local_id: string;
  categoria_id: string;
  codigo_interno: string;
  nombre: string;
  marca_id: string | null;
  modelo: string | null;
  foto_path: string | null;
  foto_url: string | null;
  activo: boolean;
  created_at: string;
  categoria: MachineCategory;
  marca: MachineBrand | null;
  estado_equipo: MachineStatus;
  ultima_mantencion_at: string | null;
}

export interface FetchMachinesParams {
  localId?: string;
  categoryId?: string;
  searchQuery?: string;
  statusFilter?: MachineStatusFilter;
  offset?: number;
  limit?: number;
}

export interface PaginatedMachinesResult {
  items: Machine[];
  totalCount: number;
  hasMore: boolean;
  isFromCache?: boolean;
}

export type QrMachineResolutionStatus = 'found' | 'not_found' | 'invalid_qr';

export interface QrMachineResolutionResult {
  estado_resolucion: QrMachineResolutionStatus;
  maquina: Machine | null;
  uuid_detectado: string | null;
  desde_cache: boolean;
}
