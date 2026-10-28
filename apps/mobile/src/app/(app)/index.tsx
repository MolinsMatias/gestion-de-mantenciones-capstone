import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Check,
  ClipboardList,
  Clock,
  MapPin,
  Plus,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocalBottomSheet } from '@/components/local/local-bottom-sheet';
import { AppHeader } from '@/components/shared/app-header';
import { useLocals } from '@/hooks/use-locals';
import { useNetworkStatus } from '@/hooks/use-network-status';

const bowlingBg = require('@/assets/images/bowling-bg.jpg');

interface BitacoraItem {
  id: string;
  pista: string;
  titulo: string;
  descripcion: string;
  hora: string;
  insumos: string;
  tiempo: string;
  tipo: 'calibracion' | 'reemplazo' | 'ajuste';
}

const BITACORA_ITEMS: BitacoraItem[] = [
  {
    id: '1',
    pista: 'Pista 4',
    titulo: 'Pista 4 - Calibración switch detector bolos',
    descripcion: 'Ajuste de sensibilidad en celda fotoeléctrica y limpieza de lente',
    hora: '14:15',
    insumos: 'Ninguno',
    tiempo: '25 min',
    tipo: 'calibracion',
  },
  {
    id: '2',
    pista: 'Pista 2',
    titulo: 'Pista 2 - Reemplazo faja pinsetter',
    descripcion: 'Cambio preventivo de correa transmisora y engrase de rodamientos',
    hora: '11:20',
    insumos: 'Faja mod. GS-X #441',
    tiempo: '40 min',
    tipo: 'reemplazo',
  },
  {
    id: '3',
    pista: 'Pista 7',
    titulo: 'Pista 7 - Ajuste de tensión cadena elevador',
    descripcion: 'Revisión de holgura en elevador de bolas y prueba de retorno',
    hora: '09:45',
    insumos: 'Ninguno',
    tiempo: '20 min',
    tipo: 'ajuste',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleNewIntervention = () => {
    router.push('/(app)/machines');
  };

  const { isOnline, isSimulatingOffline, toggleSimulatedOffline, checkConnectivityNow } =
    useNetworkStatus();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { locals, activeLocal, isLoading: isLoadingLocals, selectLocal } = useLocals();
  const [isLocalSheetOpen, setIsLocalSheetOpen] = useState(false);

  const handleConnectivityPress = () => {
    setIsStatusModalOpen(true);
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 84,
        }}
      >
        {/* Cabecera oscura institucional */}
        <AppHeader isOnline={isOnline} onPressConnectivity={handleConnectivityPress} />

        {/* Contenido principal con desplazamiento centrado */}
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
                  onPress={() => setIsLocalSheetOpen(true)}
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
                Anota ajustes de pinsetter, cambios o manteción en segundos
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

          {/* Métricas del turno: grilla de 3 columnas */}
          <View className="flex-row gap-2.5">
            {/* Columna 1: Intervenciones */}
            <View
              className="relative min-h-[100px] flex-1 justify-between rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <View className="absolute right-2.5 top-2.5" pointerEvents="none">
                <ClipboardList size={14} color="#2563eb" strokeWidth={2} />
              </View>
              <View className="pr-4">
                <Text
                  className="text-[10px] font-bold leading-tight text-blue-600"
                  style={{ letterSpacing: 0.3 }}
                >
                  {'INTER\u200BVENCIONES'}
                </Text>
              </View>
              <View className="mt-2">
                <Text className="text-2xl font-extrabold leading-none text-slate-900">3</Text>
                <Text className="mt-1 text-[10px] font-semibold text-blue-600">
                  Registradas hoy
                </Text>
              </View>
            </View>

            {/* Columna 2: Revisadas */}
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
                  REVISADAS
                </Text>
              </View>
              <View className="mt-2">
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-extrabold leading-none text-slate-900">10</Text>
                  <Text className="ml-1 text-xs font-semibold text-slate-400">/ 14</Text>
                </View>
                <Text className="mt-1 text-[10px] font-semibold text-emerald-600">
                  Pistas auditadas
                </Text>
              </View>
            </View>

            {/* Columna 3: Turno */}
            <View
              className="relative min-h-[100px] flex-1 justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"
              style={{ borderRadius: 16 }}
            >
              <View className="absolute right-2.5 top-2.5" pointerEvents="none">
                <Clock size={14} color="#64748b" strokeWidth={2} />
              </View>
              <View className="pr-4">
                <Text
                  className="text-[10px] font-bold leading-tight text-slate-600"
                  style={{ letterSpacing: 0.3 }}
                >
                  TURNO
                </Text>
              </View>
              <View className="mt-2">
                <Text className="text-2xl font-extrabold leading-none text-slate-900">5.2h</Text>
                <Text className="mt-1 text-[10px] font-medium text-slate-500">
                  En terreno activo
                </Text>
              </View>
            </View>
          </View>

          {/* Sección: Mi bitácora de terreno hoy */}
          <View className="mb-2 flex-col gap-2.5">
            <View className="flex-row items-center justify-between px-0.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-slate-900">Mi bitácora de terreno hoy</Text>
                <View className="rounded-full bg-blue-100 px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-blue-700">
                    {BITACORA_ITEMS.length}
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] font-semibold text-slate-500">Cronológico</Text>
            </View>

            {/* Listado de intervenciones registradas */}
            {BITACORA_ITEMS.map((item) => {
              const isCalibracion = item.tipo === 'calibracion';
              const isReemplazo = item.tipo === 'reemplazo';

              return (
                <View
                  key={item.id}
                  className="flex-col gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="mr-2 flex-1 flex-row items-start gap-2.5">
                      <View
                        className={`mt-0.5 h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          isCalibracion
                            ? 'border-blue-100 bg-blue-50'
                            : isReemplazo
                              ? 'border-emerald-100 bg-emerald-50'
                              : 'border-slate-200 bg-slate-100'
                        }`}
                      >
                        {isCalibracion ? (
                          <Wrench size={16} color="#2563eb" strokeWidth={2.2} />
                        ) : isReemplazo ? (
                          <Check size={16} color="#059669" strokeWidth={2.2} />
                        ) : (
                          <SlidersHorizontal size={16} color="#334155" strokeWidth={2.2} />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-900">{item.titulo}</Text>
                        <Text className="mt-0.5 text-xs text-slate-500">{item.descripcion}</Text>
                      </View>
                    </View>

                    <View
                      className={`shrink-0 rounded-full border px-2 py-0.5 ${
                        isCalibracion
                          ? 'border-blue-100 bg-blue-50'
                          : isReemplazo
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isCalibracion
                            ? 'text-blue-700'
                            : isReemplazo
                              ? 'text-emerald-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {item.hora}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <Text className="text-[11px] text-slate-500">
                      Insumos: {item.insumos} • Tiempo: {item.tiempo}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ver ficha de ${item.titulo}`}
                      className="active:opacity-70"
                      style={{ cursor: 'pointer' }}
                    >
                      <Text className="text-[11px] font-bold text-blue-600">Ver ficha</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modal interactivo de sincronización y estado de red (compatible con Android APK y PWA Web) */}
      <Modal
        visible={isStatusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStatusModalOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setIsStatusModalOpen(false)}
          className="flex-1 items-center justify-center bg-black/60 p-5"
        >
          <Pressable
            onPress={(e) => {
              (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
            }}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <View className="items-center text-center">
              <View
                className={`mb-3.5 h-14 w-14 items-center justify-center rounded-2xl ${
                  isOnline
                    ? 'border border-emerald-200 bg-emerald-50'
                    : 'border border-amber-200 bg-amber-50'
                }`}
              >
                {isOnline ? (
                  <Wifi size={28} color="#059669" strokeWidth={2.4} />
                ) : (
                  <WifiOff size={28} color="#d97706" strokeWidth={2.4} />
                )}
              </View>

              <Text className="text-center text-lg font-bold text-slate-900">
                {isOnline ? 'Conexión a Internet activa' : 'Modo local (Sin conexión)'}
              </Text>

              <View
                className={`mt-1.5 rounded-full px-2.5 py-0.5 ${
                  isOnline ? 'bg-emerald-100' : 'bg-amber-100'
                }`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    isOnline ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {isOnline
                    ? 'Sincronización con base de datos activa'
                    : 'Guardando datos en el dispositivo'}
                </Text>
              </View>

              <Text className="mt-3.5 text-center text-sm leading-relaxed text-slate-600">
                {isOnline
                  ? 'Estás conectado a internet. Todas las intervenciones, pautas y registros se sincronizan directamente con la base de datos central en la nube.'
                  : 'No se detecta conexión a internet. Los registros y mantenciones se guardan localmente en el dispositivo y se sincronizarán al recuperar la señal.'}
              </Text>
            </View>

            <View className="mt-6 flex-col gap-2.5">
              <Pressable
                onPress={() => {
                  if (isOnline || isSimulatingOffline) {
                    toggleSimulatedOffline();
                  } else {
                    void checkConnectivityNow();
                  }
                  setIsStatusModalOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={isOnline ? 'Simular modo local' : 'Restablecer conexión'}
                className={`w-full items-center justify-center rounded-xl py-3 active:opacity-85 ${
                  isOnline ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <Text className="text-sm font-bold text-white">
                  {isOnline
                    ? 'Simular modo local (prueba)'
                    : isSimulatingOffline
                      ? 'Restablecer conexión (En línea)'
                      : 'Verificar conexión ahora'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsStatusModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Entendido, cerrar diálogo"
                className="w-full items-center justify-center rounded-xl bg-slate-100 py-2.5 active:bg-slate-200"
                style={{ cursor: 'pointer' }}
              >
                <Text className="text-sm font-semibold text-slate-700">Entendido</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Sheet accesible para cambiar de local */}
      <LocalBottomSheet
        visible={isLocalSheetOpen}
        locals={locals}
        activeLocalId={activeLocal?.id ?? null}
        isLoading={isLoadingLocals}
        onSelect={(newLocal) => selectLocal(newLocal)}
        onClose={() => setIsLocalSheetOpen(false)}
      />
    </View>
  );
}
