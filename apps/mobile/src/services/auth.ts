import { FunctionsHttpError } from '@supabase/supabase-js';

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
