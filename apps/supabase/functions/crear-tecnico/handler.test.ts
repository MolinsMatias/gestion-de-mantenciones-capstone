import { createAltaTecnicoHandler, type AltaDependencies, type PerfilNuevo } from './handler.ts'
import { parseRun } from './run.ts'

function assert(valor: unknown, mensaje = 'Falló la comprobación'): asserts valor {
  if (!valor) throw new Error(mensaje)
}

function preparar(cambios: Partial<AltaDependencies> = {}) {
  const llamadas: string[] = []
  let perfil: PerfilNuevo | undefined
  const deps: AltaDependencies = {
    async autorizar() { llamadas.push('autorizar'); return 'permitido' },
    async existeRun() { llamadas.push('run'); return false },
    async rolesTecnicos() { return [{ id: 'rol-tecnico' }] },
    async crearAuth() { llamadas.push('auth'); return 'usuario-nuevo' },
    async insertarPerfil(datos) { perfil = datos; return null },
    async buscarPerfil() { llamadas.push('verificar'); return null },
    async compensarAuth() { llamadas.push('compensar'); return true },
    ...cambios,
  }
  return { handler: createAltaTecnicoHandler(deps, ['http://localhost:5173']), llamadas, perfil: () => perfil }
}

const valido = { run: '12.345.678-5', email: 'tecnico@example.com', password: 'ClaveInicial123!', nombre: 'Ana', apellido_paterno: 'Pérez' }
const peticion = (body: unknown = valido, autorizado = true) => new Request('http://localhost/crear-tecnico', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(autorizado ? { authorization: 'Bearer prueba' } : {}) },
  body: JSON.stringify(body),
})

Deno.test('RUN con puntos y DV válido', () => {
  assert(parseRun(valido.run)?.run === '12345678')
  assert(parseRun('12.345.678-9') === null)
})
Deno.test('alta válida crea el perfil técnico', async () => {
  const prueba = preparar()
  const respuesta = await prueba.handler(peticion())
  assert(respuesta.status === 201)
  assert(prueba.perfil()?.run === '12345678')
  assert(prueba.perfil()?.rol_id === 'rol-tecnico')
  assert(!prueba.llamadas.includes('compensar'))
})
Deno.test('requiere un token', async () => {
  const prueba = preparar()
  assert((await prueba.handler(peticion(valido, false))).status === 401)
  assert(!prueba.llamadas.length)
})
Deno.test('rechaza tokens inválidos y perfiles sin permiso', async () => {
  for (const permiso of ['invalido', 'denegado'] as const) {
    const prueba = preparar({ autorizar: () => Promise.resolve(permiso) })
    assert((await prueba.handler(peticion())).status === (permiso === 'invalido' ? 401 : 403))
    assert(!prueba.llamadas.includes('auth'))
  }
})
Deno.test('valida datos antes de crear Auth', async () => {
  for (const cambios of [{ run: '12345678-9' }, { password: 'corta' }, { email: 'no-es-correo' }, { nombre: '' }, { apellido_paterno: '' }]) {
    const prueba = preparar()
    assert((await prueba.handler(peticion({ ...valido, ...cambios }))).status === 400)
    assert(!prueba.llamadas.includes('auth'))
  }
})
Deno.test('RUN duplicado no crea otra cuenta', async () => {
  const prueba = preparar({ existeRun: () => Promise.resolve(true) })
  assert((await prueba.handler(peticion())).status === 409)
  assert(!prueba.llamadas.includes('auth'))
})
Deno.test('rol técnico ambiguo no crea otra cuenta', async () => {
  const prueba = preparar({ rolesTecnicos: () => Promise.resolve([]) })
  assert((await prueba.handler(peticion())).status === 503)
  assert(!prueba.llamadas.includes('auth'))
})
Deno.test('Auth rechaza el alta sin insertar perfil', async () => {
  const prueba = preparar({ crearAuth: () => Promise.resolve(null) })
  assert((await prueba.handler(peticion())).status === 400)
  assert(!prueba.perfil())
})
Deno.test('compensa Auth si INSERT falla y no hay perfil', async () => {
  const prueba = preparar({ insertarPerfil: () => Promise.resolve({ code: '23505' }) })
  assert((await prueba.handler(peticion())).status === 409)
  assert(prueba.llamadas.includes('compensar'))
})
Deno.test('si la respuesta del INSERT se perdió, conserva un perfil confirmado', async () => {
  const prueba = preparar({
    insertarPerfil: () => Promise.reject(new Error('red')),
    buscarPerfil: () => Promise.resolve({ run: '12345678', rol_id: 'rol-tecnico' }),
  })
  assert((await prueba.handler(peticion())).status === 201)
  assert(!prueba.llamadas.includes('compensar'))
})
Deno.test('no compensa si no puede verificar el perfil', async () => {
  const prueba = preparar({
    insertarPerfil: () => Promise.resolve({}),
    buscarPerfil: () => Promise.reject(new Error('red')),
  })
  assert((await prueba.handler(peticion())).status === 503)
  assert(!prueba.llamadas.includes('compensar'))
})
Deno.test('un perfil inesperado requiere revisión sin borrarlo', async () => {
  const prueba = preparar({
    insertarPerfil: () => Promise.resolve({}),
    buscarPerfil: () => Promise.resolve({ run: 'otro', rol_id: 'otro' }),
  })
  assert((await prueba.handler(peticion())).status === 503)
  assert(!prueba.llamadas.includes('compensar'))
})
Deno.test('compensación fallida devuelve alta incompleta', async () => {
  const prueba = preparar({ insertarPerfil: () => Promise.resolve({}), compensarAuth: () => Promise.resolve(false) })
  assert((await prueba.handler(peticion())).status === 503)
})
Deno.test('limita el tamaño del cuerpo', async () => {
  const prueba = preparar()
  assert((await prueba.handler(peticion({ ...valido, nombre: 'a'.repeat(9000) }))).status === 413)
  assert(!prueba.llamadas.includes('auth'))
})
Deno.test('CORS y método', async () => {
  const prueba = preparar()
  assert((await prueba.handler(new Request('http://localhost', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } }))).status === 204)
  assert((await prueba.handler(new Request('http://localhost'))).status === 405)
  assert((await prueba.handler(new Request('http://localhost', { method: 'OPTIONS', headers: { origin: 'https://otro.example' } }))).status === 403)
  assert(!prueba.llamadas.length)
})
