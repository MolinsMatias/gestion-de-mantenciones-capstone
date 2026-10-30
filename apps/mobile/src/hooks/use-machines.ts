import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchMachineCategories,
  fetchMachinesPage,
  getCachedMachineCategories,
  MACHINES_PAGE_SIZE,
} from '@/services/machines';
import type { Machine, MachineCategory, MachineStatusFilter } from '@/types/machine';

export interface UseMachinesOptions {
  localId?: string;
  selectedCategory: string;
  searchQuery: string;
  statusFilter: MachineStatusFilter;
}

export interface UseMachinesResult {
  machines: Machine[];
  categories: string[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isFromCache: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Manages paginated machine queries against Supabase with debounced search,
 * category filtering, infinite scroll (`loadMore`), and offline fallback.
 */
export function useMachines({
  localId,
  selectedCategory,
  searchQuery,
  statusFilter,
}: UseMachinesOptions): UseMachinesResult {
  const [rawMachines, setRawMachines] = useState<Machine[]>([]);
  const [categoryList, setCategoryList] = useState<MachineCategory[]>([]);
  const [serverTotalCount, setServerTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchQuery.trim());

  const loadingMoreRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const isInitialMount = useRef<boolean>(true);

  // Debounce del texto de búsqueda para evitar disparar consultas en cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Carga inicial de categorías activas
  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      const cached = await getCachedMachineCategories();
      if (mounted && cached.length > 0) {
        setCategoryList(cached);
      }
      const fresh = await fetchMachineCategories();
      if (mounted && fresh.length > 0) {
        setCategoryList(fresh);
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === 'Todos') return undefined;
    const found = categoryList.find((cat) => cat.nombre === selectedCategory);
    return found?.id;
  }, [categoryList, selectedCategory]);

  // Carga de la primera página cuando cambian local, categoría, búsqueda o estado operativo
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let mounted = true;
    const currentRequestId = ++requestIdRef.current;

    async function loadFirstPage() {
      await Promise.resolve();
      if (!mounted || currentRequestId !== requestIdRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchMachinesPage({
          localId,
          categoryId: selectedCategoryId,
          searchQuery: debouncedSearch,
          statusFilter,
          offset: 0,
          limit: MACHINES_PAGE_SIZE,
        });

        if (mounted && currentRequestId === requestIdRef.current) {
          setRawMachines(result.items);
          setServerTotalCount(result.totalCount);
          setHasMore(result.hasMore);
          if (result.isFromCache) {
            setIsFromCache(true);
            setError('No se pudo conectar con el servidor.');
          } else {
            setIsFromCache(false);
            setError(null);
          }
        }
      } catch (err) {
        if (mounted && currentRequestId === requestIdRef.current) {
          const message =
            err instanceof Error
              ? err.message
              : 'No se pudo obtener el listado de máquinas desde el servidor.';
          setError(message);
          setIsFromCache(false);
        }
      } finally {
        if (mounted && currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadFirstPage();

    return () => {
      mounted = false;
    };
  }, [localId, selectedCategoryId, debouncedSearch, statusFilter]);

  // Paginación incremental al deslizar hacia el final de la lista
  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || loadingMoreRef.current || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextOffset = rawMachines.length;
      const result = await fetchMachinesPage({
        localId,
        categoryId: selectedCategoryId,
        searchQuery: debouncedSearch,
        statusFilter,
        offset: nextOffset,
        limit: MACHINES_PAGE_SIZE,
      });

      setRawMachines((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const appended = result.items.filter((item) => !existingIds.has(item.id));
        return [...prev, ...appended];
      });
      setServerTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      console.warn('Error loading next page of machines:', err);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    debouncedSearch,
    hasMore,
    isLoading,
    isRefreshing,
    localId,
    rawMachines.length,
    selectedCategoryId,
    statusFilter,
  ]);

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    if (rawMachines.length === 0) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const [freshCategories, result] = await Promise.all([
        fetchMachineCategories(),
        fetchMachinesPage({
          localId,
          categoryId: selectedCategoryId,
          searchQuery: debouncedSearch,
          statusFilter,
          offset: 0,
          limit: MACHINES_PAGE_SIZE,
        }),
      ]);

      if (currentRequestId === requestIdRef.current) {
        if (freshCategories.length > 0) {
          setCategoryList(freshCategories);
        }
        setRawMachines(result.items);
        setServerTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        if (result.isFromCache) {
          setIsFromCache(true);
          setError('No se pudo conectar con el servidor.');
        } else {
          setIsFromCache(false);
          setError(null);
        }
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo obtener el listado de máquinas desde el servidor.';
        setError(message);
        setIsFromCache(false);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, localId, rawMachines.length, selectedCategoryId, statusFilter]);

  const categories = useMemo(() => {
    return ['Todos', ...categoryList.map((cat) => cat.nombre)];
  }, [categoryList]);

  const totalCount = Math.max(serverTotalCount, rawMachines.length);

  return {
    machines: rawMachines,
    categories,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isFromCache,
    error,
    loadMore,
    refresh,
  };
}
