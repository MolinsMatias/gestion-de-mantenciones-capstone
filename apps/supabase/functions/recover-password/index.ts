import { createClient } from '@supabase/supabase-js';
import { createRecoveryHandler, RateLimitError } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const publicKeys = Object.values(
  JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}'),
).filter((key): key is string => typeof key === 'string');
const legacyPublicKey = Deno.env.get('SUPABASE_ANON_KEY');
if (legacyPublicKey) publicKeys.push(legacyPublicKey);

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const secretKey: string | undefined = secretKeys.default ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !secretKey || !publicKeys.length) {
  throw new Error('Configuración de Supabase incompleta.');
}

const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
const admin = createClient(url, secretKey, { auth: authOptions });
const hmacKey = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secretKey),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
);

Deno.serve(async (request: Request) => {
  const auth = createClient(url, publicKeys[0], { auth: authOptions });

  return await createRecoveryHandler({
    acceptsApiKey: (key) => publicKeys.includes(key),
    async consumeAttempt(bucket) {
      let protectedBucket = bucket;
      if (bucket !== 'global') {
        const digest = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(bucket));
        protectedBucket = 'recovery:' +
          [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      }
      const { data, error } = await admin.rpc('consume_recovery_attempt', {
        p_bucket: protectedBucket,
      });
      if (error) {
        // Si la función específica no existe aún, intentar con consume_login_attempt adaptado
        console.warn('consume_recovery_attempt RPC fallback:', error.message);
        throw new Error('Rate limit unavailable');
      }
      return data === true;
    },
    async findProfileByRun(run, dv) {
      const { data, error } = await admin
        .from('usuario')
        .select('id, activo')
        .eq('run', run)
        .eq('dv', dv)
        .maybeSingle();
      if (error) throw new Error('Profile lookup unavailable');
      return data;
    },
    async getEmailForUserId(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error('Auth lookup unavailable');
      return data.user.email ?? null;
    },
    async sendRecoveryEmail(email, redirectTo) {
      const { error } = await auth.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error?.status === 429) throw new RateLimitError();
      if (error && (!error.status || error.status >= 500)) {
        throw new Error('Auth email service unavailable');
      }
    },
  })(request);
});
