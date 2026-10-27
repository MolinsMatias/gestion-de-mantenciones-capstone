import { Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import { LoginForm } from '@/components/auth/login-form';
import { AuthHeader } from '@/components/auth/auth-header';
import { RecoveryPasswordForm } from '@/components/auth/recovery-password-form';
import { KeyboardScrollView } from '@/components/shared/keyboard-scroll-view';
import { useAuth } from '@/providers/auth-provider';
import { recoverPassword, signInWithRun } from '@/services/auth';

type AuthMode = 'login' | 'recovery';

export default function LoginScreen() {
  const { session, isLoading: isSessionLoading } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [authMode, setAuthMode] = useState<AuthMode>(mode === 'recovery' ? 'recovery' : 'login');

  // Estados de carga y feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecoverySuccess, setIsRecoverySuccess] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  // Conmutación inmediata entre formularios sin parpadeo ni desvanecimiento a negro
  const transitionTo = useCallback((nextMode: AuthMode) => {
    setErrorMessage(null);
    setAuthMode(nextMode);
  }, []);

  const handleBackToLogin = useCallback(() => {
    setIsRecoverySuccess(false);
    setMaskedEmail(null);
    transitionTo('login');
  }, [transitionTo]);

  // Manejo de botón físico "Atrás" en Android para regresar al login
  useEffect(() => {
    if (authMode !== 'recovery') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackToLogin();
      return true;
    });

    return () => subscription.remove();
  }, [authMode, handleBackToLogin]);

  const handleLogin = async ({ run, password }: { run: string; password: string }) => {
    if (isLoading) return;
    if (!run || !password) {
      setErrorMessage('Por favor ingresa tu RUN con DV y contraseña');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await signInWithRun(run, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async ({ run }: { run: string }) => {
    if (!run) {
      setErrorMessage('Por favor ingresa tu RUN con DV');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await recoverPassword(run.trim());
      setMaskedEmail(response?.maskedEmail ?? null);
      setIsRecoverySuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al procesar la solicitud. Intenta nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSessionLoading) return null;
  if (session) return <Redirect href="/(app)" />;

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Barra de estado con texto blanco translúcida sobre el encabezado */}
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
        bottomOffset={48}
      >
        {/* El encabezado adapta su título según el modo de autenticación */}
        <AuthHeader
          title={authMode === 'recovery' ? 'Restablecer contraseña' : 'Bienvenido'}
          subtitle={
            authMode === 'recovery'
              ? 'Ingresa tu RUN registrado y te enviaremos las instrucciones a tu correo para restablecer tu acceso.'
              : 'Sistema de gestión de mantenciones'
          }
        />

        {/* El formulario conmuta de manera inmediata sin desvanecimientos a negro */}
        <View className="flex-1">
          {authMode === 'login' ? (
            <LoginForm
              onSubmit={handleLogin}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onForgotPassword={() => transitionTo('recovery')}
            />
          ) : (
            <RecoveryPasswordForm
              onSubmit={handleRecovery}
              isLoading={isLoading}
              errorMessage={errorMessage}
              isSuccess={isRecoverySuccess}
              maskedEmail={maskedEmail}
              onBackToLogin={handleBackToLogin}
              onResend={() => setIsRecoverySuccess(false)}
            />
          )}
        </View>
      </KeyboardScrollView>
    </View>
  );
}
