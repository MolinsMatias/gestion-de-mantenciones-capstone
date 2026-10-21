import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { signOut } from '@/services/auth';

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      Alert.alert('Error', message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 16, 28),
          paddingBottom: Math.max(insets.bottom, 16) + 84,
          paddingHorizontal: 20,
        }}
      >
        <View className="w-full max-w-md self-center">
          {/* Título de la sección */}
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Perfil
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Información de la cuenta y configuración de sesión
          </Text>

          {/* Tarjeta de usuario */}
          <View className="mt-6 flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
              <Text className="text-lg font-bold text-blue-700">MM</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">
                Matías Molins
              </Text>
              <Text className="text-xs font-medium text-slate-500">
                Técnico de Mantención
              </Text>
              {session?.user?.email ? (
                <Text className="mt-0.5 text-xs text-slate-400">
                  {session.user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Botón de logout sencillo */}
          <View className="mt-8">
            <Pressable
              onPress={handleLogout}
              disabled={isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 active:bg-red-100"
              style={{ cursor: 'pointer' }}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <>
                  <LogOut size={18} color="#dc2626" strokeWidth={2} />
                  <Text className="text-sm font-semibold text-red-600">
                    Cerrar sesión
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
