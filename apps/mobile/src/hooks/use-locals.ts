import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchLocals,
  getCachedLocals,
  getSavedActiveLocalId,
  saveActiveLocalId,
} from '@/services/locals';
import type { Local } from '@/types/local';

export interface UseLocalsResult {
  locals: Local[];
  activeLocal: Local | null;
  isLoading: boolean;
  error: string | null;
  selectLocal: (local: Local) => void;
  refreshLocals: () => Promise<void>;
}

/**
 * Loads active locals from Supabase (`public.local`), restores the selected local
 * from local storage, and provides a handler to switch the active local.
 */
export function useLocals(): UseLocalsResult {
  const [locals, setLocals] = useState<Local[]>([]);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitialLocals() {
      const [cachedLocals, savedId] = await Promise.all([
        getCachedLocals(),
        getSavedActiveLocalId(),
      ]);

      if (!mounted) return;

      if (savedId) {
        setActiveLocalId(savedId);
      }

      if (cachedLocals.length > 0) {
        setLocals(cachedLocals);
        if (!savedId) {
          setActiveLocalId(cachedLocals[0].id);
        }
      }

      try {
        const freshLocals = await fetchLocals();
        if (!mounted) return;

        setLocals(freshLocals);
        setError(null);

        if (freshLocals.length > 0) {
          const matchesSaved = savedId && freshLocals.some((loc) => loc.id === savedId);
          const resolvedId = matchesSaved ? savedId : freshLocals[0].id;
          setActiveLocalId(resolvedId);
          void saveActiveLocalId(resolvedId);
        }
      } catch (err) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : 'No se pudieron obtener los locales del servidor.';
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialLocals();

    return () => {
      mounted = false;
    };
  }, []);

  const selectLocal = useCallback((local: Local) => {
    setActiveLocalId(local.id);
    void saveActiveLocalId(local.id);
  }, []);

  const refreshLocals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const freshLocals = await fetchLocals();
      setLocals(freshLocals);
      if (freshLocals.length > 0) {
        setActiveLocalId((prevId) => {
          const stillExists = prevId && freshLocals.some((loc) => loc.id === prevId);
          const nextId = stillExists ? prevId : freshLocals[0].id;
          void saveActiveLocalId(nextId);
          return nextId;
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudieron obtener los locales del servidor.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeLocal = useMemo(() => {
    if (locals.length === 0) return null;
    if (activeLocalId) {
      const found = locals.find((loc) => loc.id === activeLocalId);
      if (found) return found;
    }
    return locals[0];
  }, [activeLocalId, locals]);

  return {
    locals,
    activeLocal,
    isLoading,
    error,
    selectLocal,
    refreshLocals,
  };
}
