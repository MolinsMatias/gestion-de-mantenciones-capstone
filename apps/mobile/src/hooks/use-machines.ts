import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNetworkStatus } from '@/providers/network-provider';
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
  const { isOnline } = useNetworkStatus();
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
      if (!mounted || !isOnline) return;
      const fresh = await fetchMachineCategories();
      if (mounted && fresh.length > 0) {
        setCategoryList(fresh);
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, [isOnline]);

  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === 'Todos') return undefined;
    const found = categoryList.find((cat) => cat.nombre === selectedCategory);
    return found?.id;
  }, [categoryList, selectedCategory]);

  const loadFirstPage = useCallback(
    async (refreshing: boolean) => {
      const currentRequestId = ++requestIdRef.current;
      setIsLoading(!refreshing);
      setIsRefreshing(refreshing);
      setError(null);

      try {
        const result = await fetchMachinesPage({
          preferOffline: !isOnline,
          localId,
          categoryId: selectedCategoryId,
          searchQuery: debouncedSearch,
          statusFilter,
          offset: 0,
          limit: MACHINES_PAGE_SIZE,
        });

        if (currentRequestId !== requestIdRef.current) return;

        setRawMachines(result.items);
        setServerTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setIsFromCache(Boolean(result.isFromCache));
        setError(isOnline && result.isFromCache ? 'No se pudo conectar con el servidor.' : null);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el listado de máquinas.');
        setIsFromCache(false);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [isOnline, localId, selectedCategoryId, debouncedSearch, statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage(false);
      return () => {
        requestIdRef.current++;
      };
    }, [loadFirstPage]),
  );

  // Paginación incremental al deslizar hacia el final de la lista
  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || loadingMoreRef.current || !hasMore) {
      return;
    }

    const currentRequestId = requestIdRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextOffset = rawMachines.length;
      const result = await fetchMachinesPage({
        localId,
        categoryId: selectedCategoryId,
        searchQuery: debouncedSearch,
        statusFilter,
        preferOffline: !isOnline,
        offset: nextOffset,
        limit: MACHINES_PAGE_SIZE,
      });

      if (currentRequestId !== requestIdRef.current) return;
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
    isOnline,
    isRefreshing,
    localId,
    rawMachines.length,
    selectedCategoryId,
    statusFilter,
  ]);

  const refresh = useCallback(async () => {
    if (!isOnline) return;
    const [freshCategories] = await Promise.all([fetchMachineCategories(), loadFirstPage(true)]);
    if (freshCategories.length > 0) setCategoryList(freshCategories);
  }, [isOnline, loadFirstPage]);

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
