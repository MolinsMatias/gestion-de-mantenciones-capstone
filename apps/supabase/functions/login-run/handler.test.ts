import assert from 'node:assert/strict';
import { createLoginHandler, type LoginDependencies, RateLimitError } from './handler.ts';
import { parseRun } from './run.ts';

function fixture(overrides: Partial<LoginDependencies> = {}) {
  const state = { authCalls: 0, email: '', buckets: [] as string[], revoked: [] as string[] };
  const dependencies: LoginDependencies = {
    acceptsApiKey: (key) => key === 'public-test-key',
    consumeAttempt: (bucket) => {
      state.buckets.push(bucket);
      return Promise.resolve(true);
    },
    findProfile: () => Promise.resolve({ id: 'test-user', activo: true }),
    getEmail: () => Promise.resolve('test@example.invalid'),
    signIn: (email) => {
      state.authCalls++;
      state.email = email;
      return Promise.resolve({
        userId: 'test-user',
        access_token: 'test-access',
        refresh_token: 'test-refresh',
      });
    },
    revokeSession: (token) => {
      state.revoked.push(token);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { state, handler: createLoginHandler(dependencies) };
}

function request(
  body: unknown = { run: '12.345.678-5', password: 'test-password' },
  apiKey = 'public-test-key',
) {
  return new Request('https://example.invalid/login-run', {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

Deno.test('normaliza RUN y valida módulo 11, incluyendo DV K y 0', () => {
  assert.deepEqual(parseRun('12.345.678-5'), { run: '12345678', dv: '5' });
  assert.deepEqual(parseRun('123456785'), { run: '12345678', dv: '5' });
  assert.deepEqual(parseRun('6-k'), { run: '6', dv: 'K' });
  assert.deepEqual(parseRun('14-0'), { run: '14', dv: '0' });
  for (const value of ['', '0-0', '12345678-9', '012345678-5', '12345678<script>-5']) {
    assert.equal(parseRun(value), null);
  }
});

Deno.test('solo entrega tokens para un perfil activo que coincida con Auth', async () => {
  const { handler, state } = fixture();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
  });
  assert.deepEqual(state.buckets, ['global', 'run:12345678']);
});

Deno.test('un RUN inválido no llega a Auth', async () => {
  const { handler, state } = fixture();
  assert.equal((await handler(request({ run: '12345678-9', password: 'password' }))).status, 400);
  assert.equal(state.authCalls, 0);
});

Deno.test('perfiles inexistentes e inactivos responden igual que una contraseña incorrecta', async () => {
  const responses = [];
  for (
    const override of [
      { findProfile: () => Promise.resolve(null) },
      { findProfile: () => Promise.resolve({ id: 'test-user', activo: false }) },
      {},
    ]
  ) {
    const { handler, state } = fixture({
      ...override,
      signIn: () => {
        state.authCalls++;
        return Promise.resolve(null);
      },
    });
    const response = await handler(request());
    assert.equal(response.status, 401);
    assert.equal(state.authCalls, 1);
    responses.push(await response.json());
  }
  assert.deepEqual(responses[0], responses[1]);
  assert.deepEqual(responses[1], responses[2]);
});

Deno.test('rechaza y revoca una sesión que pertenece a otro UUID', async () => {
  const { handler, state } = fixture({
    signIn: () =>
      Promise.resolve({
        userId: 'other-user',
        access_token: 'other-token',
        refresh_token: 'other-refresh',
      }),
  });
  assert.equal((await handler(request())).status, 401);
  assert.deepEqual(state.revoked, ['other-token']);
});

Deno.test('rechaza una cuenta desactivada durante el acceso', async () => {
  let lookups = 0;
  const { handler, state } = fixture({
    findProfile: () => Promise.resolve({ id: 'test-user', activo: ++lookups === 1 }),
  });
  assert.equal((await handler(request())).status, 401);
  assert.deepEqual(state.revoked, ['test-access']);
});

Deno.test('limita antes de consultar perfiles y devuelve Retry-After', async () => {
  let profileLookups = 0;
  const { handler } = fixture({
    consumeAttempt: () => Promise.resolve(false),
    findProfile: () => {
      profileLookups++;
      return Promise.resolve(null);
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '900');
  assert.equal(profileLookups, 0);
});

Deno.test('respeta también los límites de Supabase Auth', async () => {
  const { handler } = fixture({ signIn: () => Promise.reject(new RateLimitError()) });
  assert.equal((await handler(request())).status, 429);
});

Deno.test('si falla el limitador no continúa con la autenticación', async () => {
  const { handler, state } = fixture({
    consumeAttempt: () => Promise.reject(new Error('private db error')),
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal(state.authCalls, 0);
  assert.equal((await response.text()).includes('private db error'), false);
});

Deno.test('rechaza API keys ajenas antes de consumir recursos', async () => {
  const { handler, state } = fixture();
  assert.equal((await handler(request(undefined, 'wrong-key'))).status, 401);
  assert.deepEqual(state.buckets, []);
});

Deno.test('admite preflight de la PWA sin exigir una sesión', async () => {
  const { handler } = fixture();
  const response = await handler(
    new Request('https://example.invalid/login-run', { method: 'OPTIONS' }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('rechaza JSON malformado y cuerpos demasiado grandes', async () => {
  const { handler } = fixture();
  const malformed = new Request('https://example.invalid/login-run', {
    method: 'POST',
    headers: { apikey: 'public-test-key' },
    body: '{',
  });
  assert.equal((await handler(malformed)).status, 400);
  assert.equal(
    (await handler(request({ run: '12345678-5', password: 'a'.repeat(5000) }))).status,
    413,
  );
});
