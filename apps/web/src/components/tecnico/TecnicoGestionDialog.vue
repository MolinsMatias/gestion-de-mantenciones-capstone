<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import { parseRun, formatearRunTecnico } from '../../utils/run-tecnico'
import { crearTecnico, gestionarPerfilTecnico, type TecnicoListado } from '../../services/tecnico.service'
import {
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{ tecnico: TecnicoListado | null }>()
const emit = defineEmits<{ cerrar: []; guardado: [accion: 'crear' | 'editar' | 'deshabilitar'] }>()
const mostrarConfirmacionAlta = ref(false)
const guardando = ref(false)
const error = ref('')
const confirmandoBaja = ref(false)
const run = ref('')
const email = ref('')
const password = ref('')
const mostrarPassword = ref(false)
const runRevisado = ref(false)
const campoRun = ref<HTMLInputElement | null>(null)
const errorRun = computed(() => {
  if (!runRevisado.value) return ''
  if (!run.value.trim()) return 'Ingresa el RUN del técnico.'
  return parseRun(run.value) ? '' : 'Ingresa un RUN válido, incluido su dígito verificador.'
})

function revisarRun() {
  runRevisado.value = true
  run.value = formatearRunTecnico(run.value)
}
const datos = ref({
  nombre: props.tecnico?.primer_nombre ?? '',
  segundo_nombre: props.tecnico?.segundo_nombre ?? '',
  apellido_paterno: props.tecnico?.apellido_paterno ?? '',
  apellido_materno: props.tecnico?.apellido_materno ?? '',
})
const titulo = computed(() => confirmandoBaja.value ? 'Deshabilitar cuenta técnica' : props.tecnico ? 'Gestionar técnico' : 'Crear técnico')

function cerrar() {
  if (!guardando.value) {
    mostrarPassword.value = false
    password.value = ''
    emit('cerrar')
  }
}

async function guardar() {
  if (guardando.value) return
  if (!props.tecnico) {
    revisarRun()
    if (!parseRun(run.value)) {
      campoRun.value?.focus()
      return
    }
    if (password.value.length < 12 || new TextEncoder().encode(password.value).length > 72) {
      error.value = 'La contraseña debe tener al menos 12 caracteres y no superar 72 bytes.'
      return
    }
  }
  mostrarPassword.value = false
  guardando.value = true
  error.value = ''
  try {
    if (!props.tecnico) {
      await crearTecnico({ ...datos.value, run: run.value, email: email.value, password: password.value })
      password.value = ''
      emit('guardado', 'crear')
    } else {
      const accion = confirmandoBaja.value ? 'deshabilitar' : 'editar'
      await gestionarPerfilTecnico(props.tecnico.id, accion, accion === 'editar' ? datos.value : undefined)
      emit('guardado', accion)
    }
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}

function alEscribirRun(evento: Event): void {
  const input = evento.target as HTMLInputElement
  run.value = formatearRunTecnico(input.value)
  input.value = run.value
}
</script>

<template>
  <Dialog :visible="true" modal block-scroll :closable="!guardando" :close-on-escape="!guardando" :header="titulo"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
    @update:visible="visible => { if (!visible) cerrar() }">
    <form id="gestion-tecnico" class="space-y-4" @submit.prevent="guardar">
      <p v-if="confirmandoBaja" class="text-sm text-slate-700">
        ¿Deshabilitar la cuenta de <strong>{{ tecnico?.nombre }}</strong>?
        Su historial de mantenciones y su autoría se conservarán.
      </p>
      <fieldset v-else :disabled="guardando" class="grid gap-3 text-sm sm:grid-cols-2">
        <label class="grid gap-1">Nombre *
          <input v-model="datos.nombre" required maxlength="80" class="rounded-lg border border-slate-300 p-2" />
        </label>
        <label class="grid gap-1">Segundo nombre
          <input v-model="datos.segundo_nombre" maxlength="80" class="rounded-lg border border-slate-300 p-2" />
        </label>
        <label class="grid gap-1">Apellido paterno *
          <input v-model="datos.apellido_paterno" required maxlength="80"
            class="rounded-lg border border-slate-300 p-2" />
        </label>
        <label class="grid gap-1">Apellido materno
          <input v-model="datos.apellido_materno" maxlength="80" class="rounded-lg border border-slate-300 p-2" />
        </label>
        <template v-if="!tecnico">
          <div class="grid content-start gap-1">
            <label for="tecnico-run">RUN *</label>
            <input id="tecnico-run" ref="campoRun" :value="run" type="text" required maxlength="12"
              placeholder="12.345.678-5" autocomplete="off" spellcheck="false" :aria-invalid="!!errorRun"
              :aria-describedby="errorRun ? 'tecnico-run-error' : undefined" class="rounded-lg border p-2"
              :class="errorRun ? 'border-red-500' : 'border-slate-300'" @input="alEscribirRun" @blur="revisarRun" />
            <p v-if="errorRun" id="tecnico-run-error" role="alert" class="text-xs text-red-700">{{ errorRun }}</p>
          </div>
          <label class="grid gap-1">Correo *
            <input v-model="email" type="email" required maxlength="254" autocomplete="off"
              class="rounded-lg border border-slate-300 p-2" />
          </label>
          <div class="grid gap-1 sm:col-span-2">
            <label for="tecnico-password">Contraseña inicial (mínimo 12 caracteres) *</label>
            <div class="relative">
              <input id="tecnico-password" v-model="password" :type="mostrarPassword ? 'text' : 'password'" required
                minlength="12" maxlength="72" autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 p-2 pr-10" />
              <button type="button" :aria-label="mostrarPassword
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
                " :aria-pressed="mostrarPassword"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                @click="mostrarPassword = !mostrarPassword">
                <EyeSlashIcon v-if="mostrarPassword" class="size-5" aria-hidden="true" />
                <EyeIcon v-else class="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </template>
      </fieldset>
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    </form>
    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <button v-if="tecnico?.activo === true && !confirmandoBaja" type="button" :disabled="guardando"
          class="rounded-lg px-3 py-2 text-sm font-semibold text-red-700"
          @click="confirmandoBaja = true; error = ''">Deshabilitar cuenta</button>
        <button type="button" :disabled="guardando" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          @click="confirmandoBaja ? (confirmandoBaja = false, error = '') : cerrar()">{{ confirmandoBaja ? 'Volver' :
            'Cancelar' }}</button>
        <button type="submit" form="gestion-tecnico" :disabled="guardando"
          class="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :class="confirmandoBaja ? 'bg-red-700' : 'bg-blue-700'">
          {{ guardando ? 'Guardando…' : confirmandoBaja ? 'Sí, deshabilitar' : 'Guardar' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>
