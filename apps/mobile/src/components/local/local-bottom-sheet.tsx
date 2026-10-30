import { Check, MapPin, Search, X, RefreshCw } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAvoidingContainer } from '@/components/shared/keyboard-avoiding-container';
import type { Local } from '@/types/local';

export interface LocalBottomSheetProps {
  visible: boolean;
  locals: Local[];
  activeLocalId: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelect: (local: Local) => void;
  onClose: () => void;
}

export function LocalBottomSheet({
  visible,
  locals,
  activeLocalId,
  isLoading = false,
  error,
  onRefresh,
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
        loc.nombre.toLowerCase().includes(q) ||
        loc.direccion.toLowerCase().includes(q) ||
        loc.comuna_nombre.toLowerCase().includes(q) ||
        (loc.region_nombre?.toLowerCase().includes(q) ?? false),
    );
  }, [locals, searchQuery]);

  const handleClose = () => {
    onClose();
  };

  const renderSheetContent = () => (
    <>
      {/* Indicador superior de arrastre */}
      <View className="mt-3 h-1.5 w-12 self-center rounded-full bg-slate-300" />

      {/* Cabecera del modal */}
      <View className="flex-row items-start justify-between px-5 pt-3 pb-2">
        <View className="flex-1 pr-3">
          <Text accessibilityRole="header" className="text-lg font-bold text-slate-900">
            Cambiar local
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Selecciona el local donde estás realizando mantención
          </Text>
        </View>

        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de local"
          className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
          style={{ cursor: 'pointer' }}
        >
          <X size={16} color="#64748b" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Buscador rápido de locales */}
      <View className="px-5 pt-2 pb-3">
        <View className="min-h-[44px] flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Search size={16} color="#94a3b8" strokeWidth={2.2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar local por nombre, dirección o comuna..."
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Buscar local por nombre, dirección o comuna"
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

      {onRefresh ? (
        <View className="flex-row items-center justify-between gap-3 px-5 pb-3">
          <Text accessibilityLiveRegion="polite" className="flex-1 text-xs text-slate-600">
            {isLoading
              ? 'Actualizando locales...'
              : `${locals.length} ${locals.length === 1 ? 'local disponible' : 'locales disponibles'}`}
          </Text>
          <Pressable
            onPress={onRefresh}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Actualizar lista de locales"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 active:bg-slate-100 ${isLoading ? 'opacity-60' : ''}`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <RefreshCw size={16} color="#2563eb" />
            )}
            <Text className="text-xs font-semibold text-blue-700">Actualizar</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <Text className="text-sm font-semibold text-amber-900">
            No se pudo actualizar la lista
          </Text>
          <Text className="mt-1 text-xs leading-5 text-amber-900">
            {locals.length > 0
              ? 'Se muestran los datos guardados en este dispositivo. Revisa tu conexión e intenta actualizar nuevamente.'
              : 'Revisa tu conexión y pulsa Actualizar para reintentar.'}
          </Text>
        </View>
      ) : null}

      {/* Listado desplazable de locales */}
      <ScrollView
        className="px-5"
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
      >
        {isLoading && locals.length === 0 ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="mt-2.5 text-xs font-medium text-slate-500">
              Cargando locales disponibles...
            </Text>
          </View>
        ) : filteredLocals.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Text className="text-center text-xs text-slate-400">
              {searchQuery.trim().length > 0
                ? `No se encontraron locales que coincidan con "${searchQuery}"`
                : error
                  ? 'No hay locales guardados para mostrar.'
                  : 'No hay locales activos disponibles.'}
            </Text>
          </View>
        ) : (
          filteredLocals.map((loc) => {
            const isActive = loc.id === activeLocalId;
            const locationSubtitle = [loc.direccion, loc.comuna_nombre].filter(Boolean).join(' • ');
            const allOperational =
              loc.total_maquinas === 0 || loc.maquinas_operativas === loc.total_maquinas;

            return (
              <Pressable
                key={loc.id}
                onPress={() => {
                  onSelect(loc);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar local ${loc.nombre}${
                  isActive ? ', actualmente activo' : ''
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
                    <MapPin size={18} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={2.2} />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className={`text-sm font-bold ${
                          isActive ? 'text-blue-950' : 'text-slate-800'
                        }`}
                      >
                        {loc.nombre}
                      </Text>
                      {isActive ? (
                        <View className="rounded-full bg-blue-600 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-white">Activo</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="mt-0.5 text-xs text-slate-500">{locationSubtitle}</Text>

                    <View className="mt-1 flex-row items-center gap-1.5">
                      <View
                        className={`h-1.5 w-1.5 rounded-full ${
                          allOperational ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <Text className="text-[11px] font-medium text-slate-600">
                        {loc.maquinas_operativas}/{loc.total_maquinas}{' '}
                        {loc.total_maquinas === 1 ? 'máquina operativa' : 'máquinas operativas'}
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
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {Platform.OS === 'web' ? (
        <KeyboardAvoidingContainer
          className="flex-1 bg-black/60"
          style={{
            justifyContent: 'flex-end',
            paddingTop: Math.max(insets.top, 12),
          }}
        >
          <Pressable onPress={handleClose} accessible={false} style={StyleSheet.absoluteFill} />
          <View
            className="w-full max-w-xl self-center overflow-hidden rounded-t-[28px] border-t border-slate-200 bg-white shadow-2xl"
            style={{ height: '78%', maxHeight: '100%' }}
          >
            {renderSheetContent()}
          </View>
        </KeyboardAvoidingContainer>
      ) : (
        <Pressable onPress={handleClose} className="flex-1 bg-black/60">
          <KeyboardAvoidingContainer style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              onPress={(e) => {
                (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
              }}
              className="w-full max-w-xl self-center rounded-t-[28px] border-t border-slate-200 bg-white shadow-2xl"
              style={{ height: '70%' }}
            >
              {renderSheetContent()}
            </Pressable>
          </KeyboardAvoidingContainer>
        </Pressable>
      )}
    </Modal>
  );
}
