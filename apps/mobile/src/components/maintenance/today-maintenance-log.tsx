import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { useLocals } from '@/providers/local-provider';
import { useMaintenanceHistory } from '@/hooks/use-maintenance-history';
import { MaintenanceCard } from '@/components/maintenance/maintenance-card';
import { HistoryDetailDialog } from '@/components/maintenance/history-detail-dialog';
import type { HistoryRecord } from '@/types/maintenance';

const TYPE_LABELS: Record<string, string> = {
  preventiva: 'Preventiva',
  correctiva: 'Correctiva',
  inspeccion: 'Inspección',
};

function formatDuration(
  iniciadaAt: string,
  finalizadaAt: string | null,
  enviadaAt: string,
): string {
  if (!iniciadaAt) return '';
  const start = new Date(iniciadaAt).getTime();
  const end = new Date(finalizadaAt || enviadaAt).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return '';
  const diffMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
  return `${diffMinutes} min`;
}

export function useTodayMaintenanceLog() {
  const { session } = useAuth();
  const { activeLocal } = useLocals();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const scope = `${session?.user.id}/${activeLocal?.id}/${start.toISOString()}`;
  const [selected, setSelected] = useState<{ scope: string; record: HistoryRecord } | null>(null);

  const { page, loading, refreshing, loadingMore, cached, error, loadMore, refresh } =
    useMaintenanceHistory({
      userId: session?.user.id ?? '',
      localId: activeLocal?.id ?? '',
      categoryId: '',
      type: 'all',
      search: '',
      completedFrom: start.toISOString(),
      completedBefore: end.toISOString(),
    });

  useEffect(() => {
    if (!loading && !refreshing && !loadingMore && !cached && !error && page.hasMore)
      void loadMore();
  }, [loading, refreshing, loadingMore, cached, error, page.hasMore, page.items.length, loadMore]);

  return {
    page,
    loading,
    refreshing,
    loadingMore,
    cached,
    error,
    scope,
    selected,
    setSelected,
    activeLocal,
    refresh,
  };
}

export function TodayMaintenanceHeader({
  totalCount,
  loading,
}: {
  totalCount: number;
  loading: boolean;
}) {
  return (
    <View className="w-full border-b border-slate-200/60 bg-[#f8fafc] py-2.5">
      <View className="w-full max-w-xl flex-row flex-wrap items-center justify-between gap-2 self-center px-4">
        <View className="flex-row items-center gap-2">
          <Text accessibilityRole="header" className="text-sm font-bold text-slate-900">
            Mi bitácora de terreno hoy
          </Text>
          <View className="rounded-full bg-blue-100 px-2 py-0.5">
            <Text className="text-xs font-bold text-blue-700">{loading ? '…' : totalCount}</Text>
          </View>
        </View>
        <Text className="text-xs text-slate-500">Más recientes primero</Text>
      </View>
    </View>
  );
}

export function TodayMaintenanceList({
  state,
}: {
  state: ReturnType<typeof useTodayMaintenanceLog>;
}) {
  const {
    page,
    loading,
    refreshing,
    loadingMore,
    cached,
    error,
    scope,
    selected,
    setSelected,
    activeLocal,
    refresh,
  } = state;

  return (
    <View className="gap-2.5">
      {error && cached ? (
        <View className="rounded-xl bg-amber-50 p-3">
          <Text accessibilityRole="alert" className="text-sm text-amber-900">
            {`${error} Se muestran las intervenciones disponibles en este dispositivo.`}
          </Text>
          <Pressable
            onPress={() => void refresh()}
            accessibilityRole="button"
            className="min-h-12 justify-center"
          >
            <Text className="font-semibold text-blue-700">Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <>
          <MaintenanceCard isLoading />
          <MaintenanceCard isLoading />
        </>
      ) : page.items.length === 0 ? (
        <View className="rounded-2xl border border-slate-200 bg-white p-5">
          <Text className="text-sm text-slate-600">
            {error
              ? 'No se pudo consultar tu bitácora de hoy.'
              : activeLocal
                ? 'Aún no tienes intervenciones enviadas hoy en este local.'
                : 'Selecciona un local para consultar tu bitácora.'}
          </Text>
        </View>
      ) : (
        page.items.map((item) => {
          const duration = formatDuration(item.iniciada_at, item.finalizada_at, item.enviada_at);
          const typeLabel = TYPE_LABELS[item.tipo] ?? item.tipo;
          const categoriaText = [item.categoria, typeLabel, duration].filter(Boolean).join(' · ');

          return (
            <MaintenanceCard
              key={item.id}
              item={{
                ...item,
                titulo: `${item.codigo_interno} · ${item.titulo}`,
                categoria: categoriaText,
                ubicacion: activeLocal?.nombre ?? '',
                etiqueta_tiempo: new Date(item.finalizada_at ?? item.enviada_at).toLocaleTimeString(
                  'es-CL',
                  { hour: '2-digit', minute: '2-digit' },
                ),
              }}
              showStatusLabel={false}
              onPress={() => setSelected({ scope, record: item })}
            />
          );
        })
      )}
      {loadingMore || (refreshing && !loading) ? (
        <ActivityIndicator accessibilityLabel="Actualizando bitácora de hoy" color="#2563eb" />
      ) : null}
      <HistoryDetailDialog
        record={selected?.scope === scope ? selected.record : null}
        localName={activeLocal?.nombre ?? ''}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

export function TodayMaintenanceLog() {
  const state = useTodayMaintenanceLog();

  return (
    <View className="gap-2.5">
      <TodayMaintenanceHeader totalCount={state.page.totalCount} loading={state.loading} />
      <TodayMaintenanceList state={state} />
    </View>
  );
}
