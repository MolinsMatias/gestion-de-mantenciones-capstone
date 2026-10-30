import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/shared/app-header';
import { MaintenanceCard } from '@/components/maintenance/maintenance-card';
import { HistoryDetailDialog } from '@/components/maintenance/history-detail-dialog';
import { useMaintenanceHistory } from '@/hooks/use-maintenance-history';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import { useAuth } from '@/providers/auth-provider';
import { useLocals } from '@/providers/local-provider';
import { fetchMachineCategories } from '@/services/machines';
import type { MachineCategory } from '@/types/machine';
import type { HistoryRecord, HistoryQuery } from '@/types/maintenance';

const TYPES = [
  { id: 'all', label: 'Todos los tipos' },
  { id: 'correctiva', label: 'Correctiva' },
  { id: 'preventiva', label: 'Preventiva' },
  { id: 'inspeccion', label: 'Inspección' },
] as const;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { activeLocal } = useLocals();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [type, setType] = useState<HistoryQuery['type']>('all');
  const [categories, setCategories] = useState<MachineCategory[]>([]);
  const scope = `${session?.user.id}/${activeLocal?.id}`;
  const [selected, setSelected] = useState<{ record: HistoryRecord; scope: string } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let mounted = true;
    void fetchMachineCategories()
      .then((value) => {
        if (mounted) setCategories(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const { page, loading, loadingMore, refreshing, cached, error, refresh, loadMore } =
    useMaintenanceHistory({
      userId: session?.user.id ?? '',
      localId: activeLocal?.id ?? '',
      categoryId,
      type,
      search: debouncedSearch,
    });
  const { containerRef, pullDistance, isThresholdReached, handleScroll } = useWebPullToRefresh({
    isRefreshing: refreshing,
    onRefresh: refresh,
  });
  const renderHistoryItem = useCallback(
    ({ item }: { item: HistoryRecord }) => (
      <View className="w-full max-w-xl self-center px-4">
        <MaintenanceCard
          item={{
            ...item,
            ubicacion: `${item.codigo_interno} · ${activeLocal?.nombre ?? ''}`,
            categoria: `${item.categoria} · ${TYPES.find((option) => option.id === item.tipo)?.label ?? item.tipo}`,
          }}
          showStatusLabel
          onPress={() => setSelected({ record: item, scope })}
        />
      </View>
    ),
    [activeLocal?.nombre, scope],
  );
  const action = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2 active:bg-blue-50"
    >
      <RefreshCw size={16} color="#2563eb" />
      <Text className="text-sm font-semibold text-blue-700">{label}</Text>
    </Pressable>
  );
  return (
    <View className="flex-1 bg-[#f8fafc]">
      <AppHeader title="Historial" subtitle="Mis intervenciones enviadas" showConnectivity />
      <View className="border-b border-slate-200 bg-[#f8fafc] py-3">
        <View className="w-full max-w-xl self-center px-4">
          <View className="min-h-12 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
            <Search size={18} color="#64748b" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por equipo o código"
              accessibilityLabel="Buscar intervenciones por equipo o código"
              autoCorrect={false}
              returnKeyType="search"
              className="ml-2 flex-1 py-3 text-base text-slate-900"
            />
            {search ? (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                className="min-h-12 min-w-12 items-center justify-center"
              >
                <X size={18} color="#64748b" />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 4 }}
          >
            {[{ id: '', nombre: 'Todas' }, ...categories].map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: categoryId === category.id }}
                className={`min-h-[38px] items-center justify-center rounded-full px-4 py-2 ${categoryId === category.id ? 'bg-blue-600 active:bg-blue-700' : 'border border-slate-200 bg-white active:bg-slate-50'}`}
                style={{ cursor: 'pointer' }}
              >
                <Text
                  className={`text-xs ${categoryId === category.id ? 'font-semibold text-white' : 'font-medium text-slate-600'}`}
                >
                  {category.nombre}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="mt-2 flex-row items-center justify-between">
            <Text numberOfLines={1} className="mr-2 flex-1 text-xs font-medium text-slate-500">
              {activeLocal
                ? `${loading ? 'Cargando...' : `${page.totalCount} ${page.totalCount === 1 ? 'intervención' : 'intervenciones'}`} · ${activeLocal.nombre}`
                : 'Selecciona un local en Inicio'}
            </Text>

            <Pressable
              onPress={() => setIsFilterOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por tipo de mantención"
              accessibilityState={{ expanded: isFilterOpen }}
              className="min-h-[34px] flex-row items-center gap-1.5 rounded-lg px-2 py-1 active:bg-slate-100"
              style={{ cursor: 'pointer' }}
            >
              <SlidersHorizontal size={15} color="#2563eb" strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-blue-600">
                {type === 'all' ? 'Filtrar' : 'Filtro activo'}
              </Text>
            </Pressable>
          </View>

          {/* Selector de tipo de mantención cuando se pulsa Filtrar */}
          {isFilterOpen ? (
            <View className="mt-2 flex-row flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              {TYPES.map((option) => {
                const isActive = type === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setType(option.id);
                      setIsFilterOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-lg px-3 py-1.5 ${
                      isActive ? 'bg-slate-900' : 'bg-slate-100 active:bg-slate-200'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isActive ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
      <View ref={containerRef} className="flex-1">
        {Platform.OS === 'web' && (pullDistance > 0 || refreshing) ? (
          <View
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel="Actualizando historial"
            style={{ height: refreshing ? 52 : pullDistance }}
            className="w-full max-w-xl items-center justify-center self-center overflow-hidden px-4"
          >
            <View className="flex-row items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-sm">
              {refreshing ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <View
                  style={{
                    transform: [{ rotate: `${Math.min(180, Math.round(pullDistance * 2.5))}deg` }],
                  }}
                >
                  <RefreshCw
                    size={15}
                    color={isThresholdReached ? '#2563eb' : '#64748b'}
                    strokeWidth={2.2}
                  />
                </View>
              )}
              <Text className="text-xs font-medium text-slate-600">
                {refreshing
                  ? 'Actualizando historial...'
                  : isThresholdReached
                    ? 'Suelta para actualizar'
                    : 'Desliza hacia abajo para actualizar'}
              </Text>
            </View>
          </View>
        ) : null}

        <FlatList
          key={`${scope}/${categoryId}/${type}/${debouncedSearch}`}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          data={loading ? [] : page.items}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={() => {
            if (!error) void loadMore();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 92,
          }}
          ListHeaderComponent={
            error && cached ? (
              <View className="w-full max-w-xl self-center px-4 pb-3">
                <Text
                  accessibilityRole="alert"
                  className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {`${error} Se muestra el historial guardado.`}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="w-full max-w-xl self-center px-4">
              {loading ? (
                Array.from({ length: 6 }, (_, index) => <MaintenanceCard key={index} isLoading />)
              ) : (
                <View className="items-center rounded-2xl border border-slate-200 bg-white p-6">
                  <Text className="text-center text-sm text-slate-600">
                    {error
                      ? 'No se pudo cargar el historial.'
                      : !activeLocal
                        ? 'Selecciona un local en Inicio para ver tus intervenciones.'
                        : 'No tienes intervenciones enviadas que coincidan con estos filtros.'}
                  </Text>
                  {error ? action('Reintentar', () => void refresh()) : null}
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator accessibilityLabel="Cargando más intervenciones" color="#2563eb" />
            ) : page.items.length > 0 && page.hasMore ? (
              action('Cargar más', () => void loadMore(), refreshing)
            ) : null
          }
        />
      </View>
      <HistoryDetailDialog
        record={selected?.scope === scope ? selected.record : null}
        localName={activeLocal?.nombre ?? ''}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}
