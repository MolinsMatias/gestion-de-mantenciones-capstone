export type MachineType = 'all' | 'pinsetter' | 'lanes' | 'ball_return' | 'scoring';

export interface MaintenanceItem {
  id: string;
  titulo: string;
  categoria: string;
  tipo_maquina: MachineType;
  ubicacion: string;
  etiqueta_tiempo: string;
  tipo_icono: 'wrench' | 'zap' | 'settings' | 'completed';
}
