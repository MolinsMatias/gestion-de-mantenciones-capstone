import { LogOut } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { signOut } from '@/services/auth';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      setIsLoggingOut(false);
      Alert.alert(
        'Error al cerrar sesión',
        error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      );
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-slate-50 px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }}
    >
      <View className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <Text className="text-center text-xl font-bold text-slate-800">Pantalla de Inicio</Text>
        <Text className="mt-2 text-center text-sm text-slate-500">
          Próxima pantalla a implementar según el mockup
        </Text>

        {session?.user?.email ? (
          <View className="mt-4 rounded-xl bg-slate-100 p-3">
            <Text className="text-center text-xs text-slate-500">Sesión iniciada como:</Text>
            <Text className="mt-0.5 text-center text-sm font-semibold text-slate-800">
              {session.user.email}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 active:bg-red-100"
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <>
              <LogOut size={18} color="#dc2626" strokeWidth={2} />
              <Text className="text-sm font-semibold text-red-600">Cerrar sesión</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
