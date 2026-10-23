export type MachineType = 'all' | 'pinsetter' | 'lanes' | 'ball_return' | 'scoring';

export interface MaintenanceItem {
  id: string;
  title: string;
  category: string;
  machineType: MachineType;
  location: string;
  timeLabel: string;
  iconType: 'wrench' | 'zap' | 'settings' | 'completed';
}
