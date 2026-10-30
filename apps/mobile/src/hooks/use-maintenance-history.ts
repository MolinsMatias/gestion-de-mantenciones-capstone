import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchHistoryPage,
  readHistoryCache,
  HISTORY_PAGE_SIZE,
} from '@/services/maintenance-history';
import type { HistoryPage, HistoryQuery } from '@/types/maintenance';

const EMPTY: HistoryPage = { items: [], totalCount: 0, hasMore: false };

export function useMaintenanceHistory(query: HistoryQuery) {
  const key = JSON.stringify(query);
  const [state, setState] = useState({
    key: '',
    page: EMPTY,
    loading: true,
    refreshing: false,
    loadingMore: false,
    cached: false,
    error: null as string | null,
  });
  const generation = useRef(0);
  const busy = useRef(false);
  const pageRef = useRef(EMPTY);
  const offsetRef = useRef(0);
  const refresh = useCallback(
    async (initial = false) => {
      const version = ++generation.current;
      busy.current = true;
      const options = JSON.parse(key) as HistoryQuery;
      if (!options.userId || !options.localId) {
        pageRef.current = EMPTY;
        busy.current = false;
        setState({
          key,
          page: EMPTY,
          loading: false,
          refreshing: false,
          loadingMore: false,
          cached: false,
          error: null,
        });
        return;
      }
      setState((previous) => ({
        ...previous,
        key,
        page: initial || previous.key !== key ? EMPTY : previous.page,
        loading: initial,
        refreshing: !initial,
        loadingMore: false,
        cached: initial ? false : previous.cached,
        error: null,
      }));
      if (initial) {
        pageRef.current = EMPTY;
        const cached = await readHistoryCache(options);
        if (version !== generation.current) return;
        if (cached) {
          pageRef.current = cached;
          offsetRef.current = cached.items.length;
          setState((previous) => ({
            ...previous,
            page: cached,
            cached: true,
            loading: false,
            refreshing: true,
          }));
        }
      }
      try {
        const page = await fetchHistoryPage(options);
        if (version !== generation.current) return;
        pageRef.current = page;
        offsetRef.current = page.items.length;
        setState({
          key,
          page,
          loading: false,
          refreshing: false,
          loadingMore: false,
          cached: false,
          error: null,
        });
      } catch (error) {
        if (version !== generation.current) return;
        setState((previous) => ({
          ...previous,
          loading: false,
          refreshing: false,
          cached: previous.page.items.length > 0,
          error: error instanceof Error ? error.message : 'No se pudo cargar el historial.',
        }));
      } finally {
        if (version === generation.current) busy.current = false;
      }
    },
    [key],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh(true);
      return () => {
        ++generation.current;
        busy.current = false;
      };
    }, [refresh]),
  );
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (busy.current || !pageRef.current.hasMore) return;
    busy.current = true;
    const version = generation.current;
    setState((previous) => ({ ...previous, loadingMore: true, error: null }));
    try {
      const next = await fetchHistoryPage(JSON.parse(key) as HistoryQuery, offsetRef.current);
      if (version !== generation.current) return;
      offsetRef.current += next.items.length;
      const existing = new Set(pageRef.current.items.map((item) => item.id));
      const page = {
        ...next,
        items: [...pageRef.current.items, ...next.items.filter((item) => !existing.has(item.id))],
      };
      pageRef.current = page;
      setState((previous) => ({ ...previous, page, loadingMore: false, cached: false }));
    } catch {
      if (version === generation.current)
        setState((previous) => ({
          ...previous,
          loadingMore: false,
          error: 'No se pudo cargar la siguiente página. Pulsa Cargar más para reintentar.',
        }));
    } finally {
      if (version === generation.current) busy.current = false;
    }
  }, [key]);
  const visible = state.key === key ? state : { ...state, page: EMPTY, loading: true, error: null };
  return { ...visible, refresh: () => refresh(false), loadMore, pageSize: HISTORY_PAGE_SIZE };
}
