import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { getMachineStatusConfig } from '@/components/machines/machine-card';
import { Skeleton } from '@/components/shared/skeleton';
import { useLocals } from '@/hooks/use-locals';
import type { Machine } from '@/types/machine';

type MachineOverviewProps =
  { isLoading: true; machine?: Machine } | { isLoading?: false; machine: Machine };

export function MachineOverview(props: MachineOverviewProps) {
  return props.isLoading ? (
    <MachineOverviewSkeleton />
  ) : (
    <MachineOverviewContent machine={props.machine} />
  );
}

export function MachineOverviewSkeleton() {
  return (
    <Skeleton label="Cargando información del equipo">
      <View className="mb-4 rounded-xl bg-slate-200" style={{ aspectRatio: 4 / 3 }} />
      <View className="h-6 w-3/4 rounded-md bg-slate-200" />
      <View className="mb-2 mt-2 h-5 w-32 rounded-md bg-slate-200" />
      <View className="mt-2 flex-row flex-wrap">
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} className="min-w-[140px] flex-1 basis-1/2 py-3 pr-3">
            <View className="mb-2 h-3 w-20 rounded bg-slate-200" />
            <View className="h-5 w-4/5 rounded bg-slate-200" />
          </View>
        ))}
      </View>
    </Skeleton>
  );
}

function MachineOverviewContent({ machine }: { machine: Machine }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const [loadedPhotoUrl, setLoadedPhotoUrl] = useState<string | null>(null);
  const { locals, isLoading: isLoadingLocals } = useLocals();
  const local = locals.find((item) => item.id === machine.local_id);
  const status = getMachineStatusConfig(machine.estado_equipo);
  const lastMaintenance = machine.ultima_mantencion_at
    ? new Date(machine.ultima_mantencion_at).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin mantenciones registradas';
  const details = [
    ['Código del equipo', machine.codigo_interno],
    ['Categoría', machine.categoria.nombre],
    ['Marca', machine.marca?.nombre ?? 'Sin marca registrada'],
    ['Local', local?.nombre ?? 'Local no disponible'],
    ['Dirección', local?.direccion ?? 'Dirección no disponible'],
    ['Última mantención', lastMaintenance],
    ['Inventario', machine.activo ? 'Equipo activo' : 'Equipo inactivo'],
  ];

  return (
    <View>
      <View
        className="mb-4 items-center justify-center overflow-hidden rounded-xl bg-white"
        style={{ aspectRatio: 4 / 3 }}
      >
        {machine.foto_url && machine.foto_url !== failedPhotoUrl ? (
          <Image
            source={machine.foto_url}
            recyclingKey={machine.id}
            accessibilityLabel={`Fotografía de ${machine.nombre}`}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            onLoad={() => setLoadedPhotoUrl(machine.foto_url)}
            onError={() => setFailedPhotoUrl(machine.foto_url)}
          />
        ) : (
          <Text className="px-4 text-center text-sm text-slate-600">
            {machine.foto_url
              ? 'No se pudo cargar la fotografía del equipo'
              : 'Equipo sin fotografía registrada'}
          </Text>
        )}
        {machine.foto_url &&
        machine.foto_url !== failedPhotoUrl &&
        machine.foto_url !== loadedPhotoUrl ? (
          <View pointerEvents="none" className="absolute inset-0">
            <Skeleton label="Cargando fotografía del equipo">
              <View className="rounded-xl bg-slate-200" style={{ aspectRatio: 4 / 3 }} />
            </Skeleton>
          </View>
        ) : null}
      </View>
      <Text accessibilityRole="header" className="text-lg font-bold leading-7 text-slate-900">
        {machine.nombre}
      </Text>
      <View className="mb-2 mt-2 flex-row items-center gap-2">
        <View className={`h-2 w-2 rounded-full ${status.dotClassName}`} />
        <Text className={`text-sm font-semibold ${status.textClassName}`}>{status.label}</Text>
      </View>
      <View className="mt-2 flex-row flex-wrap">
        {details.map(([label, value]) => (
          <View key={label} className="min-w-[140px] flex-1 basis-1/2 py-3 pr-3">
            <Text className="text-xs text-slate-500">{label}</Text>
            {isLoadingLocals && !local && (label === 'Local' || label === 'Dirección') ? (
              <View className="mt-1">
                <Skeleton label={`Cargando ${label.toLowerCase()} del equipo`}>
                  <View className="h-5 w-4/5 rounded bg-slate-200" />
                </Skeleton>
              </View>
            ) : (
              <Text className="mt-1 text-sm font-medium leading-5 text-slate-800">{value}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
