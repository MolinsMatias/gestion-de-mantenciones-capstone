import { parseRun } from './run.ts';

export interface Profile {
  id: string;
  activo: boolean;
}

export interface RecoveryDependencies {
  acceptsApiKey(key: string): boolean;
  consumeAttempt(bucket: string): Promise<boolean>;
  findProfileByRun(run: string, dv: string): Promise<Profile | null>;
  getEmailForUserId(userId: string): Promise<string | null>;
  sendRecoveryEmail(email: string, redirectTo?: string): Promise<void>;
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

export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  let prefix: string;
  if (localPart.length <= 4) {
    prefix = localPart.slice(0, Math.max(1, Math.floor(localPart.length / 2)));
  } else {
    prefix = localPart.slice(0, 4);
  }

  return `${prefix}XXXXX${domain}`;
}

const rateLimited = () =>
  json(
    429,
    {
      message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.',
    },
    { 'Retry-After': '900' },
  );

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function createRecoveryHandler(dependencies: RecoveryDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json(405, { message: 'Método no permitido.' });
    }
    if (!dependencies.acceptsApiKey(request.headers.get('apikey') ?? '')) {
      return json(401, { message: 'Solicitud no autorizada.' });
    }

    try {
      if (!await dependencies.consumeAttempt('global')) {
        return rateLimited();
      }

      let body: unknown;
      try {
        body = await readBody(request);
      } catch (error) {
        return json(error instanceof RangeError ? 413 : 400, {
          message: 'Solicitud no válida.',
        });
      }

      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return json(400, { message: 'Solicitud no válida.' });
      }

      const { run: rawRun, email: rawEmail, redirectTo: rawRedirectTo } = body as Record<
        string,
        unknown
      >;

      const redirectTo = typeof rawRedirectTo === 'string' && rawRedirectTo.length < 1024
        ? rawRedirectTo
        : undefined;

      let targetEmail: string | null = null;

      if (typeof rawRun === 'string' && rawRun.trim()) {
        const parsedRun = parseRun(rawRun);
        if (!parsedRun) {
          return json(400, { message: 'Ingresa un RUN con DV válido.' });
        }

        if (!await dependencies.consumeAttempt(`run:${parsedRun.run}`)) {
          return rateLimited();
        }

        const profile = await dependencies.findProfileByRun(parsedRun.run, parsedRun.dv);
        if (!profile) {
          return json(404, {
            message: 'El RUN ingresado no corresponde a un usuario registrado.',
          });
        }

        if (!profile.activo) {
          return json(403, {
            message: 'La cuenta asociada a este RUN está inactiva. Contacta al administrador.',
          });
        }

        targetEmail = await dependencies.getEmailForUserId(profile.id);
        if (!targetEmail) {
          return json(404, {
            message: 'El usuario no tiene un correo electrónico vinculado en el sistema.',
          });
        }
      } else if (typeof rawEmail === 'string' && rawEmail.trim()) {
        const trimmedEmail = rawEmail.trim().toLowerCase();
        if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 254) {
          return json(400, { message: 'Ingresa un correo electrónico válido.' });
        }

        if (!await dependencies.consumeAttempt(`email:${trimmedEmail}`)) {
          return rateLimited();
        }

        targetEmail = trimmedEmail;
      } else {
        return json(400, { message: 'Ingresa tu RUN con DV.' });
      }

      try {
        await dependencies.sendRecoveryEmail(targetEmail, redirectTo);
      } catch (error) {
        if (error instanceof RateLimitError) return rateLimited();
        console.error('recover-password: fallo al enviar correo de recuperación');
        return json(503, {
          message: 'No se pudo enviar el correo de recuperación. Intenta nuevamente más tarde.',
        });
      }

      return json(200, {
        message: 'Instrucciones enviadas exitosamente.',
        maskedEmail: maskEmail(targetEmail),
      });
    } catch (error) {
      if (error instanceof RateLimitError) return rateLimited();
      console.error('recover-password: error inesperado en recuperación');
      return json(503, {
        message: 'No se pudo procesar la solicitud. Intenta nuevamente más tarde.',
      });
    }
  };
}