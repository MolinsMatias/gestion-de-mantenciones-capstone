import { parseRun } from './run.ts';

export interface Profile {
  id: string;
  activo: boolean;
}

export interface LoginSession {
  userId: string;
  access_token: string;
  refresh_token: string;
}

export interface LoginDependencies {
  acceptsApiKey(key: string): boolean;
  consumeAttempt(bucket: string): Promise<boolean>;
  findProfile(run: string, dv: string): Promise<Profile | null>;
  getEmail(userId: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<LoginSession | null>;
  revokeSession(accessToken: string): Promise<void>;
}

export class RateLimitError extends Error {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Retry-After',
};

function json(status: number, body: object, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders, 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

const invalidCredentials = () => json(401, { message: 'RUN o contraseña incorrectos.' });
const rateLimited = () =>
  json(429, {
    message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.',
  }, { 'Retry-After': '900' });

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new RangeError('Body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createLoginHandler(dependencies: LoginDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'POST') return json(405, { message: 'Método no permitido.' });
    if (!dependencies.acceptsApiKey(request.headers.get('apikey') ?? '')) {
      return json(401, { message: 'Solicitud no autorizada.' });
    }

    try {
      if (!await dependencies.consumeAttempt('global')) return rateLimited();

      let body: unknown;
      try {
        body = await readBody(request);
      } catch (error) {
        return json(error instanceof RangeError ? 413 : 400, { message: 'Solicitud no válida.' });
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return json(400, { message: 'Solicitud no válida.' });
      }
      const { run: rawRun, password } = body as Record<string, unknown>;
      const parsed = typeof rawRun === 'string' ? parseRun(rawRun) : null;
      if (!parsed || typeof password !== 'string' || !password || password.length > 1024) {
        return json(400, { message: 'Ingresa un RUN con DV válido y tu contraseña.' });
      }

      if (!await dependencies.consumeAttempt(`run:${parsed.run}`)) return rateLimited();
      const profile = await dependencies.findProfile(parsed.run, parsed.dv);
      const email = profile?.activo ? await dependencies.getEmail(profile.id) : null;

      // También consulta Auth cuando no hay cuenta activa: misma respuesta de credenciales.
      const session = await dependencies.signIn(
        email ?? 'unregistered@bowling-services.invalid',
        password,
      );
      if (!profile?.activo || !email || !session || session.userId !== profile.id) {
        if (session) await dependencies.revokeSession(session.access_token);
        return invalidCredentials();
      }

      // Revisa nuevamente el perfil por si se desactivó durante la autenticación.
      const latest = await dependencies.findProfile(parsed.run, parsed.dv);
      if (!latest?.activo || latest.id !== session.userId) {
        await dependencies.revokeSession(session.access_token);
        return invalidCredentials();
      }

      return json(200, {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch (error) {
      if (error instanceof RateLimitError) return rateLimited();
      // No incluir datos de la petición, errores de Auth ni tokens en los logs.
      console.error('login-run: operación no disponible');
      return json(503, { message: 'No se pudo iniciar sesión. Intenta nuevamente más tarde.' });
    }
  };
}
