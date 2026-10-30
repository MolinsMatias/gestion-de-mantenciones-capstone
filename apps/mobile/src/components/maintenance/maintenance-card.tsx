import { Check, ChevronRight, MapPin, Settings, Wrench, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/shared/skeleton';

import type { MaintenanceItem } from '@/types/maintenance';

export type MaintenanceCardProps = {
  onPress?: (item: MaintenanceItem) => void;
} & ({ isLoading: true; item?: MaintenanceItem } | { isLoading?: false; item: MaintenanceItem });

export function MaintenanceCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <Skeleton label="Cargando mantención">
        <View className="flex-row items-center">
          <View className="h-12 w-12 rounded-full bg-slate-200" />
          <View className="ml-3.5 mr-2 flex-1 gap-2">
            <View className="flex-row justify-between gap-3">
              <View className="h-4 flex-1 rounded bg-slate-200" />
              <View className="h-3 w-12 rounded bg-slate-200" />
            </View>
            <View className="h-3 w-3/5 rounded bg-slate-200" />
            <View className="h-3 w-4/5 rounded bg-slate-200" />
          </View>
          <View className="h-4 w-4 rounded bg-slate-200" />
        </View>
      </Skeleton>
    </View>
  );
}

/**
 * Renders the circular leading icon corresponding to the maintenance task type.
 */
function MaintenanceLeadingIcon({ type }: { type: MaintenanceItem['tipo_icono'] }) {
  if (type === 'zap') {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        className="h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-100/70 bg-blue-50/90"
      >
        <Zap size={20} color="#2563eb" fill="#2563eb" strokeWidth={1.5} />
      </View>
    );
  }

  if (type === 'settings') {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        className="h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
      >
        <Settings size={20} color="#334155" strokeWidth={1.9} />
      </View>
    );
  }

  if (type === 'completed') {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        className="h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-100/70 bg-emerald-50/90"
      >
        <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-xs">
          <Check size={15} color="#ffffff" strokeWidth={3} />
        </View>
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
    >
      <Wrench size={20} color="#334155" strokeWidth={1.9} />
    </View>
  );
}

/**
 * Maintenance Card displaying task, time, category, location and navigation indicator.
 */
export function MaintenanceCard(props: MaintenanceCardProps) {
  if (props.isLoading) return <MaintenanceCardSkeleton />;
  const { item, onPress } = props;
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.titulo}, ${item.categoria}, ${item.ubicacion}, programado para ${item.etiqueta_tiempo}`}
      accessibilityHint="Toca para ver los detalles de esta mantención"
      className="mb-3 flex-row items-center rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm active:bg-slate-50/90"
      style={onPress ? { cursor: 'pointer' } : undefined}
    >
      {/* Icono circular a la izquierda */}
      <MaintenanceLeadingIcon type={item.tipo_icono} />

      {/* Contenido central: Título + hora en primera fila, categoría y ubicación */}
      <View className="min-w-0 flex-1 ml-3.5 mr-2">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="flex-1 text-[15px] font-bold leading-snug text-slate-900"
          >
            {item.titulo}
          </Text>
          <Text className="shrink-0 text-xs font-medium text-slate-400">
            {item.etiqueta_tiempo}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="mt-0.5 text-xs leading-tight text-slate-500"
        >
          {item.categoria}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-1">
          <MapPin size={12} color="#94a3b8" strokeWidth={2} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-xs font-normal text-slate-500"
          >
            {item.ubicacion}
          </Text>
        </View>
      </View>

      {/* Indicador de navegación lateral */}
      <View accessible={false} importantForAccessibility="no-hide-descendants" className="pl-1">
        <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
      </View>
    </Pressable>
  );
}
