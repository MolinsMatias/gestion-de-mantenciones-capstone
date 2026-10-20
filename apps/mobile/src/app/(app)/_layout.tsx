import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { AppTabs } from '@/components/app-tabs';
import { useAuth } from '@/providers/auth-provider';

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <AppTabs {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: '#f8fafc' },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
        },
      }}
    >
      {/* El orden define la posición en la barra; `escanear` ocupa el botón central. */}
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="tareas" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="escanear" options={{ title: 'Escanear' }} />
      <Tabs.Screen name="equipo" options={{ title: 'Equipo' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
