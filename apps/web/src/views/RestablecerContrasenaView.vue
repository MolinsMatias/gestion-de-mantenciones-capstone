<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import AuthPagina from '../components/auth/AuthPagina.vue'
import CampoPassword from '../components/auth/CampoPassword.vue'
import {
  crearSesionRecuperacion,
  extraerEnlaceRecuperacion,
} from '../services/recuperacion.service'
import { validarPassword } from '../utils/run-recuperacion'
const password = ref('')
const confirmacion = ref('')
const error = ref('')
const errorEnlace = ref('')
const verificando = ref(true)
const guardando = ref(false)
const actualizado = ref(false)
const enlace = extraerEnlaceRecuperacion()
const sesion = crearSesionRecuperacion()
let desmontado = false
onMounted(async () => {
  try {
    await sesion.iniciar(enlace)
  } catch (causa) {
    if (!desmontado)
      errorEnlace.value =
        causa instanceof Error ? causa.message : 'No se pudo validar el enlace.'
  } finally {
    if (!desmontado) verificando.value = false
  }
})
async function guardar() {
  if (
    verificando.value ||
    guardando.value ||
    actualizado.value ||
    errorEnlace.value
  )
    return
  error.value = validarPassword(password.value)
  if (!error.value && password.value !== confirmacion.value)
    error.value = 'Las contraseñas no coinciden.'
  if (error.value) return
  guardando.value = true
  try {
    await sesion.actualizar(password.value)
    if (!desmontado) {
      password.value = ''
      confirmacion.value = ''
      actualizado.value = true
    }
  } catch (causa) {
    if (!desmontado)
      error.value =
        causa instanceof Error
          ? causa.message
          : 'No se pudo actualizar la contraseña.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}
onBeforeUnmount(() => {
  desmontado = true
  password.value = ''
  confirmacion.value = ''
  void sesion.cerrar()
})
</script>
<template>
  <AuthPagina
    titulo="Nueva contraseña"
    descripcion="Define y confirma la contraseña que utilizarás para ingresar con tu RUN."
  >
    <p v-if="verificando" role="status" class="text-sm text-slate-600">
      Validando enlace de recuperación…
    </p>
    <div v-else-if="errorEnlace" class="space-y-4">
      <ExclamationTriangleIcon
        class="size-12 text-amber-600"
        aria-hidden="true"
      />
      <p role="alert" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        {{ errorEnlace }}
      </p>
      <RouterLink
        :to="{ name: 'recuperar-contrasena' }"
        class="block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white"
        >Solicitar un nuevo enlace</RouterLink
      >
    </div>
    <div v-else-if="actualizado" class="space-y-4">
      <CheckCircleIcon class="size-12 text-emerald-600" aria-hidden="true" />
      <p role="status" class="font-semibold text-slate-900">
        Contraseña actualizada correctamente.
      </p>
      <p class="text-sm text-slate-600">
        Ya puedes iniciar sesión con tu RUN y tu nueva contraseña.
      </p>
      <RouterLink
        :to="{ name: 'login', query: { password: 'actualizada' } }"
        class="block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white"
        >Ir a iniciar sesión</RouterLink
      >
    </div>
    <form v-else class="space-y-5" @submit.prevent="guardar">
      <p class="text-xs leading-relaxed text-slate-500">
        Usa al menos 6 caracteres y un máximo de 72 bytes. No reutilices tu
        contraseña anterior.
      </p>
      <CampoPassword
        id="nueva-password"
        v-model="password"
        etiqueta="Nueva contraseña"
        :disabled="guardando"
      />
      <CampoPassword
        id="confirmar-password"
        v-model="confirmacion"
        etiqueta="Confirmar contraseña"
        :disabled="guardando"
      />
      <p
        v-if="error"
        role="alert"
        class="rounded-xl bg-red-50 p-3 text-sm text-red-700"
      >
        {{ error }}
      </p>
      <button
        type="submit"
        :disabled="guardando"
        class="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {{ guardando ? 'Guardando…' : 'Guardar nueva contraseña' }}
      </button>
    </form>
    <RouterLink
      v-if="!actualizado && !guardando"
      :to="{ name: 'login' }"
      class="mt-6 block text-center text-sm font-semibold text-blue-600 hover:underline"
      >Volver al inicio de sesión</RouterLink
    >
  </AuthPagina>
</template>
