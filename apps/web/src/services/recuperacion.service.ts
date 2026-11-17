import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { parseRun, validarPassword } from '../utils/run-recuperacion'

export const MENSAJE_RECUPERACION =
  'Si el RUN corresponde a una cuenta habilitada, recibirás un correo con las instrucciones.'
function configuracion() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key)
    throw new Error('Faltan las variables públicas de Supabase.')
  return { url: url.replace(/\/$/, ''), key }
}
export class LimiteRecuperacionError extends Error {
  readonly segundos = 900
}
export async function solicitarRecuperacion(
  run: string,
  signal: AbortSignal,
): Promise<void> {
  if (!parseRun(run)) {
    throw new Error('Ingresa un RUN con dígito verificador válido.')
  }

  const { url, key } = configuracion()
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  if (!base.pathname.endsWith('/')) base.pathname += '/'
  const redirectTo = new URL('restablecer-contrasena', base).href

  // Contrato del servicio compartido del móvil: { run, redirectTo }.
  // Se usa la clave pública, sin incorporar la sesión del administrador.
  const respuesta = await fetch(`${url}/functions/v1/recover-password`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ run, redirectTo }),
  })

  const cuerpo = await respuesta.json().catch(() => null)

  if (respuesta.status === 429) {
    throw new LimiteRecuperacionError(
      'Demasiados intentos. Espera 15 minutos antes de volver a solicitar el enlace.',
    )
  }

  // Un 404 del gateway significa que la función no está desplegada.
  if (respuesta.status === 404 && cuerpo?.code === 'NOT_FOUND') {
    throw new Error('El servicio de recuperación todavía no está disponible.')
  }

  // Según el servicio compartido: 404 = RUN desconocido, 403 = cuenta inactiva.
  // La interfaz conserva el mensaje genérico y no muestra el correo enmascarado.
  // Esto NO uniformiza las respuestas HTTP del servidor: ver README.
  if (respuesta.status === 404 || respuesta.status === 403) return

  if (respuesta.status === 400) {
    throw new Error('Ingresa un RUN con dígito verificador válido.')
  }

  if (!respuesta.ok) {
    throw new Error('No se pudo procesar la solicitud de recuperación. Intenta nuevamente.')
  }

  // La función existente devuelve { message, maskedEmail }, no { ok: true }.
  if (typeof cuerpo?.message !== 'string') {
    throw new Error('El servicio devolvió una respuesta de recuperación no válida.')
  }
}

export interface EnlaceRecuperacion {
  accessToken: string
  refreshToken: string
}
/** Extrae y elimina el fragmento sensible sin romper el estado de Vue Router. */
export function extraerEnlaceRecuperacion(): EnlaceRecuperacion | null {
  const parametros = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = parametros.get('access_token')
  const refreshToken = parametros.get('refresh_token')
  const valido =
    parametros.get('type') === 'recovery' && !!accessToken && !!refreshToken
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }
  return valido
    ? { accessToken: accessToken!, refreshToken: refreshToken! }
    : null
}

/** Nunca importa ni altera el cliente principal de services/supabase.ts. */
export function crearSesionRecuperacion() {
  let cliente: SupabaseClient | null = null
  let cerrada = false
  let iniciando: Promise<void> | null = null
  let verificada = false
  async function iniciar(enlace: EnlaceRecuperacion | null): Promise<void> {
    if (cerrada || !enlace)
      throw new Error(
        'El enlace no es válido o ya fue utilizado. Solicita uno nuevo.',
      )
    const { url, key } = configuracion()
    cliente = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'bowling-recuperacion-temporal',
        flowType: 'implicit',
      },
    })
    const actual = cliente
    iniciando = (async () => {
      const resultado = await actual.auth.setSession({
        access_token: enlace.accessToken,
        refresh_token: enlace.refreshToken,
      })
      if (resultado.error || !resultado.data.session)
        throw new Error(
          'El enlace no es válido o ha expirado. Solicita uno nuevo.',
        )
      const comprobacion = await actual.auth.getUser()
      if (comprobacion.error || !comprobacion.data.user || cerrada)
        throw new Error('No se pudo validar el enlace. Solicita uno nuevo.')
      verificada = true
    })()
    await iniciando
  }
  async function actualizar(password: string): Promise<void> {
    if (cerrada || !verificada || !cliente)
      throw new Error('Solicita un nuevo enlace para cambiar tu contraseña.')
    const mensaje = validarPassword(password)
    if (mensaje) throw new Error(mensaje)
    const { data, error } = await cliente.auth.updateUser({ password })
    if (error || !data.user)
      throw new Error(
        'No se pudo actualizar la contraseña. Comprueba que sea distinta de la anterior y que el enlace siga vigente.',
      )
    // Éxito real de Auth: no presentar como fallo si el cierre posterior no tiene red.
    verificada = false
    await cerrar()
  }
  async function cerrar(): Promise<void> {
    cerrada = true
    verificada = false
    await iniciando?.catch(() => undefined)
    if (cliente) {
      const actual = cliente
      cliente = null
      await actual.auth.signOut({ scope: 'local' }).catch(() => undefined)
      await actual.auth.stopAutoRefresh().catch(() => undefined)
    }
  }
  return { iniciar, actualizar, cerrar }
}
