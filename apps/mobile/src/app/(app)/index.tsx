import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, AlertTriangle, Check, MapPin, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TodayMaintenanceHeader,
  TodayMaintenanceList,
  useTodayMaintenanceLog,
} from '@/components/maintenance/today-maintenance-log';
import { LocalBottomSheet } from '@/components/local/local-bottom-sheet';
import { AppHeader } from '@/components/shared/app-header';
import { useNetworkStatus } from '@/providers/network-provider';
import { useLocals } from '@/providers/local-provider';
import { syncAllActiveMachinesForOfflineCache } from '@/services/machines';

const bowlingBg = require('@/assets/images/bowling-bg.jpg');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleNewIntervention = () => {
    router.push('/(app)/machines');
  };

  const { isOnline } = useNetworkStatus();
  const todayLog = useTodayMaintenanceLog();
  const {
    locals,
    activeLocal,
    isLoading: isLoadingLocals,
    error: localsError,
    selectLocal,
    refreshLocals,
  } = useLocals();
  const [isLocalSheetOpen, setIsLocalSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshLocals();
    }, [refreshLocals]),
  );

  useEffect(() => {
    if (isOnline) {
      void syncAllActiveMachinesForOfflineCache();
    }
  }, [isOnline]);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <View className="shrink-0 bg-[#f8fafc] pb-4">
        {/* Cabecera oscura institucional */}
        <AppHeader />

        {/* Contexto del local fijo bajo la cabecera */}
        <View className="-mt-3.5 w-full max-w-xl flex-col gap-4 self-center px-4">
          {/* Tarjeta de contexto del local activo */}
          <View
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            style={{ borderRadius: 16 }}
          >
            <View className="relative h-28 w-full">
              <Image
                source={bowlingBg}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
              />
              <LinearGradient
                colors={['transparent', 'rgba(2, 6, 23, 0.4)', 'rgba(2, 6, 23, 0.85)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Chip de ubicación */}
              <View className="absolute left-3 top-2.5">
                <View className="flex-row items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 shadow-sm">
                  <MapPin size={12} color="#2563eb" strokeWidth={2.2} />
                  <Text className="text-[10px] font-semibold text-slate-800">
                    {activeLocal?.nombre ?? 'Cargando local...'}
                  </Text>
                </View>
              </View>

              {/* Información del local y botón cambiar local */}
              <View className="absolute inset-x-3 bottom-2.5 flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-[11px] font-medium text-slate-200">Local activo</Text>
                  <Text numberOfLines={1} className="text-xs font-semibold text-white">
                    {activeLocal
                      ? [activeLocal.direccion, activeLocal.comuna_nombre]
                          .filter(Boolean)
                          .join(' • ')
                      : 'Obteniendo ubicación...'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setIsLocalSheetOpen(true);
                    void refreshLocals();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar local activo"
                  className="shrink-0 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1 active:bg-white/30"
                  style={{ cursor: 'pointer' }}
                >
                  <Text className="text-[11px] font-semibold text-white">Cambiar local</Text>
                </Pressable>
              </View>
            </View>

            {/* Franja inferior de estado */}
            <View className="flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-3.5 py-2">
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`h-2 w-2 rounded-full ${
                    !activeLocal ||
                    activeLocal.total_maquinas === 0 ||
                    activeLocal.maquinas_operativas === activeLocal.total_maquinas
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <Text className="text-xs font-medium text-slate-700">
                  {activeLocal
                    ? `${activeLocal.maquinas_operativas}/${activeLocal.total_maquinas} ${
                        activeLocal.total_maquinas === 1
                          ? 'máquina operativa'
                          : 'máquinas operativas'
                      }`
                    : 'Consultando estado de equipos...'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 84,
        }}
      >
        <View className="w-full max-w-xl flex-col gap-4 self-center px-4 pb-3">
          {/* Tarjeta de acción rápida: Bitácora autónoma con padding garantizado */}
          <View
            className="overflow-hidden rounded-2xl shadow-md shadow-blue-500/20"
            style={{ borderRadius: 16 }}
          >
            <LinearGradient
              colors={['#2563eb', '#4f46e5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.8 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ padding: 16 }}>
              <View className="mb-1.5 self-start rounded-full bg-white/20 px-2.5 py-0.5">
                <Text className="text-[10px] font-bold tracking-wider text-white">BITÁCORA</Text>
              </View>
              <Text className="text-base font-bold leading-tight text-white">
                Registrar intervención
              </Text>
              <Text className="mt-1 text-xs text-blue-100">
                Registra inspecciones, mantenciones preventivas o reparaciones de máquinas
              </Text>

              <View
                className="mt-3.5 flex-row items-center justify-between border-t border-white/15 pt-3"
                style={{ borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.15)' }}
              >
                <Pressable
                  onPress={handleNewIntervention}
                  accessibilityRole="button"
                  accessibilityLabel="Nueva intervención"
                  className="shrink-0 flex-row items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 shadow-sm active:scale-95 active:bg-blue-50"
                  style={{ cursor: 'pointer' }}
                >
                  <Plus size={14} color="#1d4ed8" strokeWidth={2.4} />
                  <Text className="text-xs font-bold text-blue-700">Nueva intervención</Text>
                </Pressable>

                <Text
                  className="ml-3 flex-1 text-right text-[11px] font-medium leading-tight text-blue-200"
                  style={{ marginLeft: 12 }}
                >
                  o escanea el QR en la máquina
                </Text>
              </View>
            </View>
          </View>

          {/* Estado de máquinas del local activo: grilla de 3 columnas */}
          <View className="flex-row gap-2.5">
            {/* Columna 1: Operativas */}
            <View
              className="relative min-h-[100px] flex-1 justify-between rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <View className="absolute right-2.5 top-2.5" pointerEvents="none">
                <Check size={14} color="#10b981" strokeWidth={2.5} />
              </View>
              <View className="pr-4">
                <Text
                  className="text-[10px] font-bold leading-tight text-emerald-600"
                  style={{ letterSpacing: 0.3 }}
                >
                  OPERATIVAS
                </Text>
              </View>
              <View className="mt-2">
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-extrabold leading-none text-slate-900">
                    {activeLocal ? activeLocal.maquinas_operativas : '—'}
                  </Text>
                  {activeLocal ? (
                    <Text className="ml-1 text-xs font-semibold text-slate-400">
                      / {activeLocal.total_maquinas}
                    </Text>
                  ) : null}
                </View>
                <Text className="mt-1 text-[10px] font-semibold text-emerald-600">
                  Sin observaciones
                </Text>
              </View>
            </View>

            {/* Columna 2: Con detalles (Operativa con observaciones) */}
            <View
              className="relative min-h-[100px] flex-1 justify-between rounded-2xl border border-amber-100 bg-white p-3 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <View className="absolute right-2.5 top-2.5" pointerEvents="none">
                <AlertTriangle size={14} color="#d97706" strokeWidth={2.2} />
              </View>
              <View className="pr-4">
                <Text
                  className="text-[10px] font-bold leading-tight text-amber-600"
                  style={{ letterSpacing: 0.3 }}
                >
                  CON DETALLES
                </Text>
              </View>
              <View className="mt-2">
                <Text className="text-2xl font-extrabold leading-none text-slate-900">
                  {activeLocal ? activeLocal.maquinas_con_observaciones : '—'}
                </Text>
                <Text className="mt-1 text-[10px] font-semibold text-amber-600">
                  Con observaciones
                </Text>
              </View>
            </View>

            {/* Columna 3: Fuera de servicio */}
            <View
              className="relative min-h-[100px] flex-1 justify-between rounded-2xl border border-red-100 bg-white p-3 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <View className="absolute right-2.5 top-2.5" pointerEvents="none">
                <AlertCircle size={14} color="#dc2626" strokeWidth={2.2} />
              </View>
              <View className="pr-4">
                <Text
                  className="text-[10px] font-bold leading-tight text-red-600"
                  style={{ letterSpacing: 0.3 }}
                >
                  {'FUERA\u200B SERVICIO'}
                </Text>
              </View>
              <View className="mt-2">
                <Text className="text-2xl font-extrabold leading-none text-slate-900">
                  {activeLocal ? activeLocal.maquinas_fuera_de_servicio : '—'}
                </Text>
                <Text className="mt-1 text-[10px] font-semibold text-red-600">Inoperativas</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Encabezado fijo al llegar por scroll */}
        <TodayMaintenanceHeader totalCount={todayLog.page.totalCount} loading={todayLog.loading} />

        {/* Lista de intervenciones de hoy */}
        <View className="w-full max-w-xl self-center px-4 pt-3">
          <TodayMaintenanceList state={todayLog} />
        </View>
      </ScrollView>

      {/* Bottom Sheet accesible para cambiar de local */}
      <LocalBottomSheet
        visible={isLocalSheetOpen}
        locals={locals}
        activeLocalId={activeLocal?.id ?? null}
        isLoading={isLoadingLocals}
        error={localsError}
        onRefresh={() => void refreshLocals()}
        onSelect={(newLocal) => selectLocal(newLocal)}
        onClose={() => setIsLocalSheetOpen(false)}
      />
    </View>
  );
}
