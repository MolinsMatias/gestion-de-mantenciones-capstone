import { createClient } from '@supabase/supabase-js'
import { createAltaTecnicoHandler, type AltaDependencies } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
const serverKey = Deno.env.get('APP_SECRET_KEY') ?? secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !serverKey) throw new Error('Configuración de Supabase incompleta.')
const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)
const admin = createClient(url, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const dependencies: AltaDependencies = {
  async autorizar(token) {
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) return 'invalido'
    const actor = await admin.from('usuario').select('activo,rol_id').eq('id', data.user.id).maybeSingle()
    if (actor.error) throw actor.error
    if (!actor.data?.activo) return 'denegado'
    const rol = await admin.from('rol').select('nombre').eq('id', actor.data.rol_id).maybeSingle()
    if (rol.error) throw rol.error
    return rol.data?.nombre === 'administrador' ? 'permitido' : 'denegado'
  },
  async existeRun(run) {
    const { data, error } = await admin.from('usuario').select('id').eq('run', run).limit(1)
    if (error) throw error
    return Boolean(data?.length)
  },
  async rolesTecnicos() {
    const { data, error } = await admin.from('rol').select('id').in('nombre', ['tecnico', 'técnico'])
    if (error) throw error
    return data ?? []
  },
  async crearAuth(email, password) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    return error ? null : data.user?.id ?? null
  },
  async insertarPerfil(perfil) {
    const { error } = await admin.from('usuario').insert(perfil)
    return error ? { code: error.code } : null
  },
  async buscarPerfil(id) {
    const { data, error } = await admin.from('usuario').select('run,rol_id').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },
  async compensarAuth(id) {
    const { error } = await admin.auth.admin.deleteUser(id)
    return !error
  },
}

Deno.serve(createAltaTecnicoHandler(dependencies, origins))
