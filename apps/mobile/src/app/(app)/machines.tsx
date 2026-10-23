import { Image, type ImageSource } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, QrCode, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/shared/app-header';

const bowlingImg = require('@/assets/images/maquinas/bowling.jpg');
const bowlingBgImg = require('@/assets/images/maquinas/bowling2.webp');
const arcadeDaytonaImg = require('@/assets/images/maquinas/arcade_daytona.jpg');
const flipperAddamsImg = require('@/assets/images/maquinas/fippler_addams.webp');
const redemptionIceImg = require('@/assets/images/maquinas/redemption_ice.jpg');
const arcadeCabinetImg = require('@/assets/images/maquinas/arcade.webp');

type MachineCategory = 'Todos' | 'Bowling' | 'Arcade' | 'Redemption' | 'Flipper';
type MachineStatus = 'operational' | 'operational_with_details' | 'out_of_service';

interface MachineItem {
  id: string;
  name: string;
  category: Exclude<MachineCategory, 'Todos'>;
  code: string;
  status: MachineStatus;
  imageSource: ImageSource | number;
}

const CATEGORIES: MachineCategory[] = ['Todos', 'Bowling', 'Arcade', 'Redemption', 'Flipper'];

const STATUS_FILTER_OPTIONS: { value: 'all' | MachineStatus; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'operational', label: 'Operativa' },
  { value: 'operational_with_details', label: 'Operativa con detalles' },
  { value: 'out_of_service', label: 'Fuera de servicio' },
];

const MACHINES_DATA: MachineItem[] = [
  {
    id: 'bwl-001',
    name: 'Pista 1',
    category: 'Bowling',
    code: 'BWL-001',
    status: 'operational',
    imageSource: bowlingImg,
  },
  {
    id: 'bwl-005',
    name: 'Pista 5',
    category: 'Bowling',
    code: 'BWL-005',
    status: 'operational_with_details',
    imageSource: bowlingBgImg,
  },
  {
    id: 'arc-012',
    name: 'Daytona USA',
    category: 'Arcade',
    code: 'ARC-012',
    status: 'out_of_service',
    imageSource: arcadeDaytonaImg,
  },
  {
    id: 'flp-003',
    name: 'The Addams Family',
    category: 'Flipper',
    code: 'FLP-003',
    status: 'operational',
    imageSource: flipperAddamsImg,
  },
  {
    id: 'rdm-004',
    name: 'Ice Ball FX',
    category: 'Redemption',
    code: 'RDM-004',
    status: 'operational',
    imageSource: redemptionIceImg,
  },
  {
    id: 'arc-018',
    name: 'Pac-Man Arcade',
    category: 'Arcade',
    code: 'ARC-018',
    status: 'operational',
    imageSource: arcadeCabinetImg,
  },
];

function getStatusConfig(status: MachineStatus): {
  label: string;
  dotClassName: string;
  textClassName: string;
} {
  switch (status) {
    case 'operational':
      return {
        label: 'Operativa',
        dotClassName: 'bg-emerald-600',
        textClassName: 'text-emerald-700',
      };
    case 'operational_with_details':
      return {
        label: 'Operativa con detalles',
        dotClassName: 'bg-amber-500',
        textClassName: 'text-amber-600',
      };
    case 'out_of_service':
      return {
        label: 'Fuera de servicio',
        dotClassName: 'bg-red-500',
        textClassName: 'text-red-600',
      };
  }
}

export default function MachinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MachineCategory>('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | MachineStatus>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredMachines = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return MACHINES_DATA.filter((machine) => {
      const matchesCategory = selectedCategory === 'Todos' || machine.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        machine.name.toLowerCase().includes(normalizedQuery) ||
        machine.code.toLowerCase().includes(normalizedQuery) ||
        machine.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [searchQuery, selectedCategory, statusFilter]);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <AppHeader
        title="Máquinas"
        subtitle="Consulta y registra mantenciones"
        showConnectivity={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 92,
        }}
      >
        <View className="w-full max-w-xl self-center">
          {/* Buscador + Botón de escaneo QR */}
          <View className="flex-row items-center gap-2.5 px-4">
            <View className="min-h-[46px] flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
              <Search size={18} color="#64748b" strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre o código"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Buscar equipo por nombre o código"
                returnKeyType="search"
                autoCorrect={false}
                className="ml-2.5 flex-1 py-2.5 text-sm text-slate-900"
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
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 4,
              gap: 8,
            }}
          >
            {CATEGORIES.map((category) => {
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
          <View className="mt-3 flex-row items-center justify-between px-4">
            <Text className="text-xs font-medium text-slate-500">
              {filteredMachines.length} {filteredMachines.length === 1 ? 'equipo' : 'equipos'}
            </Text>

            <Pressable
              onPress={() => setIsFilterOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Filtrar equipos por estado operativo"
              accessibilityState={{ expanded: isFilterOpen }}
              className="min-h-[36px] flex-row items-center gap-1.5 rounded-lg px-2 py-1.5 active:bg-slate-100"
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

          {/* Listado de tarjetas de equipos */}
          <View className="mt-2.5 flex-col gap-3 px-4">
            {filteredMachines.length === 0 ? (
              <View className="items-center rounded-2xl border border-slate-200/80 bg-white px-5 py-8 shadow-sm">
                <Text className="text-center text-sm font-semibold text-slate-800">
                  No se encontraron equipos
                </Text>
                <Text className="mt-1 text-center text-xs text-slate-500">
                  Prueba ajustando el texto de búsqueda o los filtros seleccionados.
                </Text>
              </View>
            ) : (
              filteredMachines.map((machine) => {
                const statusInfo = getStatusConfig(machine.status);

                return (
                  <Pressable
                    key={machine.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${machine.name}, ${machine.category}, código ${machine.code}, estado ${statusInfo.label}`}
                    className="flex-row items-center rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm active:bg-slate-50"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Miniatura del equipo */}
                    <View className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      <Image
                        source={machine.imageSource}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        contentPosition="center"
                      />
                    </View>

                    {/* Información principal del equipo (sin badge de reparación pendiente) */}
                    <View className="ml-3.5 min-w-0 flex-1 justify-center">
                      <Text
                        numberOfLines={1}
                        className="text-base font-bold leading-snug text-slate-900"
                      >
                        {machine.name}
                      </Text>

                      <Text numberOfLines={1} className="mt-0.5 text-xs font-medium text-slate-500">
                        {machine.category} · {machine.code}
                      </Text>

                      <View className="mt-2 flex-row items-center">
                        <View
                          className={`mr-2 h-2.5 w-2.5 rounded-full ${statusInfo.dotClassName}`}
                        />
                        <Text className={`text-xs font-semibold ${statusInfo.textClassName}`}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    {/* Indicador de navegación */}
                    <View className="ml-2 pl-1">
                      <ChevronRight size={20} color="#64748b" strokeWidth={2} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
