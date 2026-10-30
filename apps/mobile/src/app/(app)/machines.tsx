import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMachineStatusConfig, MachineCard } from '@/components/machines/machine-card';
import { MachineCardSkeletonList } from '@/components/machines/machine-card-skeleton';
import { AppHeader } from '@/components/shared/app-header';
import { useMachines } from '@/hooks/use-machines';
import { useWebPullToRefresh } from '@/hooks/use-web-pull-to-refresh';
import { useLocals } from '@/providers/local-provider';
import type { Machine, MachineStatusFilter } from '@/types/machine';

const STATUS_FILTER_OPTIONS: { value: MachineStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'operativa', label: 'Operativa' },
  { value: 'operativa_con_observaciones', label: 'Operativa con detalles' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' },
];

export default function MachinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeLocal } = useLocals();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<MachineStatusFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const {
    machines,
    categories,
    totalCount,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isFromCache,
    error,
    loadMore,
    refresh,
  } = useMachines({
    localId: activeLocal?.id,
    selectedCategory,
    searchQuery,
    statusFilter,
  });

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const { containerRef, pullDistance, isThresholdReached, handleScroll } = useWebPullToRefresh({
    isRefreshing,
    onRefresh: refresh,
  });

  const handleOpenMaintenance = useCallback(
    (machine: Machine) => {
      router.push({
        pathname: '/maintenance/[machineId]',
        params: { machineId: machine.id },
      });
    },
    [router],
  );

  const handleSelectMachine = useCallback(
    (machine: Machine) => {
      if (Platform.OS === 'web') {
        handleOpenMaintenance(machine);
        return;
      }
      const statusLabel = getMachineStatusConfig(machine.estado_equipo).label;
      const brandModel = [machine.marca?.nombre, machine.modelo].filter(Boolean).join(' · ');

      Alert.alert(
        machine.nombre,
        `Código: ${machine.codigo_interno}\nCategoría: ${machine.categoria.nombre}${
          brandModel ? `\nEquipo: ${brandModel}` : ''
        }\nEstado actual: ${statusLabel}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: `Iniciar mantención (${machine.categoria.nombre})`,
            onPress: () => handleOpenMaintenance(machine),
          },
        ],
      );
    },
    [handleOpenMaintenance],
  );

  const renderMachineItem = useCallback(
    ({ item }: ListRenderItemInfo<Machine>) => (
      <View className="w-full max-w-xl self-center px-4 pb-3">
        <MachineCard machine={item} onPress={handleSelectMachine} />
      </View>
    ),
    [handleSelectMachine],
  );

  const keyExtractor = useCallback((item: Machine) => item.id, []);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <AppHeader
        title="Máquinas"
        subtitle="Consulta y registra mantenciones"
        showConnectivity={true}
      />

      {/* Zona superior fija: Buscador, Categorías y Contador/Filtro */}
      <View className="z-10 border-b border-slate-200/70 bg-[#f8fafc] pt-4 pb-2.5">
        <View className="w-full max-w-xl self-center">
          {/* Buscador */}
          <View className="flex-row items-center gap-2.5 px-4">
            <View className="min-h-[46px] flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
              <Search size={18} color="#64748b" strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre, marca o código"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Buscar equipo por nombre, marca o código"
                returnKeyType="search"
                autoCorrect={false}
                className="ml-2.5 flex-1 py-2 text-base text-slate-900"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  hitSlop={8}
                  className="p-1 active:opacity-70"
                  style={{ cursor: 'pointer' }}
                >
                  <X size={16} color="#64748b" strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Filtros horizontales por categoría */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 4,
              gap: 8,
            }}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por categoría ${category}`}
                  accessibilityState={{ selected: isSelected }}
                  className={`min-h-[38px] items-center justify-center rounded-full px-4 py-2 ${
                    isSelected
                      ? 'bg-blue-600 active:bg-blue-700'
                      : 'border border-slate-200 bg-white active:bg-slate-50'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-semibold text-white' : 'font-medium text-slate-600'
                    }`}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Contador de equipos y botón Filtrar */}
          <View className="mt-2 flex-row items-center justify-between px-4">
            <Text numberOfLines={1} className="mr-2 flex-1 text-xs font-medium text-slate-500">
              {isLoading
                ? 'Cargando equipos...'
                : `${totalCount} ${totalCount === 1 ? 'equipo' : 'equipos'}${
                    activeLocal ? ` · ${activeLocal.nombre}` : ''
                  }`}
            </Text>

            <Pressable
              onPress={() => setIsFilterOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Filtrar equipos por estado operativo"
              accessibilityState={{ expanded: isFilterOpen }}
              className="min-h-[34px] flex-row items-center gap-1.5 rounded-lg px-2 py-1 active:bg-slate-100"
              style={{ cursor: 'pointer' }}
            >
              <SlidersHorizontal size={15} color="#2563eb" strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-blue-600">
                {statusFilter === 'all' ? 'Filtrar' : 'Filtro activo'}
              </Text>
            </Pressable>
          </View>

          {/* Selector desplegable de estado operativo cuando se pulsa Filtrar */}
          {isFilterOpen ? (
            <View className="mx-4 mt-2 flex-row flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              {STATUS_FILTER_OPTIONS.map((option) => {
                const isActive = statusFilter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setStatusFilter(option.value);
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

      {/* Lista virtualizada y paginada con soporte Pull-to-Refresh en Android y Web PWA */}
      <View ref={containerRef} className="flex-1">
        {Platform.OS === 'web' && (pullDistance > 0 || isRefreshing) ? (
          <View
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel="Actualizando listado de máquinas"
            style={{ height: isRefreshing ? 52 : pullDistance }}
            className="w-full max-w-xl items-center justify-center self-center overflow-hidden px-4"
          >
            <View className="flex-row items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-sm">
              {isRefreshing ? (
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
                {isRefreshing
                  ? 'Actualizando equipos...'
                  : isThresholdReached
                    ? 'Suelta para actualizar'
                    : 'Desliza hacia abajo para actualizar'}
              </Text>
            </View>
          </View>
        ) : null}

        <FlatList
          data={isLoading ? [] : machines}
          keyExtractor={keyExtractor}
          renderItem={renderMachineItem}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
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
            error && machines.length > 0 ? (
              <View className="w-full max-w-xl self-center px-4 pb-3">
                <Text
                  accessibilityRole="alert"
                  className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {`${error}${isFromCache ? ' Se muestran las máquinas guardadas en caché.' : ''}`}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="w-full max-w-xl self-center px-4">
              {isLoading ? (
                <MachineCardSkeletonList count={6} />
              ) : error ? (
                <View className="items-center rounded-2xl border border-red-200 bg-white px-5 py-7 shadow-sm">
                  <View className="mb-2.5 h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                    <AlertCircle size={22} color="#dc2626" strokeWidth={2} />
                  </View>
                  <Text className="text-center text-sm font-semibold text-slate-900">
                    No se pudieron cargar las máquinas
                  </Text>
                  <Text className="mt-1 text-center text-xs leading-relaxed text-slate-500">
                    {error}
                  </Text>
                  <Pressable
                    onPress={() => void refresh()}
                    accessibilityRole="button"
                    accessibilityLabel="Reintentar carga de máquinas"
                    className="mt-4 min-h-[40px] flex-row items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 active:bg-blue-700"
                    style={{ cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} color="#ffffff" strokeWidth={2.2} />
                    <Text className="text-xs font-semibold text-white">Reintentar</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="items-center rounded-2xl border border-slate-200/80 bg-white px-5 py-8 shadow-sm">
                  <Text className="text-center text-sm font-semibold text-slate-800">
                    No se encontraron equipos
                  </Text>
                  <Text className="mt-1 text-center text-xs text-slate-500">
                    Prueba ajustando el texto de búsqueda o los filtros seleccionados.
                  </Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="w-full max-w-xl self-center px-4 pt-1 pb-2">
                <MachineCardSkeletonList count={2} />
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}
