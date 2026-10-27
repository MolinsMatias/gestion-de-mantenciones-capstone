import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

interface LoginResponse {
    access_token: string
    refresh_token: string
}

export const useAuthStore = defineStore('auth', () => {
    const session = ref<Session | null>(null)
    const cargando = ref(false)
    const inicializando = ref(true)
    const error = ref('')

    let inicializacion: Promise<void> | null = null

    const autenticado = computed(() => session.value !== null)

    supabase.auth.onAuthStateChange((_evento, nuevaSession) => {
        session.value = nuevaSession
    })

    async function inicializar(): Promise<void> {
        if (inicializacion) return inicializacion

        inicializacion = (async () => {
            try {
                const { data, error: sessionError } =
                    await supabase.auth.getSession()

                if (sessionError) throw sessionError

                session.value = data.session
            } catch {
                error.value = 'No se pudo recuperar la sesión.'
            } finally {
                inicializando.value = false
            }
        })()

        return inicializacion
    }

    async function iniciarSesion(
        run: string,
        password: string,
    ): Promise<boolean> {
        if (cargando.value) return false

        error.value = ''

        if (!run.trim() || !password) {
            error.value = 'Ingresa tu RUN y contraseña.'
            return false
        }

        cargando.value = true

        try {
            const { data, error: functionError } =
                await supabase.functions.invoke<LoginResponse>('login-run', {
                    body: {
                        run: run.trim(),
                        password,
                    },
                })

            if (functionError) {
                if (functionError instanceof FunctionsHttpError) {
                    const respuesta = await functionError.context
                        .json()
                        .catch(() => null)

                    error.value =
                        typeof respuesta?.message === 'string'
                            ? respuesta.message
                            : 'No se pudo iniciar sesión.'
                } else {
                    error.value =
                        'No se pudo conectar con el servicio de acceso.'
                }

                return false
            }

            if (
                typeof data?.access_token !== 'string' ||
                typeof data?.refresh_token !== 'string'
            ) {
                error.value = 'El servicio devolvió una respuesta no válida.'
                return false
            }

            const { data: authData, error: authError } =
                await supabase.auth.setSession({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                })

            if (authError || !authData.session) {
                error.value = 'No se pudo guardar la sesión. Intenta nuevamente.'
                return false
            }

            session.value = authData.session
            return true
        } catch {
            error.value = 'Ocurrió un problema al iniciar sesión.'
            return false
        } finally {
            cargando.value = false
        }
    }

    async function cerrarSesion(): Promise<void> {
        if (cargando.value) return

        error.value = ''
        cargando.value = true

        try {
            const { error: signOutError } = await supabase.auth.signOut({
                scope: 'local',
            })

            if (signOutError) throw signOutError

            session.value = null
        } catch {
            error.value = 'No se pudo cerrar la sesión. Intenta nuevamente.'
        } finally {
            cargando.value = false
        }
    }

    return {
        autenticado,
        cargando,
        inicializando,
        error,
        inicializar,
        iniciarSesion,
        cerrarSesion,
    }
})