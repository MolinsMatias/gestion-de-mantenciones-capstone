import { Redirect } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

function isRecoveryUrl(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  }
  return false;
}

export default function Index() {
  const { session, isLoading } = useAuth();

  // Si se abre la raíz de la web con tokens de recuperación en el hash, derivar a reset-password
  if (isRecoveryUrl()) {
    return <Redirect href="/(auth)/reset-password" />;
  }

  if (isLoading) return null;
  return <Redirect href={session ? '/(app)' : '/(auth)/login'} />;
}
