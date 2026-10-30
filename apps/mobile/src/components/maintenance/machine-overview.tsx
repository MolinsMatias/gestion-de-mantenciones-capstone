import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { getMachineStatusConfig } from '@/components/machines/machine-card';
import { useLocals } from '@/hooks/use-locals';
import type { Machine } from '@/types/machine';

export function MachineOverview({ machine }: { machine: Machine }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const { locals } = useLocals();
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
            onError={() => setFailedPhotoUrl(machine.foto_url)}
          />
        ) : (
          <Text className="px-4 text-center text-sm text-slate-600">
            {machine.foto_url
              ? 'No se pudo cargar la fotografía del equipo'
              : 'Equipo sin fotografía registrada'}
          </Text>
        )}
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
            <Text className="mt-1 text-sm font-medium leading-5 text-slate-800">{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
