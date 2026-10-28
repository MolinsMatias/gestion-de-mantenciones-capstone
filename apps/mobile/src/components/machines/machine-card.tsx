import { Image } from 'expo-image';
import { ChevronRight, Gamepad2 } from 'lucide-react-native';
import React, { memo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import type { Machine, MachineStatus } from '@/types/machine';

export interface MachineCardProps {
  machine: Machine;
  onPress?: (machine: Machine) => void;
}

export function getMachineStatusConfig(status: MachineStatus): {
  label: string;
  dotClassName: string;
  textClassName: string;
} {
  switch (status) {
    case 'operativa':
      return {
        label: 'Operativa',
        dotClassName: 'bg-emerald-600',
        textClassName: 'text-emerald-700',
      };
    case 'operativa_con_observaciones':
      return {
        label: 'Operativa con detalles',
        dotClassName: 'bg-amber-500',
        textClassName: 'text-amber-600',
      };
    case 'fuera_de_servicio':
      return {
        label: 'Fuera de servicio',
        dotClassName: 'bg-red-500',
        textClassName: 'text-red-600',
      };
  }
}

function MachineCardComponent({ machine, onPress }: MachineCardProps) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const statusInfo = getMachineStatusConfig(machine.estado_equipo);

  const canShowRemotePhoto = Boolean(machine.foto_url && machine.foto_url !== failedPhotoUrl);

  const subtitleParts = [
    machine.categoria.nombre,
    machine.marca?.nombre,
    machine.codigo_interno,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={() => onPress?.(machine)}
      accessibilityRole="button"
      accessibilityLabel={`${machine.nombre}, ${machine.categoria.nombre}, código ${machine.codigo_interno}, estado ${statusInfo.label}`}
      className="flex-row items-center rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm active:bg-slate-50"
      style={onPress ? { cursor: 'pointer' } : undefined}
    >
      {/* Miniatura del equipo desde Supabase Storage o placeholder vectorial */}
      <View className="relative h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {canShowRemotePhoto && machine.foto_url ? (
          <Image
            source={machine.foto_url}
            recyclingKey={machine.id}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            contentPosition="center"
            transition={Platform.OS === 'web' ? 0 : 120}
            cachePolicy="memory-disk"
            onError={() => {
              setFailedPhotoUrl(machine.foto_url);
            }}
          />
        ) : (
          <Gamepad2 size={26} color="#94a3b8" strokeWidth={1.8} />
        )}
      </View>

      {/* Información principal del equipo */}
      <View className="ml-3.5 min-w-0 flex-1 justify-center">
        <Text numberOfLines={1} className="text-base font-bold leading-snug text-slate-900">
          {machine.nombre}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 text-xs font-medium text-slate-500">
          {subtitleParts.join(' · ')}
        </Text>

        <View className="mt-2 flex-row items-center">
          <View className={`mr-2 h-2.5 w-2.5 rounded-full ${statusInfo.dotClassName}`} />
          <Text className={`text-xs font-semibold ${statusInfo.textClassName}`}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Indicador de navegación */}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        className="ml-2 pl-1"
      >
        <ChevronRight size={20} color="#64748b" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

export const MachineCard = memo(MachineCardComponent);
