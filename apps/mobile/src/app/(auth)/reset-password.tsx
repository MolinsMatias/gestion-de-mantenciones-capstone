import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AuthHeader } from '@/components/auth/auth-header';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { KeyboardScrollView } from '@/components/shared/keyboard-scroll-view';
import {
  exchangeRecoveryCode,
  setSessionFromTokens,
  signOut,
  updatePassword,
} from '@/services/auth';
import { getSupabase } from '@/services/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validar el código de recuperación o tokens en la URL
  useEffect(() => {
    let isMounted = true;

    async function validateRecoveryLink() {
      // 1. Si Supabase envió error en los parámetros (ej. link expirado)
      if (params.error || params.error_description) {
        if (isMounted) {
          setSessionError(
            'El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo.',
          );
          setIsCheckingSession(false);
        }
        return;
      }

      // 2. Si viene un código PKCE (?code=...)
      if (params.code) {
        try {
          await exchangeRecoveryCode(params.code);
          if (isMounted) {
            setIsCheckingSession(false);
          }
          return;
        } catch {
          if (isMounted) {
            setSessionError(
              'No se pudo verificar el código de recuperación. El enlace puede haber expirado.',
            );
            setIsCheckingSession(false);
          }
          return;
        }
      }

      // 3. Si en Web viene en el hash fragment (#access_token=...&type=recovery)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            await setSessionFromTokens(accessToken, refreshToken);
            if (isMounted) {
              setIsCheckingSession(false);
            }
            return;
          } catch {
            if (isMounted) {
              setSessionError('No se pudo validar el enlace de recuperación.');
              setIsCheckingSession(false);
            }
            return;
          }
        }
      }

      // 4. Si ya existe una sesión activa
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        if (isMounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      // 5. Si no hay código ni sesión
      if (isMounted) {
        setSessionError(
          'No se encontró un código o sesión de recuperación válida. Por favor solicita un nuevo enlace.',
        );
        setIsCheckingSession(false);
      }
    }

    void validateRecoveryLink();

    return () => {
      isMounted = false;
    };
  }, [params.code, params.error, params.error_description]);

  const handleSubmitPassword = useCallback(async (newPassword: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await updatePassword(newPassword);
      // Cerrar la sesión de recuperación para que el usuario ingrese limpiamente con sus nuevas credenciales
      try {
        await signOut();
      } catch {
        // Ignorar error al cerrar sesión tras éxito
      }
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleGoToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  const handleRequestNewLink = useCallback(() => {
    router.replace({ pathname: '/(auth)/login', params: { mode: 'recovery' } });
  }, [router]);

  return (
    <View className="flex-1 bg-brand-dark">
      <StatusBar style="light" />
      <KeyboardScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title="Restablecer contraseña"
          subtitle={
            isSuccess
              ? 'Contraseña actualizada'
              : sessionError
                ? 'Enlace no válido'
                : 'Ingresa tu nueva contraseña para continuar'
          }
        />

        <View className="flex-1">
          <ResetPasswordForm
            onSubmit={handleSubmitPassword}
            isLoading={isSubmitting}
            isCheckingSession={isCheckingSession}
            errorMessage={errorMessage}
            sessionError={sessionError}
            isSuccess={isSuccess}
            onGoToLogin={handleGoToLogin}
            onRequestNewLink={handleRequestNewLink}
          />
        </View>
      </KeyboardScrollView>
    </View>
  );
}
