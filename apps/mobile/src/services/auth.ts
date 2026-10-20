import { FunctionsHttpError } from '@supabase/supabase-js';

import { RESET_PASSWORD_REDIRECT_URL } from '@/constants/config';
import { getSupabase } from '@/services/supabase';

interface LoginTokens {
  access_token: string;
  refresh_token: string;
}

export async function signInWithRun(run: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke<LoginTokens>('login-run', {
    body: { run, password },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      if (status === 429) {
        throw new Error('Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
      }
      if (status === 401) throw new Error('RUN o contraseña incorrectos.');
      if (status === 400) throw new Error('Ingresa un RUN con DV válido y tu contraseña.');
    }
    throw new Error('No se pudo conectar con el servicio de acceso. Intenta nuevamente.');
  }

  if (!data?.access_token || !data.refresh_token) {
    throw new Error('El servicio de acceso no entregó una sesión válida.');
  }

  const { data: result, error: sessionError } = await supabase.auth.setSession(data);
  if (sessionError || !result.session) {
    throw new Error('No se pudo guardar la sesión. Intenta nuevamente.');
  }
}

interface RecoveryResponse {
  message: string;
  maskedEmail: string | null;
}

export async function recoverPassword(run: string, customRedirectTo?: string) {
  const supabase = getSupabase();
  const redirectTo = customRedirectTo || RESET_PASSWORD_REDIRECT_URL;
  const { data, error } = await supabase.functions.invoke<RecoveryResponse>('recover-password', {
    body: {
      run,
      redirectTo,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      if (status === 429) {
        throw new Error('Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
      }
      if (status === 404) {
        throw new Error('El RUN ingresado no corresponde a un usuario registrado.');
      }
      if (status === 403) {
        throw new Error('La cuenta asociada a este RUN está inactiva. Contacta al administrador.');
      }
      if (status === 400) {
        throw new Error('Ingresa un RUN con DV válido.');
      }
    }
    throw new Error('No se pudo procesar la solicitud de recuperación. Intenta nuevamente.');
  }

  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error('No se pudo cerrar la sesión. Intenta nuevamente.');
  }
}

export async function exchangeRecoveryCode(code: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw new Error('El enlace de recuperación ha expirado o no es válido.');
  }
  return data;
}

export async function setSessionFromTokens(accessToken: string, refreshToken: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw new Error('No se pudo validar la sesión de recuperación.');
  }
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.message.toLowerCase().includes('weak')) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    throw new Error('No se pudo actualizar la contraseña. Intenta nuevamente.');
  }
}
