import assert from 'node:assert/strict';
import {
  createRecoveryHandler,
  maskEmail,
  type RecoveryDependencies,
  RateLimitError,
} from './handler.ts';

function fixture(overrides: Partial<RecoveryDependencies> = {}) {
  const state = {
    emailCalls: 0,
    sentEmails: [] as string[],
    buckets: [] as string[],
    profileCalls: 0,
  };
  const dependencies: RecoveryDependencies = {
    acceptsApiKey: (key) => key === 'public-test-key',
    consumeAttempt: (bucket) => {
      state.buckets.push(bucket);
      return Promise.resolve(true);
    },
    findProfileByRun: () => {
      state.profileCalls++;
      return Promise.resolve({ id: 'test-user', activo: true });
    },
    getEmailForUserId: () => Promise.resolve('pepito.gonzalez@gmail.com'),
    sendRecoveryEmail: (email) => {
      state.emailCalls++;
      state.sentEmails.push(email);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { state, handler: createRecoveryHandler(dependencies) };
}

function request(body: unknown, apiKey = 'public-test-key') {
  return new Request('https://example.invalid/recover-password', {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

Deno.test('enmascara correos adecuadamente', () => {
  assert.equal(maskEmail('pepito@gmail.com'), 'pepiXXXXX@gmail.com');
  assert.equal(maskEmail('juan@example.com'), 'juXXXXX@example.com');
  assert.equal(maskEmail('a@b.com'), 'aXXXXX@b.com');
  assert.equal(maskEmail('tecnico.molins@bowlingservices.cl'), 'tecnXXXXX@bowlingservices.cl');
});

Deno.test('admite preflight OPTIONS con cabeceras CORS', async () => {
  const { handler } = fixture();
  const response = await handler(
    new Request('https://example.invalid/recover-password', { method: 'OPTIONS' }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('valida RUN y rechaza RUN inválido', async () => {
  const { handler, state } = fixture();
  const res = await handler(request({ run: '12345678-9' }));
  assert.equal(res.status, 400);
  assert.equal(state.emailCalls, 0);
});

Deno.test('recupera contraseña por RUN válido, envía correo y devuelve correo enmascarado', async () => {
  const { handler, state } = fixture();
  const response = await handler(request({ run: '12.345.678-5' }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.maskedEmail, 'pepiXXXXX@gmail.com');
  assert.deepEqual(state.sentEmails, ['pepito.gonzalez@gmail.com']);
  assert.deepEqual(state.buckets, ['global', 'run:12345678']);
});

Deno.test('rechaza con 404 si el RUN no está registrado', async () => {
  const { handler } = fixture({
    findProfileByRun: () => Promise.resolve(null),
  });
  const response = await handler(request({ run: '12.345.678-5' }));
  assert.equal(response.status, 404);
});

Deno.test('rechaza con 403 si la cuenta del RUN está inactiva', async () => {
  const { handler } = fixture({
    findProfileByRun: () => Promise.resolve({ id: 'inactive', activo: false }),
  });
  const response = await handler(request({ run: '12.345.678-5' }));
  assert.equal(response.status, 403);
});