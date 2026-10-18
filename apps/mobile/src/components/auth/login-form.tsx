import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BowlingPinIcon } from '@/components/shared/icons/bowling-pin-icon';
import { formatRun, validateRun } from '@/utils/run';

export interface LoginFormProps {
  onSubmit?: (credentials: { run: string; password: string }) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onForgotPassword?: () => void;
}

export function LoginForm({
  onSubmit,
  isLoading = false,
  errorMessage = null,
  onForgotPassword,
}: LoginFormProps) {
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocusedRun, setIsFocusedRun] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const passwordInputRef = useRef<TextInput>(null);

  const handleRunChange = (text: string) => {
    const formatted = formatRun(text);
    setRun(formatted);
    if (runError) {
      setRunError(null);
    }
  };

  const handleRunBlur = () => {
    setIsFocusedRun(false);
    const trimmed = run.trim();
    if (trimmed && !validateRun(trimmed)) {
      setRunError('El RUN ingresado no es válido');
    }
  };

  const handleSubmit = () => {
    if (isLoading) return;
    const trimmedRun = run.trim();
    if (!trimmedRun) {
      setRunError('Por favor ingresa tu RUN');
      return;
    }
    if (!validateRun(trimmedRun)) {
      setRunError('El RUN ingresado no es válido');
      return;
    }
    setRunError(null);
    onSubmit?.({ run: trimmedRun, password });
  };

  return (
    <View
      className="flex-1 justify-between rounded-t-[32px] bg-slate-50 px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {/* Tarjeta blanca con los campos más compacta */}
      <View
        className="rounded-3xl bg-white px-5 py-3.5"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
        }}
      >
        {/* Campo RUN */}
        <Text className="mb-1 text-xs font-bold text-slate-800">RUN</Text>
        <View
          className={`flex-row items-center rounded-2xl border px-3 py-2 ${
            runError
              ? 'border-red-400 bg-red-50/50'
              : isFocusedRun
                ? 'border-brand-blue bg-blue-50'
                : 'border-slate-200 bg-slate-100'
          }`}
        >
          <User
            size={18}
            color={runError ? '#dc2626' : isFocusedRun ? '#1769e6' : '#64748b'}
            strokeWidth={1.8}
          />
          <TextInput
            nativeID="login-run"
            className="ml-2 flex-1 text-base text-slate-900"
            placeholder="12.345.678-5"
            placeholderTextColor="#94a3b8"
            value={run}
            onChangeText={handleRunChange}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            autoComplete="username"
            textContentType="username"
            editable={!isLoading}
            maxLength={12}
            returnKeyType="next"
            submitBehavior="submit"
            underlineColorAndroid="transparent"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            onFocus={() => {
              setIsFocusedRun(true);
              setRunError(null);
            }}
            onBlur={handleRunBlur}
            accessibilityLabel="RUN con dígito verificador"
          />
        </View>
        {runError ? (
          <Text className="ml-1 mt-1 text-xs font-medium text-red-600">{runError}</Text>
        ) : null}

        {/* Campo Contraseña */}
        <Text className="mb-1 mt-2.5 text-xs font-bold text-slate-800">Contraseña</Text>
        <View
          className={`flex-row items-center rounded-2xl border px-3 py-2 ${
            isFocusedPassword ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-slate-100'
          }`}
        >
          <Lock size={18} color={isFocusedPassword ? '#1769e6' : '#64748b'} strokeWidth={1.8} />
          <TextInput
            nativeID="login-password"
            ref={passwordInputRef}
            className="ml-2 flex-1 text-base text-slate-900"
            placeholder="Ingresa tu contraseña"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            textContentType="password"
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            underlineColorAndroid="transparent"
            onSubmitEditing={handleSubmit}
            onFocus={() => setIsFocusedPassword(true)}
            onBlur={() => setIsFocusedPassword(false)}
            accessibilityLabel="Contraseña"
          />
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            hitSlop={8}
            className="p-1"
          >
            {showPassword ? (
              <EyeOff size={18} color="#475569" strokeWidth={1.8} />
            ) : (
              <Eye size={18} color="#475569" strokeWidth={1.8} />
            )}
          </Pressable>
        </View>

        {/* Enlace Olvidaste tu contraseña, con hitSlop y separación táctil segura */}
        <Pressable
          onPress={onForgotPassword}
          accessibilityRole="button"
          accessibilityLabel="¿Olvidaste tu contraseña?"
          hitSlop={8}
          className="mt-2.5 self-end px-1 py-1.5"
        >
          <Text className="text-sm font-medium text-brand-blue">¿Olvidaste tu contraseña?</Text>
        </Pressable>

        {/* Mensaje de error si existe */}
        {errorMessage ? (
          <View className="mt-2.5 rounded-xl bg-red-50 px-3 py-2">
            <Text className="text-center text-sm font-medium text-red-600">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Botón Iniciar Sesión con altura táctil estándar (48dp) */}
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
          className="mt-3.5 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700 disabled:opacity-60"
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
              <LogIn size={18} color="#ffffff" strokeWidth={2} />
              <Text className="text-base font-semibold text-white">Iniciar sesión</Text>
            </>
          )}
        </Pressable>
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
