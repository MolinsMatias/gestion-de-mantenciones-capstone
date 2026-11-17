<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import AuthPagina from '../components/auth/AuthPagina.vue'
import { formatearRun, parseRun } from '../utils/run-recuperacion'
import {
  MENSAJE_RECUPERACION,
  LimiteRecuperacionError,
  solicitarRecuperacion,
} from '../services/recuperacion.service'
const run = ref('')
const error = ref('')
const enviado = ref(false)
const cargando = ref(false)
const campo = ref<HTMLInputElement | null>(null)
const espera = ref(0)
let controller: AbortController | null = null
let temporizador: ReturnType<typeof setInterval> | undefined
function iniciarEspera(segundos: number) {
  clearInterval(temporizador)
  espera.value = segundos
  temporizador = setInterval(() => {
    espera.value--
    if (espera.value <= 0) clearInterval(temporizador)
  }, 1000)
}
function alEscribir(evento: Event) {
  const input = evento.target as HTMLInputElement
  run.value = formatearRun(input.value)
  input.value = run.value
  error.value = ''
}
async function enviar() {
  if (cargando.value || espera.value) return
  if (!parseRun(run.value)) {
    error.value = 'Ingresa un RUN con dígito verificador válido.'
    campo.value?.focus()
    return
  }
  error.value = ''
  cargando.value = true
  const actual = new AbortController()
  controller = actual
  const timeout = setTimeout(() => actual.abort(), 20_000)
  try {
    await solicitarRecuperacion(run.value, actual.signal)
    if (actual.signal.aborted) return
    enviado.value = true
    iniciarEspera(60)
  } catch (causa) {
    if (desmontado) return
    if (causa instanceof LimiteRecuperacionError) iniciarEspera(causa.segundos)
    error.value =
      causa instanceof Error && causa.name !== 'AbortError'
        ? causa.message
        : 'La solicitud tardó demasiado. Intenta nuevamente.'
  } finally {
    clearTimeout(timeout)
    if (!desmontado) cargando.value = false
  }
}
let desmontado = false
onBeforeUnmount(() => {
  desmontado = true
  controller?.abort()
  clearInterval(temporizador)
})
</script>
<template>
  <AuthPagina
    titulo="Recuperar contraseña"
    descripcion="Ingresa tu RUN para solicitar un enlace al correo asociado a tu cuenta."
  >
    <div v-if="enviado" class="space-y-4">
      <CheckCircleIcon class="size-12 text-emerald-600" aria-hidden="true" />
      <p role="status" class="text-sm leading-relaxed text-slate-700">
        {{ MENSAJE_RECUPERACION }}
      </p>
      <p class="text-xs text-slate-500">
        Revisa tu bandeja de entrada y la carpeta de correo no deseado.
      </p>
    </div>
    <form v-else class="space-y-5" @submit.prevent="enviar">
      <div>
        <label
          for="recovery-run"
          class="block text-sm font-semibold text-slate-700"
          >RUN</label
        ><input
          id="recovery-run"
          ref="campo"
          :value="run"
          type="text"
          autocomplete="username"
          maxlength="12"
          placeholder="12.345.678-5"
          required
          :disabled="cargando || espera > 0"
          :aria-invalid="!!error"
          aria-describedby="recovery-error"
          class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          @input="alEscribir"
        />
      </div>
      <button
        type="submit"
        :disabled="cargando || espera > 0"
        class="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {{
          cargando
            ? 'Procesando…'
            : espera
              ? `Espera ${espera} s`
              : 'Enviar instrucciones'
        }}
      </button>
    </form>
    <p
      id="recovery-error"
      v-if="error"
      role="alert"
      class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </p>
    <button
      v-if="enviado"
      type="button"
      :disabled="cargando || espera > 0"
      class="mt-5 w-full rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 disabled:opacity-50"
      @click="enviar"
    >
      {{
        cargando
          ? 'Procesando…'
          : espera
            ? `Puedes reenviar en ${espera} s`
            : 'Reenviar instrucciones'
      }}
    </button>
    <RouterLink
      :to="{ name: 'login' }"
      class="mt-6 block text-center text-sm font-semibold text-blue-600 hover:underline"
      >Volver a iniciar sesión</RouterLink
    >
  </AuthPagina>
</template>
