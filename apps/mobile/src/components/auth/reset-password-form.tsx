import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Send } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResetPasswordFormProps {
  onSubmit: (password: string) => Promise<void> | void;
  isLoading?: boolean;
  isCheckingSession?: boolean;
  errorMessage?: string | null;
  sessionError?: string | null;
  isSuccess?: boolean;
  onGoToLogin: () => void;
  onRequestNewLink: () => void;
}

export function ResetPasswordForm({
  onSubmit,
  isLoading = false,
  isCheckingSession = false,
  errorMessage = null,
  sessionError = null,
  isSuccess = false,
  onGoToLogin,
  onRequestNewLink,
}: ResetPasswordFormProps) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isFocusedConfirmPassword, setIsFocusedConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const confirmPasswordInputRef = useRef<TextInput>(null);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError(null);
    if (confirmPasswordError && confirmPassword && text === confirmPassword) {
      setConfirmPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError(null);
  };

  const handlePasswordBlur = () => {
    setIsFocusedPassword(false);
    if (password && password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
    }
  };

  const handleConfirmPasswordBlur = () => {
    setIsFocusedConfirmPassword(false);
    if (confirmPassword && confirmPassword !== password) {
      setConfirmPasswordError('Las contraseñas no coinciden');
    }
  };

  const handleSubmit = () => {
    if (isLoading) return;

    let hasError = false;
    if (!password) {
      setPasswordError('Ingresa tu nueva contraseña');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirma tu nueva contraseña');
      hasError = true;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Las contraseñas no coinciden');
      hasError = true;
    }

    if (hasError) return;

    setPasswordError(null);
    setConfirmPasswordError(null);
    void onSubmit(password);
  };

  return (
    <View
      className="flex-1 rounded-t-3xl bg-white px-6 pt-6 shadow-2xl"
      style={{
        paddingBottom: Math.max(insets.bottom, 24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {isCheckingSession ? (
        /* Estado de verificación del enlace */
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#1769e6" />
          <Text className="mt-4 text-center text-sm font-medium text-slate-600">
            Validando enlace de recuperación...
          </Text>
        </View>
      ) : sessionError ? (
        /* Estado de enlace inválido o expirado */
        <View className="items-center py-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle size={36} color="#d97706" strokeWidth={1.8} />
          </View>
          <Text className="mt-4 text-center text-lg font-bold text-slate-900">
            Enlace no válido o expirado
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-600">{sessionError}</Text>

          <Pressable
            onPress={onRequestNewLink}
            accessibilityRole="button"
            accessibilityLabel="Solicitar nuevo enlace"
            className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700"
            style={{
              shadowColor: '#1769e6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text className="text-base font-semibold text-white">Solicitar nuevo enlace</Text>
          </Pressable>

          <Pressable
            onPress={onGoToLogin}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de sesión"
            hitSlop={8}
            className="mt-4 px-3 py-2"
          >
            <Text className="text-sm font-medium text-slate-500">Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      ) : isSuccess ? (
        /* Estado de éxito */
        <View className="items-center py-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={36} color="#059669" strokeWidth={1.8} />
          </View>
          <Text className="mt-4 text-center text-xl font-bold text-slate-900">
            ¡Contraseña actualizada!
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-600">
            Tu contraseña ha sido modificada exitosamente. Ya puedes iniciar sesión con tus nuevas
            credenciales.
          </Text>

          <Pressable
            onPress={onGoToLogin}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
            className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700"
            style={{
              shadowColor: '#1769e6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <ArrowLeft size={16} color="#ffffff" strokeWidth={2} />
            <Text className="text-base font-semibold text-white">Ir a iniciar sesión</Text>
          </Pressable>
        </View>
      ) : (
        /* Formulario de ingreso de nueva contraseña */
        <>
          <Text className="text-base font-bold text-slate-900">Nueva contraseña</Text>
          <Text className="mb-3 mt-0.5 text-xs text-slate-500">
            Ingresa una contraseña segura de al menos 6 caracteres.
          </Text>

          {/* Campo Contraseña */}
          <Text className="mb-1 text-xs font-bold text-slate-800">Contraseña</Text>
          <View
            className={`flex-row items-center rounded-2xl border px-3 py-2 ${
              passwordError
                ? 'border-red-400 bg-red-50/50'
                : isFocusedPassword
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-slate-200 bg-slate-100'
            }`}
          >
            <Lock
              size={18}
              color={passwordError ? '#dc2626' : isFocusedPassword ? '#1769e6' : '#64748b'}
              strokeWidth={1.8}
            />
            <TextInput
              nativeID="reset-new-password"
              className="ml-2 flex-1 text-base text-slate-900"
              placeholder="Ingresa tu nueva contraseña"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              underlineColorAndroid="transparent"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              onFocus={() => {
                setIsFocusedPassword(true);
                setPasswordError(null);
              }}
              onBlur={handlePasswordBlur}
              accessibilityLabel="Nueva contraseña"
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
          {passwordError ? (
            <Text className="ml-1 mt-1 text-xs font-medium text-red-600">{passwordError}</Text>
          ) : null}

          {/* Campo Confirmar Contraseña */}
          <Text className="mb-1 mt-3 text-xs font-bold text-slate-800">Confirmar contraseña</Text>
          <View
            className={`flex-row items-center rounded-2xl border px-3 py-2 ${
              confirmPasswordError
                ? 'border-red-400 bg-red-50/50'
                : isFocusedConfirmPassword
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-slate-200 bg-slate-100'
            }`}
          >
            <Lock
              size={18}
              color={
                confirmPasswordError ? '#dc2626' : isFocusedConfirmPassword ? '#1769e6' : '#64748b'
              }
              strokeWidth={1.8}
            />
            <TextInput
              nativeID="reset-confirm-password"
              ref={confirmPasswordInputRef}
              className="ml-2 flex-1 text-base text-slate-900"
              placeholder="Repite tu nueva contraseña"
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              onSubmitEditing={handleSubmit}
              onFocus={() => {
                setIsFocusedConfirmPassword(true);
                setConfirmPasswordError(null);
              }}
              onBlur={handleConfirmPasswordBlur}
              accessibilityLabel="Confirmar nueva contraseña"
            />
            <Pressable
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword ? 'Ocultar contraseña confirmada' : 'Ver contraseña confirmada'
              }
              hitSlop={8}
              className="p-1"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color="#475569" strokeWidth={1.8} />
              ) : (
                <Eye size={18} color="#475569" strokeWidth={1.8} />
              )}
            </Pressable>
          </View>
          {confirmPasswordError ? (
            <Text className="ml-1 mt-1 text-xs font-medium text-red-600">
              {confirmPasswordError}
            </Text>
          ) : null}

          {/* Mensaje de error del servidor */}
          {errorMessage ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-red-50 p-3">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="flex-1 text-xs font-medium text-red-600">{errorMessage}</Text>
            </View>
          ) : null}

          {/* Botón de envío */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Guardar nueva contraseña"
            className="mt-5 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-blue py-3.5 active:bg-blue-700"
            style={{
              shadowColor: '#1769e6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={18} color="#ffffff" strokeWidth={2} />
                <Text className="text-base font-semibold text-white">Guardar nueva contraseña</Text>
              </>
            )}
          </Pressable>

          {/* Enlace para volver */}
          <Pressable
            onPress={onGoToLogin}
            accessibilityRole="button"
            accessibilityLabel="Cancelar y volver al inicio"
            hitSlop={8}
            className="mt-4 self-center px-3 py-2"
          >
            <Text className="text-sm font-medium text-slate-500">Cancelar y volver al inicio</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
