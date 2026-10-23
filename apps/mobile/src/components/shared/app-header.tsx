import { Wifi, WifiOff } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { getGreetingName } from '@/services/user';

export interface AppHeaderProps {
  /**
   * Main title. If omitted, defaults to "¡Hola, {greetingName}!"
   */
  title?: string;
  /**
   * Subtitle text. Defaults to "Mantén la operación en marcha" when title is omitted.
   */
  subtitle?: string;
  /**
   * Current online/local connectivity status. Default: true
   */
  isOnline?: boolean;
  /**
   * Whether to show the connectivity pill button. Default: true
   */
  showConnectivity?: boolean;
  /**
   * Callback fired when connectivity pill is pressed.
   */
  onPressConnectivity?: () => void;
  /**
   * Custom element rendered on the right side instead of the connectivity pill.
   */
  rightElement?: React.ReactNode;
  /**
   * Optional custom children to render below the title row inside the dark header container.
   */
  children?: React.ReactNode;
  /**
   * Optional additional className for outer container.
   */
  className?: string;
}

/**
 * Institutional dark header component used across mobile app screens.
 * Responsive, accessible, and respects safe area top insets.
 */
export function AppHeader({
  title,
  subtitle,
  isOnline = true,
  showConnectivity = true,
  onPressConnectivity,
  rightElement,
  children,
  className = '',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();

  const greetingName = getGreetingName(profile, session?.user?.user_metadata, session?.user?.email);

  const resolvedTitle = title ?? `¡Hola, ${greetingName}!`;
  const resolvedSubtitle =
    subtitle !== undefined ? subtitle : title ? undefined : 'Mantén la operación en marcha';

  return (
    <View
      className={`rounded-b-[28px] bg-[#07172C] pb-7 shadow-md ${className}`}
      style={{ paddingTop: Math.max(insets.top + 10, 24) }}
    >
      <View className="w-full max-w-xl flex-row items-center justify-between self-center px-5">
        <View className="flex-1 pr-3">
          <Text accessibilityRole="header" className="text-xl font-bold tracking-tight text-white">
            {resolvedTitle}
          </Text>
          {resolvedSubtitle ? (
            <Text className="mt-0.5 text-xs text-slate-300">{resolvedSubtitle}</Text>
          ) : null}
        </View>

        {rightElement ? (
          rightElement
        ) : showConnectivity ? (
          <Pressable
            onPress={onPressConnectivity}
            accessibilityRole="button"
            accessibilityLabel={
              isOnline
                ? 'Conexión a internet activa: sincronizando con la base de datos'
                : 'Sin conexión: guardando datos en almacenamiento local'
            }
            accessibilityHint={
              onPressConnectivity
                ? 'Toca para ver detalles de sincronización o alternar el modo'
                : undefined
            }
            className={`flex-row items-center rounded-full border px-3 py-1.5 shadow-sm active:opacity-75 ${
              isOnline
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-amber-500/40 bg-amber-500/15'
            }`}
            style={onPressConnectivity ? { cursor: 'pointer' } : undefined}
          >
            {isOnline ? (
              <Wifi size={14} color="#34d399" strokeWidth={2.4} />
            ) : (
              <WifiOff size={14} color="#fbbf24" strokeWidth={2.4} />
            )}
            <Text
              className={`ml-1.5 text-xs font-semibold ${
                isOnline ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {isOnline ? 'En línea' : 'Modo local'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {children ? <View className="mt-4 px-5">{children}</View> : null}
    </View>
  );
}
