import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAuth } from '@/providers/auth-provider';
import { syncPendingMaintenances } from '@/services/checklists';

const RETRY_INTERVAL_MS = 30_000;

export function PendingMaintenanceSync() {
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const technicianId = session?.user.id;

  useEffect(() => {
    if (!technicianId || !isOnline) return;

    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const sync = async () => {
      try {
        if (AppState.currentState === 'active') {
          await syncPendingMaintenances(technicianId);
        }
      } catch {
        // Retry if local storage was temporarily unavailable.
      } finally {
        if (!stopped) retry = setTimeout(() => void sync(), RETRY_INTERVAL_MS);
      }
    };

    void sync();

    return () => {
      stopped = true;
      clearTimeout(retry);
    };
  }, [isOnline, technicianId]);

  return null;
}
