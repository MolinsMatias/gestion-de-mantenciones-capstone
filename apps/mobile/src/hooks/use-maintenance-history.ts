import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNetworkStatus } from '@/providers/network-provider';
import { subscribeToPendingMaintenances } from '@/services/checklists';
import {
  fetchHistoryPage,
  readHistoryCache,
  readPendingHistory,
  HISTORY_PAGE_SIZE,
} from '@/services/maintenance-history';
import type { HistoryPage, HistoryQuery, HistoryRecord } from '@/types/maintenance';

const EMPTY: HistoryPage = { items: [], totalCount: 0, hasMore: false };

export function useMaintenanceHistory(query: HistoryQuery, includePending = false) {
  const { isOnline } = useNetworkStatus();
  const key = JSON.stringify(query);
  const [pending, setPending] = useState<{ key: string; items: HistoryRecord[] }>({
    key: '',
    items: [],
  });
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
        refreshing: !initial && isOnline,
        loadingMore: false,
        cached: initial ? false : previous.cached,
        error: null,
      }));
      let pendingItems: HistoryRecord[] | null = null;
      if (initial || !isOnline || includePending) {
        const [cached, localItems] = await Promise.all([
          initial || !isOnline ? readHistoryCache(options) : Promise.resolve(null),
          includePending ? readPendingHistory(options).catch(() => null) : Promise.resolve(null),
        ]);
        if (version !== generation.current) return;
        pendingItems = localItems;
        if (pendingItems && (initial || !isOnline)) setPending({ key, items: pendingItems });
        if (initial || !isOnline) {
          const localPage = cached ?? EMPTY;
          pageRef.current = localPage;
          offsetRef.current = localPage.items.length;
          setState((previous) => ({
            ...previous,
            page: localPage,
            cached: Boolean(cached),
            loading: isOnline && !cached && !pendingItems?.length,
            refreshing: isOnline && Boolean(cached),
          }));
        }
      }
      if (!isOnline) {
        busy.current = false;
        return;
      }
      try {
        const page = await fetchHistoryPage(options);
        if (version !== generation.current) return;
        if (pendingItems) setPending({ key, items: pendingItems });
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
        if (pendingItems) setPending({ key, items: pendingItems });
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
    [includePending, isOnline, key],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh(true);
      const unsubscribe = includePending
        ? subscribeToPendingMaintenances((technicianId) => {
            if (technicianId === query.userId) void refresh();
          })
        : undefined;
      return () => {
        unsubscribe?.();
        ++generation.current;
        busy.current = false;
      };
    }, [includePending, query.userId, refresh]),
  );
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!isOnline || busy.current || !pageRef.current.hasMore) return;
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
  }, [isOnline, key]);
  const visible = state.key === key ? state : { ...state, page: EMPTY, loading: true, error: null };
  const page = useMemo(() => {
    if (pending.key !== key || !pending.items.length) return visible.page;
    const sentIds = new Set(visible.page.items.map((item) => item.id.toLowerCase()));
    const localItems = pending.items.filter((item) => !sentIds.has(item.id.toLowerCase()));
    const completedAt = (item: HistoryRecord) =>
      item.finalizada_at ?? item.enviada_at ?? item.iniciada_at;
    return {
      ...visible.page,
      totalCount: visible.page.totalCount + localItems.length,
      items: [...visible.page.items, ...localItems].sort(
        (a, b) => Date.parse(completedAt(b)) - Date.parse(completedAt(a)),
      ),
    };
  }, [key, pending, visible.page]);
  return { ...visible, page, refresh: () => refresh(false), loadMore, pageSize: HISTORY_PAGE_SIZE };
}
