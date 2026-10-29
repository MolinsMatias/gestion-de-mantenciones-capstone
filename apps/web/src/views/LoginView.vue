<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline'

import { useAuthStore } from '../stores/auth'

import { RouterLink, useRoute, useRouter } from 'vue-router'


const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const {
  autenticado,
  cargando,
  inicializando,
  error,
} = storeToRefs(auth)

const run = ref('')
const password = ref('')
const mostrarPassword = ref(false)

onMounted(() => {
  void auth.inicializar()
})

async function ingresar(): Promise<void> {
  const resultado = await auth.iniciarSesion(run.value, password.value)

  if (resultado) {
    password.value = ''
    mostrarPassword.value = false

    await router.replace('/monitor')
  }
}

function formatearRun(event: Event): void {
  const input = event.target as HTMLInputElement

  const limpio = input.value
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .slice(0, 9)

  if (limpio.length <= 1) {
    run.value = limpio
    input.value = limpio
    return
  }

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  const cuerpoFormateado = cuerpo.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    '.',
  )

  run.value = `${cuerpoFormateado}-${dv}`
  input.value = run.value
}



</script>

<template>
  <main class="grid min-h-screen bg-slate-100 lg:grid-cols-2">
    <section class="relative hidden overflow-hidden bg-navy-900 p-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden="true" class="absolute -right-32 top-20 size-96 rounded-full bg-blue-500/20 blur-3xl" />

      <p class="relative text-xl font-bold">Bowling Services</p>

      <div class="relative max-w-lg">
        <p class="mb-5 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Gestión de mantenimiento
        </p>

        <h1 class="text-5xl font-bold leading-tight">
          Tu operación,<br />
          en un solo lugar.
        </h1>

        <p class="mt-6 text-lg leading-relaxed text-slate-300">
          Consulta tus locales, máquinas y registros de mantenimiento.
        </p>
      </div>

      <p class="relative text-sm text-slate-400">
        Panel web · Bowling Services
      </p>
    </section>

    <section class="flex items-center justify-center px-5 py-12">
      <div class="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
        <p v-if="route.query.acceso === 'denegado'" role="alert"
          class="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Este panel requiere una cuenta activa con rol administrador.
        </p>

        <p v-else-if="route.query.acceso === 'error'" role="alert"
          class="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          No se pudieron verificar tus permisos. Intenta nuevamente.
        </p>

        <p v-if="inicializando" role="status" class="text-center text-slate-500">
          Comprobando sesión…
        </p>

        <!-- Confirmación temporal; luego mostraremos el monitor. -->
        <p v-if="inicializando" role="status" class="text-center text-slate-500">
          Comprobando sesión…
        </p>

        <template v-else>
          <div class="mb-6 flex size-12 items-center justify-center rounded-2xl bg-blue-50">
            <LockClosedIcon class="size-6 text-blue-600" aria-hidden="true" />
          </div>
          <h1 class="mt-3 text-3xl font-bold text-slate-900">
            Bienvenido
          </h1>

          <p class="mt-2 text-sm text-slate-500">
            Ingresa con tu RUN y contraseña.
          </p>

          <form class="mt-8 space-y-5" @submit.prevent="ingresar">
            <div>
              <label for="run" class="block text-sm font-semibold text-slate-700">
                RUN
              </label>

              <input id="run" :value="run" @input="formatearRun" name="username" type="text" autocomplete="username"
                placeholder="12.345.678-5" maxlength="32" required :disabled="cargando"
                class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />

              <p class="mt-2 text-xs text-slate-500">
                Incluye el dígito verificador.
              </p>
            </div>

            <div>
              <label for="password" class="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>

              <div class="relative mt-2">
                <input id="password" v-model="password" name="password" :type="mostrarPassword ? 'text' : 'password'"
                  autocomplete="current-password" maxlength="1024" required :disabled="cargando"
                  class="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />

                <button type="button" :aria-label="mostrarPassword
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
                  " :aria-pressed="mostrarPassword"
                  class="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-blue-600"
                  @click="mostrarPassword = !mostrarPassword">
                  <EyeSlashIcon v-if="mostrarPassword" class="size-5" aria-hidden="true" />
                  <EyeIcon v-else class="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {{ error }}
            </p>

            <button type="submit" :disabled="cargando"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {{ cargando ? 'Ingresando…' : 'Ingresar' }}

              <ArrowRightIcon v-if="!cargando" class="size-5" aria-hidden="true" />
            </button>
          </form>

          <p class="mt-6 text-center text-xs text-slate-500">
            ¿No puedes ingresar? Contacta al administrador.
          </p>
        </template>
      </div>
    </section>
  </main>
</template>