import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  fetchLocals,
  getCachedLocals,
  getSavedActiveLocalId,
  saveActiveLocalId,
} from '@/services/locals';
import type { Local } from '@/types/local';

export interface LocalContextValue {
  locals: Local[];
  activeLocal: Local | null;
  isLoading: boolean;
  error: string | null;
  selectLocal: (local: Local) => void;
  refreshLocals: () => Promise<void>;
}

const LocalContext = createContext<LocalContextValue | undefined>(undefined);

export function LocalProvider({ children }: PropsWithChildren) {
  const [locals, setLocals] = useState<Local[]>([]);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const hydrationRef = useRef<Promise<void> | null>(null);
  const refreshRequestRef = useRef<Promise<void> | null>(null);

  const hydrateCache = useCallback(() => {
    if (!hydrationRef.current) {
      hydrationRef.current = Promise.all([getCachedLocals(), getSavedActiveLocalId()]).then(
        ([cachedLocals, savedId]) => {
          if (!mountedRef.current) return;
          setLocals(cachedLocals);
          const nextId = selectedIdRef.current ?? savedId ?? cachedLocals[0]?.id ?? null;
          selectedIdRef.current = nextId;
          setActiveLocalId(nextId);
        },
      );
    }
    return hydrationRef.current;
  }, []);

  const refreshLocals = useCallback((): Promise<void> => {
    if (refreshRequestRef.current) return refreshRequestRef.current;
    setIsLoading(true);
    setError(null);
    const request = (async () => {
      try {
        await hydrateCache();
        const freshLocals = await fetchLocals({ allowCacheFallback: false });
        if (!mountedRef.current) return;
        setLocals(freshLocals);
        const previousId = selectedIdRef.current;
        const nextId =
          previousId && freshLocals.some((local) => local.id === previousId)
            ? previousId
            : (freshLocals[0]?.id ?? null);
        selectedIdRef.current = nextId;
        setActiveLocalId(nextId);
        await saveActiveLocalId(nextId);
      } catch (error) {
        if (mountedRef.current)
          setError(
            error instanceof Error ? error.message : 'No se pudieron actualizar los locales.',
          );
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
    refreshRequestRef.current = request;
    void request.finally(() => {
      if (refreshRequestRef.current === request) refreshRequestRef.current = null;
    });
    return request;
  }, [hydrateCache]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshLocals();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshLocals]);

  const selectLocal = useCallback((local: Local) => {
    selectedIdRef.current = local.id;
    setActiveLocalId(local.id);
    void saveActiveLocalId(local.id);
  }, []);

  const activeLocal = useMemo(() => {
    if (locals.length === 0) return null;
    if (activeLocalId) {
      const found = locals.find((loc) => loc.id === activeLocalId);
      if (found) return found;
    }
    return locals[0];
  }, [activeLocalId, locals]);

  const value = useMemo<LocalContextValue>(
    () => ({
      locals,
      activeLocal,
      isLoading,
      error,
      selectLocal,
      refreshLocals,
    }),
    [locals, activeLocal, isLoading, error, selectLocal, refreshLocals],
  );

  return <LocalContext.Provider value={value}>{children}</LocalContext.Provider>;
}

export function useLocals(): LocalContextValue {
  const context = useContext(LocalContext);
  if (!context) {
    throw new Error('useLocals debe ser utilizado dentro de un LocalProvider.');
  }
  return context;
}
