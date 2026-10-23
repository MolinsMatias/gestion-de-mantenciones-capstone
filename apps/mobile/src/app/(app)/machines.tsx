import React from 'react';

import { AppHeader } from '@/components/shared/app-header';

export default function MachinesScreen() {
  return (
    <AppHeader title="Máquinas" subtitle="Listado de máquinas del local" showConnectivity={false} />
  );
}
