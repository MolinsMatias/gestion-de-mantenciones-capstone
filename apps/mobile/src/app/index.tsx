import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={session ? '/(app)' : '/(auth)/login'} />;
}
