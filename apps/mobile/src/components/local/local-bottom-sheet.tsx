import { Check, MapPin, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Local } from '@/types/local';

interface LocalBottomSheetProps {
  visible: boolean;
  locals: Local[];
  activeLocalId: string;
  onSelect: (local: Local) => void;
  onClose: () => void;
}

/**
 * Bottom Sheet modal to switch the active bowling venue/local.
 * Compatible with Android APK and Web PWA.
 */
export function LocalBottomSheet({
  visible,
  locals,
  activeLocalId,
  onSelect,
  onClose,
}: LocalBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return locals;
    return locals.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.commune.toLowerCase().includes(q) ||
        loc.machineModel.toLowerCase().includes(q),
    );
  }, [locals, searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/60">
        <Pressable
          onPress={(e) => {
            (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
          }}
          className="w-full max-w-xl self-center rounded-t-[28px] border-t border-slate-200 bg-white shadow-2xl"
        >
          {/* Drag handle */}
          <View className="mt-3 h-1.5 w-12 self-center rounded-full bg-slate-300" />

          {/* Header */}
          <View className="flex-row items-start justify-between px-5 pt-3 pb-2">
            <View className="flex-1 pr-3">
              <Text accessibilityRole="header" className="text-lg font-bold text-slate-900">
                Cambiar local
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Selecciona la instalación donde estás realizando mantención
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector de sala"
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
              style={{ cursor: 'pointer' }}
            >
              <X size={16} color="#64748b" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Quick search input */}
          <View className="px-5 pt-2 pb-3">
            <View className="min-h-[44px] flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search size={16} color="#94a3b8" strokeWidth={2.2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar sala por nombre o comuna..."
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Buscar sala por nombre o comuna"
                className="ml-2 flex-1 py-1 text-base text-slate-800"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  className="p-1 active:opacity-70"
                  style={{ cursor: 'pointer' }}
                >
                  <X size={14} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Scrollable list */}
          <ScrollView
            className="max-h-[60vh] px-5"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            }}
          >
            {filteredLocals.length === 0 ? (
              <View className="items-center justify-center py-8">
                <Text className="text-xs text-slate-400">
                  No se encontraron recintos que coincidan con &quot;{searchQuery}&quot;
                </Text>
              </View>
            ) : (
              filteredLocals.map((loc) => {
                const isActive = loc.id === activeLocalId;

                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => {
                      onSelect(loc);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar recinto ${loc.name}, ${
                      isActive ? 'actualmente activo' : ''
                    }`}
                    className={`mb-2.5 flex-row items-center justify-between rounded-2xl border p-3.5 active:opacity-80 ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm shadow-blue-500/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <View className="mr-3 flex-1 flex-row items-center">
                      <View
                        className={`mr-3 h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isActive ? 'border-blue-200 bg-blue-100' : 'border-slate-200 bg-slate-100'
                        }`}
                      >
                        <MapPin
                          size={18}
                          color={isActive ? '#2563eb' : '#64748b'}
                          strokeWidth={2.2}
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className={`text-sm font-bold ${
                              isActive ? 'text-blue-950' : 'text-slate-800'
                            }`}
                          >
                            {loc.name}
                          </Text>
                          {isActive ? (
                            <View className="rounded-full bg-blue-600 px-2 py-0.5">
                              <Text className="text-[10px] font-bold text-white">Activo</Text>
                            </View>
                          ) : null}
                        </View>

                        <Text className="mt-0.5 text-xs text-slate-500">
                          {loc.totalLanes} Pistas {loc.machineModel} • {loc.commune}
                        </Text>

                        <View className="mt-1 flex-row items-center gap-1.5">
                          <View
                            className={`h-1.5 w-1.5 rounded-full ${
                              loc.operationalLanes === loc.totalLanes
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <Text className="text-[11px] font-medium text-slate-600">
                            {loc.operationalLanes}/{loc.totalLanes} pistas operativas
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isActive ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-600">
                        <Check size={16} color="#ffffff" strokeWidth={2.6} />
                      </View>
                    ) : (
                      <View className="h-6 w-6 items-center justify-center rounded-full border border-slate-300" />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
