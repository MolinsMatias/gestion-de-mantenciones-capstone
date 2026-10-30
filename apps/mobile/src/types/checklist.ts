export type ItemResult = 'conforme' | 'no_conforme' | 'no_aplica';

export type MaintenanceType = 'preventiva' | 'correctiva' | 'inspeccion';

export type FinalMachineStatus = 'operativa' | 'operativa_con_observaciones' | 'fuera_de_servicio';

export interface ChecklistItem {
  id: string;
  seccion_id: string;
  descripcion: string;
  instrucciones: string | null;
  obligatorio: boolean;
  permite_no_aplica: boolean;
  orden: number;
}

export interface ChecklistSection {
  id: string;
  pauta_id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  items: ChecklistItem[];
}

export interface Checklist {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  activo: boolean;
  created_at: string;
  secciones: ChecklistSection[];
}

export interface ItemAnswer {
  item_id: string;
  resultado: ItemResult | null;
  observaciones: string;
}

export interface MaintenanceDraft {
  mantencion_id: string;
  maquina_id: string;
  pauta_id: string;
  local_id: string;
  tipo: MaintenanceType;
  iniciada_at: string;
  respuestas: Record<string, ItemAnswer>;
  trabajos_realizados: string;
  estado_equipo_final: FinalMachineStatus;
  requiere_repuestos: boolean;
  detalle_repuestos: string;
  pendientes: string;
  observaciones: string;
}

export interface SubmitMaintenanceResult {
  exito: boolean;
  mantencion_id: string;
  guardado_offline: boolean;
  mensaje: string;
}
