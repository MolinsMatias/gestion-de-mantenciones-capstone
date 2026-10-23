import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Blocks, House, QrCode, User, ClipboardList, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/theme';

interface TabItem {
  label: string;
  icon: LucideIcon;
  /** Acción central elevada; el resto de pestañas se reparte a ambos lados. */
  primary?: boolean;
}

// Se indexa por nombre de ruta de `(app)`; el orden visual lo define el layout.
const TAB_ITEMS: Record<string, TabItem> = {
  index: { label: 'Inicio', icon: House },
  machines: { label: 'Maquinas', icon: Blocks },
  scan: { label: 'Escanear', icon: QrCode, primary: true },
  history: { label: 'Historial', icon: ClipboardList },
  profile: { label: 'Perfil', icon: User },
};

const ICON_SIZE = 24;
const PRIMARY_SIZE = 64;
// Cuánto sobresale el botón central por encima de la barra.
const PRIMARY_LIFT = 28;
const PRIMARY_SLOT_WIDTH = 76;

const shadowBar = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 12,
} as const;

const shadowPrimary = {
  shadowColor: BrandColors.blue,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 16,
} as const;

/**
 * Barra de navegación inferior compartida por Android y la PWA.
 * El estado activo se identifica mediante el cambio de color al azul institucional.
 */
export function AppTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const primaryRoute = state.routes.find((route) => TAB_ITEMS[route.name]?.primary);
  const primaryIndex = primaryRoute ? state.routes.indexOf(primaryRoute) : -1;

  const emitPress = (routeKey: string, routeName: string, params: object | undefined) => {
    const isFocused = state.routes[state.index]?.key === routeKey;
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName, params);
    }
  };

  return (
    // La zona transparente sobre la barra aloja la parte elevada del botón central sin crear un hueco negro.
    <View pointerEvents="box-none" style={{ overflow: 'visible' }}>
      <View
        className="rounded-t-[28px] bg-white"
        style={[{ paddingBottom: Math.max(insets.bottom, 8) }, shadowBar]}
      >
        <View
          accessibilityRole="tablist"
          className="w-full max-w-xl flex-row self-center px-2 pt-2"
        >
          {state.routes.map((route, index) => {
            const item = TAB_ITEMS[route.name];
            if (!item) return null;

            if (item.primary) {
              // Reserva el hueco que cubre el botón flotante para mantener el resto simétrico.
              return <View key={route.key} style={{ width: PRIMARY_SLOT_WIDTH }} />;
            }

            const isFocused = state.index === index;
            const Icon = item.icon;
            const color = isFocused ? BrandColors.blue : BrandColors.iconInactive;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isFocused }}
                onPress={() => emitPress(route.key, route.name, route.params)}
                className="min-h-[56px] flex-1 items-center justify-center gap-1 active:opacity-70"
                style={{ cursor: 'pointer' }}
              >
                <View pointerEvents="none" className="items-center justify-center gap-1">
                  <Icon size={ICON_SIZE} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
                  <Text
                    className={`text-xs ${isFocused ? 'font-bold text-brand-blue' : 'font-medium text-slate-500'}`}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {primaryRoute && primaryIndex >= 0 ? (
        <View
          pointerEvents="box-none"
          className="absolute items-center"
          style={{
            top: -PRIMARY_LIFT,
            left: '50%',
            marginLeft: -PRIMARY_SIZE / 2,
            width: PRIMARY_SIZE,
            height: PRIMARY_SIZE,
            zIndex: 10,
          }}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={TAB_ITEMS[primaryRoute.name].label}
            accessibilityState={{ selected: state.index === primaryIndex }}
            onPress={() => emitPress(primaryRoute.key, primaryRoute.name, primaryRoute.params)}
            className="items-center justify-center rounded-full border-4 border-white bg-brand-blue active:bg-blue-700"
            style={[
              { width: PRIMARY_SIZE, height: PRIMARY_SIZE, cursor: 'pointer' },
              shadowPrimary,
            ]}
          >
            <View pointerEvents="none" className="items-center justify-center">
              <QrCode size={28} color="#ffffff" strokeWidth={2} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default AppTabs;
