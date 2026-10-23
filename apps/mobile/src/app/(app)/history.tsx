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
    title: 'Revisión de pista 3',
    category: 'Mecánica de pista',
    machineType: 'lanes',
    location: 'Mampato - Las Condes',
    timeLabel: 'Hoy, 14:00',
    iconType: 'wrench',
  },
  {
    id: '2',
    title: 'Calibración de sensórica',
    category: 'Sistemas de puntuación',
    machineType: 'scoring',
    location: 'Mampato - Las Condes',
    timeLabel: 'Hoy, 10:30',
    iconType: 'zap',
  },
  {
    id: '3',
    title: 'Limpieza de retorno de bolas',
    category: 'Mecánica / Limpieza',
    machineType: 'ball_return',
    location: 'Happyland - Viña del Mar',
    timeLabel: 'Ayer, 13:00',
    iconType: 'settings',
  },
  {
    id: '4',
    title: 'Revisión de monitores',
    category: 'Electrónica / Software',
    machineType: 'scoring',
    location: 'Monticello - San Francisco',
    timeLabel: 'Ayer, 11:20',
    iconType: 'completed',
  },
  {
    id: '5',
    title: 'Mantención preventiva',
    category: 'Pinsetter GS-X',
    machineType: 'pinsetter',
    location: 'Mampato - Las Condes',
    timeLabel: 'Ayer, 09:00',
    iconType: 'wrench',
  },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<MachineType>('all');

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return MAINTENANCE_ITEMS;
    return MAINTENANCE_ITEMS.filter((item) => item.machineType === selectedFilter);
  }, [selectedFilter]);

  const handleSelectMaintenance = (item: MaintenanceItem) => {
    Alert.alert(item.title, `${item.category}\nUbicación: ${item.location}`);
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Cabecera institucional fija superior */}
      <AppHeader
        title="Historial"
        subtitle="Registro de intervenciones y tareas"
        showConnectivity={false}
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
