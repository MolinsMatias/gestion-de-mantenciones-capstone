import { parseRun } from './run.ts'

export interface PerfilNuevo {
  id: string
  run: string
  dv: string
  nombre: string
  segundo_nombre: string | null
  apellido_paterno: string
  apellido_materno: string | null
  rol_id: string
  activo: true
}
export interface AltaDependencies {
  autorizar(token: string): Promise<'permitido' | 'invalido' | 'denegado'>
  existeRun(run: string): Promise<boolean>
  rolesTecnicos(): Promise<{ id: string }[]>
  crearAuth(email: string, password: string): Promise<string | null>
  insertarPerfil(perfil: PerfilNuevo): Promise<{ code?: string } | null>
  buscarPerfil(id: string): Promise<{ run: string; rol_id: string } | null>
  compensarAuth(id: string): Promise<boolean>
}

async function leerBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError()
  const bloques: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > 8192) {
        await reader.cancel()
        throw new RangeError()
      }
      bloques.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let inicio = 0
  for (const bloque of bloques) { bytes.set(bloque, inicio); inicio += bloque.byteLength }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function createAltaTecnicoHandler(deps: AltaDependencies, origins: string[]) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? ''
    const headers = {
      'Access-Control-Allow-Origin': origins.includes(origin) ? origin : 'null',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    }
    const responder = (status: number, body: object) => Response.json(body, { status, headers })
    if (origin && !origins.includes(origin)) return responder(403, { error: 'Origen no permitido.' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return responder(405, { error: 'Método no permitido.' })
    const jwt = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
    if (!jwt) return responder(401, { error: 'Inicia sesión nuevamente.' })
    try {
      const permiso = await deps.autorizar(jwt)
      if (permiso === 'invalido') return responder(401, { error: 'Inicia sesión nuevamente.' })
      if (permiso !== 'permitido') return responder(403, { error: 'Se requiere un administrador activo.' })

      let entrada: Record<string, unknown>
      try {
        const valor = await leerBody(request)
        if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new SyntaxError()
        entrada = valor as Record<string, unknown>
      } catch (error) {
        return responder(error instanceof RangeError ? 413 : 400, { error: 'Solicitud inválida.' })
      }

      const texto = (clave: string) => typeof entrada[clave] === 'string' ? (entrada[clave] as string).trim() : ''
      const run = parseRun(texto('run'))
      const email = texto('email').toLowerCase()
      const password = typeof entrada.password === 'string' ? entrada.password : ''
      const nombre = texto('nombre')
      const segundoNombre = texto('segundo_nombre')
      const paterno = texto('apellido_paterno')
      const materno = texto('apellido_materno')
      if (!run || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || password.length < 12 || new TextEncoder().encode(password).length > 72
        || !nombre || !paterno || [nombre, segundoNombre, paterno, materno].some(s => s.length > 80)) {
        return responder(400, { error: 'Revisa RUN, correo, contraseña, nombre y apellido paterno.' })
      }
      if (await deps.existeRun(run.run)) return responder(409, { error: 'El RUN ya está registrado.' })
      const roles = await deps.rolesTecnicos()
      if (roles.length !== 1) return responder(503, { error: 'El rol técnico no está configurado de forma única.' })
      const id = await deps.crearAuth(email, password)
      if (!id) return responder(400, { error: 'No se pudo crear la cuenta. Revisa si el correo ya existe o la contraseña cumple la política de Auth.' })

      let falloPerfil: { code?: string } | null
      try {
        falloPerfil = await deps.insertarPerfil({
          id, run: run.run, dv: run.dv, nombre, segundo_nombre: segundoNombre || null,
          apellido_paterno: paterno, apellido_materno: materno || null, rol_id: roles[0].id, activo: true,
        })
      } catch {
        // Una excepción de red no prueba que el INSERT haya fallado.
        falloPerfil = {}
      }
      if (!falloPerfil) return responder(201, { id })
      const vinculo = await deps.buscarPerfil(id)
      if (vinculo) {
        return String(vinculo.run) === run.run && vinculo.rol_id === roles[0].id
          ? responder(201, { id })
          : responder(503, { error: 'Auth generó un perfil distinto. Revisa el alta antes de reintentar.' })
      }
      if (!await deps.compensarAuth(id)) return responder(503, { error: 'Alta incompleta. Revisa Auth antes de reintentar.' })
      return responder(falloPerfil.code === '23505' ? 409 : 503, {
        error: falloPerfil.code === '23505' ? 'El RUN ya está registrado.' : 'No se pudo crear el perfil técnico.',
      })
    } catch {
      return responder(503, { error: 'No se pudo procesar el alta.' })
    }
  }
}
