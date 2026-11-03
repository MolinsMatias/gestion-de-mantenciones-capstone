<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BuildingStorefrontIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import LocalInfoView from './LocalInfoView.vue'
import LocalEditForm, { type GuardarLocalEdicionPayload } from './LocalEditForm.vue'
import { actualizarLocal, eliminarLocal, obtenerDetalleLocal } from '../../services/detalle-local.service'
import type { LocalDetalle, LocalRegistro } from '../../types/detalle-local'
import type { MaquinaMonitor } from '../../types/monitor'

const props = defineProps<{
  localId: string
  maquinasActivas: MaquinaMonitor[]
}>()
const emit = defineEmits<{
  cerrar: []
  actualizado: [local: LocalRegistro]
  eliminado: [id: string]
}>()

const dialogo = ref<HTMLDialogElement | null>(null)
const local = ref<LocalDetalle | null>(null)
const editando = ref(false)
const mostrandoConfirmacion = ref(false)
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

let controller: AbortController | null = null
let desmontado = false
let focoAnterior: HTMLElement | null = null

async function cargar(): Promise<void> {
  if (cargando.value || editando.value || guardando.value) return
  controller?.abort()
  const peticion = new AbortController()
  controller = peticion
  cargando.value = true
  error.value = ''
  mensaje.value = ''
  local.value = null

  try {
    const resultado = await obtenerDetalleLocal(props.localId, peticion.signal)
    if (!desmontado) local.value = resultado
  } catch (causa: unknown) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo cargar el local.'
  } finally {
    if (!desmontado) cargando.value = false
  }
}

function iniciarEdicion(): void {
  if (!local.value || guardando.value || editando.value) return
  error.value = ''
  mensaje.value = ''
  editando.value = true
}

function cancelarEdicion(): void {
  if (guardando.value) return
  editando.value = false
  error.value = ''
}

async function guardar(datos: GuardarLocalEdicionPayload): Promise<void> {
  if (!local.value || !editando.value || guardando.value) return
  error.value = ''
  guardando.value = true

  try {
    const actualizado = await actualizarLocal(local.value, {
      nombre: datos.nombre,
      direccion: datos.direccion,
      activo: datos.activo,
      comuna_id: datos.comuna_id,
    })
    if (desmontado) return
    local.value = {
      ...actualizado,
      pais: datos.pais,
      region: datos.region,
      comuna: datos.comuna,
    }
    editando.value = false
    mensaje.value = 'Los cambios del local se guardaron correctamente.'
    emit('actualizado', actualizado)
  } catch (causa: unknown) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo guardar el local.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}

async function confirmarEliminacion(): Promise<void> {
  if (!local.value || editando.value || guardando.value || !mostrandoConfirmacion.value) return

  const id = local.value.id
  guardando.value = true
  error.value = ''

  try {
    await eliminarLocal(id)
    emit('eliminado', id)
  } catch (causa: unknown) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo eliminar el local.'
  } finally {
    guardando.value = false
    mostrandoConfirmacion.value = false
  }
}

function cerrar(): void {
  if (guardando.value) return
  if (editando.value) {
    error.value = 'Guarda los cambios o pulsa Cancelar edición antes de cerrar.'
    return
  }
  emit('cerrar')
}

onMounted(() => {
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogo.value?.showModal()
  void cargar()
})

onBeforeUnmount(() => {
  desmontado = true
  controller?.abort()
  dialogo.value?.close()
  if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
})





</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="detalle-local-titulo"
      class="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      @cancel.prevent="cerrar">
      <header class="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <BuildingStorefrontIcon class="mb-3 size-8 text-blue-600" aria-hidden="true" />
          <h2 id="detalle-local-titulo" class="text-2xl font-bold">
            {{ editando ? 'Editar local' : 'Información del local' }}
          </h2>
          <p class="mt-2 text-sm text-slate-500">
            {{ editando ? `Los cambios se aplican al pulsar Guardar cambios.` : `Consulta los datos o pulsa Editar para
            modificarlos.` }}
          </p>
        </div>
        <button type="button" aria-label="Cerrar ficha" :disabled="guardando"
          class="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50" @click="cerrar">
          <XMarkIcon class="size-5" aria-hidden="true" />
        </button>
      </header>

      <div class="space-y-5 p-6">
        <p v-if="cargando" role="status" class="text-sm text-slate-500">
          Cargando información del local…
        </p>
        <p v-if="mensaje" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {{ mensaje }}
        </p>
        <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {{ error }}
        </p>

        <LocalInfoView v-if="local && !editando" :local="local" :guardando="guardando"
          :mostrando-confirmacion="mostrandoConfirmacion" :maquinas-activas="props.maquinasActivas"
          @editar="iniciarEdicion" @recargar="cargar"
          @mostrar-confirmacion="mostrandoConfirmacion = true" @cancelar-confirmacion="mostrandoConfirmacion = false"
          @confirmar-eliminacion="confirmarEliminacion" />

        <LocalEditForm v-else-if="local && editando" :local="local" :guardando="guardando" @cancelar="cancelarEdicion"
          @guardar="guardar" />

        <button v-if="!local && !cargando" type="button" class="text-sm font-semibold text-blue-600 underline"
          @click="cargar">
          Reintentar
        </button>
      </div>
    </dialog>
  </Teleport>
</template>
