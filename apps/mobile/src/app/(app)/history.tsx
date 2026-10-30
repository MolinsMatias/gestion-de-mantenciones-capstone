import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaintenanceCard } from '@/components/maintenance/maintenance-card';
import { AppHeader } from '@/components/shared/app-header';
import type { MachineType, MaintenanceItem } from '@/types/maintenance';

interface FilterTab {
  id: MachineType;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pinsetter', label: 'Pinsetter' },
  { id: 'lanes', label: 'Pistas' },
  { id: 'ball_return', label: 'Retorno de bolas' },
  { id: 'scoring', label: 'Puntuación y Pantallas' },
];

const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  {
    id: '1',
    titulo: 'Revisión de pista 3',
    categoria: 'Mecánica de pista',
    tipo_maquina: 'lanes',
    ubicacion: 'Mampato - Las Condes',
    etiqueta_tiempo: 'Hoy, 14:00',
    tipo_icono: 'wrench',
  },
  {
    id: '2',
    titulo: 'Calibración de sensórica',
    categoria: 'Sistemas de puntuación',
    tipo_maquina: 'scoring',
    ubicacion: 'Mampato - Las Condes',
    etiqueta_tiempo: 'Hoy, 10:30',
    tipo_icono: 'zap',
  },
  {
    id: '3',
    titulo: 'Limpieza de retorno de bolas',
    categoria: 'Mecánica / Limpieza',
    tipo_maquina: 'ball_return',
    ubicacion: 'Happyland - Viña del Mar',
    etiqueta_tiempo: 'Ayer, 13:00',
    tipo_icono: 'settings',
  },
  {
    id: '4',
    titulo: 'Revisión de monitores',
    categoria: 'Electrónica / Software',
    tipo_maquina: 'scoring',
    ubicacion: 'Monticello - San Francisco',
    etiqueta_tiempo: 'Ayer, 11:20',
    tipo_icono: 'completed',
  },
  {
    id: '5',
    titulo: 'Mantención preventiva',
    categoria: 'Pinsetter GS-X',
    tipo_maquina: 'pinsetter',
    ubicacion: 'Mampato - Las Condes',
    etiqueta_tiempo: 'Ayer, 09:00',
    tipo_icono: 'wrench',
  },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<MachineType>('all');

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return MAINTENANCE_ITEMS;
    return MAINTENANCE_ITEMS.filter((item) => item.tipo_maquina === selectedFilter);
  }, [selectedFilter]);

  const handleSelectMaintenance = (item: MaintenanceItem) => {
    Alert.alert(item.titulo, `${item.categoria}\nUbicación: ${item.ubicacion}`);
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Cabecera institucional fija superior */}
      <AppHeader
        title="Historial"
        subtitle="Registro de intervenciones y tareas"
        showConnectivity={true}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 84,
          paddingHorizontal: 16,
        }}
      >
        <View className="w-full max-w-xl self-center">
          {/* Barra de filtros rápidos por estado */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3.5 -mx-1"
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = selectedFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setSelectedFilter(tab.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${tab.label}`}
                  accessibilityState={{ selected: isActive }}
                  className={`mr-2 rounded-full px-3.5 py-1.5 transition-colors ${
                    isActive
                      ? 'border border-blue-600 bg-blue-600 shadow-xs'
                      : 'border border-slate-200/90 bg-white active:bg-slate-50'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Listado de tarjetas de mantención */}
          {filteredItems.length === 0 ? (
            <View className="items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <Text className="text-sm font-medium text-slate-500">
                No hay mantenciones en este estado.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <MaintenanceCard key={item.id} item={item} onPress={handleSelectMaintenance} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
