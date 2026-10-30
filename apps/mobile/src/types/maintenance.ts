import type { MaintenanceType, FinalMachineStatus } from '@/types/checklist';

export interface MaintenanceItem {
  id: string;
  titulo: string;
  categoria: string;
  ubicacion: string;
  etiqueta_tiempo: string;
  estado_equipo_final?: FinalMachineStatus;
  tipo_icono: 'wrench' | 'zap' | 'settings' | 'completed';
}

export interface HistoryRecord extends MaintenanceItem {
  codigo_interno: string;
  tipo: MaintenanceType;
  iniciada_at: string;
  finalizada_at: string | null;
  enviada_at: string;
  trabajos_realizados: string;
  estado_equipo_final: FinalMachineStatus;
  requiere_repuestos: boolean;
  detalle_repuestos: string | null;
  pendientes: string | null;
  observaciones: string | null;
}
export interface HistoryQuery {
  userId: string;
  localId: string;
  categoryId: string;
  type: MaintenanceType | 'all';
  search: string;
  completedFrom?: string;
  completedBefore?: string;
}
export interface HistoryPage {
  items: HistoryRecord[];
  totalCount: number;
  hasMore: boolean;
}
