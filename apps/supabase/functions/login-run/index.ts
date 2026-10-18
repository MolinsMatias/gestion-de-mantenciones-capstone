import { createClient } from '@supabase/supabase-js';
import { createLoginHandler, RateLimitError } from './handler.ts';

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
  // Un cliente distinto por petición: nunca compartir la sesión entre llamadas.
  const auth = createClient(url, publicKeys[0], { auth: authOptions });

  return await createLoginHandler({
    acceptsApiKey: (key) => publicKeys.includes(key),
    async consumeAttempt(bucket) {
      let protectedBucket = bucket;
      if (bucket !== 'global') {
        const digest = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(bucket));
        protectedBucket = 'run:' +
          [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      }
      const { data, error } = await admin.rpc('consume_login_attempt', {
        p_bucket: protectedBucket,
      });
      if (error) throw new Error('Rate limit unavailable');
      return data === true;
    },
    async findProfile(run, dv) {
      const { data, error } = await admin.from('usuario').select('id, activo').eq('run', run).eq(
        'dv',
        dv,
      ).maybeSingle();
      if (error) throw new Error('Profile lookup unavailable');
      return data;
    },
    async getEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error('Auth lookup unavailable');
      return data.user.email ?? null;
    },
    async signIn(email, password) {
      const { data, error } = await auth.auth.signInWithPassword({ email, password });
      if (error?.status === 429) throw new RateLimitError();
      if (error && (!error.status || error.status >= 500)) throw new Error('Auth unavailable');
      if (error || !data.session || !data.user) return null;
      return {
        userId: data.user.id,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    },
    async revokeSession(accessToken) {
      const { error } = await admin.auth.admin.signOut(accessToken, 'local');
      if (error) throw new Error('Session revocation unavailable');
    },
  })(request);
});
