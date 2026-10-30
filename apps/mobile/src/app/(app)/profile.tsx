import { useRouter } from 'expo-router';
import { Bell, ChevronRight, CircleHelp, LogOut, User, Wrench } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/shared/app-header';
import { useAuth } from '@/providers/auth-provider';
import { signOut } from '@/services/auth';
import { getDisplayName, getRoleName, getUserInitials } from '@/services/user';

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (profile && !profile.rol) {
      void refreshProfile();
    }
  }, [profile, refreshProfile]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      Alert.alert('Error', message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = getDisplayName(profile, session?.user?.user_metadata, session?.user?.email);
  const initials = getUserInitials(profile, session?.user?.email);
  const role = getRoleName(profile);
  const email = session?.user?.email ?? 'Sin correo asociado';

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Cabecera institucional fija superior */}
      <AppHeader
        title="Perfil"
        subtitle="Información de la cuenta y configuración de sesión"
        showConnectivity={true}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 84,
          paddingHorizontal: 20,
        }}
      >
        <View className="w-full max-w-md self-center">
          {/* Tarjeta principal de perfil de usuario */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${displayName}, ${email}, rol ${role}`}
            accessibilityHint="Ver detalles de la cuenta"
            className="min-h-[84px] flex-row items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm active:bg-slate-50"
            style={{ cursor: 'pointer' }}
          >
            {/* Avatar circular con iniciales */}
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              className="h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100"
            >
              <Text className="text-lg font-bold tracking-tight text-blue-700">{initials}</Text>
            </View>

            {/* Información principal: Nombre, Correo y Badge de Rol */}
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-base font-bold leading-snug text-slate-900"
              >
                {displayName}
              </Text>

              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="mt-0.5 text-[13px] font-normal leading-tight text-slate-500"
              >
                {email}
              </Text>

              <View className="mt-2 self-start rounded-md bg-blue-50 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-blue-700 capitalize">{role}</Text>
              </View>
            </View>
          </Pressable>

          {/* Tarjeta agrupada de opciones de cuenta y notificaciones */}
          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Opción: Información de la cuenta */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Información de la cuenta: Nombre, correo y contraseña"
              className="min-h-[70px] flex-row items-center gap-3.5 px-4 py-3.5 active:bg-slate-50"
              style={{ cursor: 'pointer' }}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"
              >
                <User size={19} color="#334155" strokeWidth={1.8} />
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[15px] font-semibold leading-snug text-slate-900"
                >
                  Información de la cuenta
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="mt-0.5 text-xs font-normal leading-tight text-slate-500"
                >
                  Nombre, correo y contraseña
                </Text>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="pl-1"
              >
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
              </View>
            </Pressable>

            <View className="h-px bg-slate-100" />

            {/* Opción: Notificaciones */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificaciones: Avisos de intervenciones y mantenimientos"
              className="min-h-[70px] flex-row items-center gap-3.5 px-4 py-3.5 active:bg-slate-50"
              style={{ cursor: 'pointer' }}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"
              >
                <Bell size={19} color="#334155" strokeWidth={1.8} />
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[15px] font-semibold leading-snug text-slate-900"
                >
                  Notificaciones
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="mt-0.5 text-xs font-normal leading-tight text-slate-500"
                >
                  Avisos de intervenciones y mantenimientos
                </Text>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="pl-1"
              >
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          {/* Tarjeta agrupada de soporte y cierre de sesión */}
          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Opción: Ayuda */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ayuda: Guías y soporte"
              className="min-h-[70px] flex-row items-center gap-3.5 px-4 py-3.5 active:bg-slate-50"
              style={{ cursor: 'pointer' }}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"
              >
                <CircleHelp size={19} color="#334155" strokeWidth={1.8} />
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[15px] font-semibold leading-snug text-slate-900"
                >
                  Ayuda
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="mt-0.5 text-xs font-normal leading-tight text-slate-500"
                >
                  Guías y soporte
                </Text>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="pl-1"
              >
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
              </View>
            </Pressable>

            <View className="h-px bg-slate-100" />

            {/* Opción destructiva: Cerrar sesión */}
            <Pressable
              onPress={handleLogout}
              disabled={isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }}
              className={`min-h-[68px] flex-row items-center gap-3.5 px-4 py-3.5 active:bg-red-50/60 ${
                isLoggingOut ? 'opacity-60' : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50"
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <LogOut size={19} color="#dc2626" strokeWidth={1.8} />
                )}
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[15px] font-semibold leading-snug text-red-600"
                >
                  Cerrar sesión
                </Text>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="pl-1"
              >
                <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          {/* Tarjeta informativa de la aplicación */}
          <View
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel="Aplicación de Mantención, Versión 1.0.0"
            className="mt-4 flex-row items-start gap-3.5 rounded-2xl border border-slate-200/70 bg-slate-100/90 p-4"
          >
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              className="mt-0.5 h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100"
            >
              <Wrench size={18} color="#2563eb" strokeWidth={1.9} />
            </View>

            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold leading-snug text-slate-900">
                Aplicación de mantención
              </Text>
              <Text className="mt-0.5 text-xs font-normal leading-relaxed text-slate-500">
                Versión 1.0.0
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
