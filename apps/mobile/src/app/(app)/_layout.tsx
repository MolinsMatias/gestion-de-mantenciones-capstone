import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/providers/auth-provider';

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
