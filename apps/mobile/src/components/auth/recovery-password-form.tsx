import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BowlingPinIcon } from '@/components/shared/icons/bowling-pin-icon';

export interface RecoveryPasswordFormProps {
  onSubmit?: (data: { email: string }) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSuccess?: boolean;
  onBackToLogin?: () => void;
  onResend?: () => void;
}

export function RecoveryPasswordForm({
  onSubmit,
  isLoading = false,
  errorMessage = null,
  isSuccess = false,
  onBackToLogin,
  onResend,
}: RecoveryPasswordFormProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);

  const handleSubmit = () => {
    if (isLoading) return;
    onSubmit?.({ email: email.trim() });
  };

  return (
    <View
      className="flex-1 justify-between rounded-t-[32px] bg-slate-50 px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {/* Tarjeta blanca con los campos */}
      <View
        className="rounded-3xl bg-white px-5 py-4"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
        }}
      >
        {isSuccess ? (
          /* Estado de confirmación tras enviar el correo */
          <View className="items-center py-1">
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={28} color="#059669" strokeWidth={2} />
            </View>

            <Text className="text-center text-base font-bold text-slate-900">
              Instrucciones enviadas
            </Text>

            <Text className="mt-1 text-center text-xs leading-relaxed text-slate-600">
              Si la cuenta coincide con un usuario registrado, hemos enviado las instrucciones para
              restablecer tu contraseña a{' '}
              <Text className="font-semibold text-slate-900">{email || 'tu correo'}</Text>.
            </Text>

            <Text className="mt-1.5 text-center text-[11px] text-slate-400">
              Revisa tu bandeja de entrada o spam en los próximos minutos.
            </Text>

            <Pressable
              onPress={onBackToLogin}
              accessibilityRole="button"
              accessibilityLabel="Volver a iniciar sesión"
              className="mt-5 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700"
              style={{
                shadowColor: '#1769e6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <ArrowLeft size={16} color="#ffffff" strokeWidth={2} />
              <Text className="text-base font-semibold text-white">Volver a iniciar sesión</Text>
            </Pressable>

            {onResend ? (
              <Pressable
                onPress={onResend}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="¿No recibiste el correo? Reenviar"
                hitSlop={8}
                className="mt-4 px-3 py-2"
              >
                <Text className="text-center text-xs font-medium text-brand-blue">
                  ¿No recibiste el correo? Reenviar
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          /* Formulario para ingresar correo */
          <>
            <Text className="text-base font-bold text-slate-900">Recuperar contraseña</Text>
            <Text className="mb-2.5 mt-0.5 text-xs text-slate-500">
              Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para
              restablecer tu acceso.
            </Text>

            {/* Campo Correo electrónico */}
            <Text className="mb-1 text-xs font-bold text-slate-800">Correo electrónico</Text>
            <View
              className={`flex-row items-center rounded-2xl border px-3 py-2 ${
                isFocusedEmail ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-slate-100'
              }`}
            >
              <Mail size={18} color={isFocusedEmail ? '#1769e6' : '#64748b'} strokeWidth={1.8} />
              <TextInput
                nativeID="recovery-password-email"
                className="ml-2 flex-1 text-base text-slate-900"
                placeholder="Ingresa tu correo"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                submitBehavior="submit"
                underlineColorAndroid="transparent"
                onSubmitEditing={handleSubmit}
                onFocus={() => setIsFocusedEmail(true)}
                onBlur={() => setIsFocusedEmail(false)}
                accessibilityLabel="Correo electrónico"
              />
            </View>

            {/* Mensaje de error si existe */}
            {errorMessage ? (
              <View className="mt-2 rounded-xl bg-red-50 px-3 py-2">
                <Text className="text-center text-sm font-medium text-red-600">{errorMessage}</Text>
              </View>
            ) : null}

            {/* Botón Enviar instrucciones con altura táctil estándar (48dp) */}
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Enviar instrucciones"
              className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700 disabled:opacity-60"
              style={{
                shadowColor: '#1769e6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Send size={18} color="#ffffff" strokeWidth={2} />
                  <Text className="text-base font-semibold text-white">Enviar instrucciones</Text>
                </>
              )}
            </Pressable>

            {/* Enlace para volver a iniciar sesión con separación táctil segura */}
            {onBackToLogin ? (
              <Pressable
                onPress={onBackToLogin}
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                hitSlop={8}
                className="mt-4 flex-row items-center justify-center gap-1.5 px-3 py-2"
              >
                <ArrowLeft size={14} color="#1769e6" strokeWidth={2} />
                <Text className="text-center text-xs font-medium text-brand-blue">
                  Volver a iniciar sesión
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {/* Pie: separador con bolo y derechos reservados */}
      <View className="pt-2">
        <View className="flex-row items-center justify-center px-6" accessible={false}>
          <View className="h-px flex-1 bg-slate-200" />
          <View className="mx-4">
            <BowlingPinIcon size={18} color="#94a3b8" />
          </View>
          <View className="h-px flex-1 bg-slate-200" />
        </View>
        <Text className="mt-1.5 text-center text-xs text-slate-500">
          © BowlingService SpA • Todos los derechos reservados
        </Text>
      </View>
    </View>
  );
}
