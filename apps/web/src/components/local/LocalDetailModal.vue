<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BuildingStorefrontIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import LocalInfoView from './LocalInfoView.vue'
import LocalAccionesEstado from './LocalAccionesEstado.vue'
import LocalEditForm, { type GuardarLocalEdicionPayload } from './LocalEditForm.vue'
import { actualizarLocal, obtenerDetalleLocal } from '../../services/detalle-local.service'
import type { LocalDetalle, LocalRegistro } from '../../types/detalle-local'
import type { MaquinaMonitor } from '../../types/monitor'

const props = defineProps<{ localId: string; maquinasActivas: MaquinaMonitor[] }>()
const emit = defineEmits<{ cerrar: []; actualizado: [local: LocalRegistro]; eliminado: [id: string] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const local = ref<LocalDetalle | null>(null)
const editando = ref(false)
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
  if (!local.value || cargando.value || guardando.value || editando.value) return
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
      activo: local.value.activo === true,
      comuna_id: datos.comuna_id,
    })
    if (desmontado) return
    local.value = { ...actualizado, pais: datos.pais, region: datos.region, comuna: datos.comuna }
    editando.value = false
    mensaje.value = 'Los cambios del local se guardaron correctamente.'
    emit('actualizado', actualizado)
  } catch (causa: unknown) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo guardar el local.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}

function alCambiarEstadoLocal(activo: boolean): void {
  if (!local.value || desmontado) return
  const actualizado = { ...local.value, activo }
  local.value = actualizado
  error.value = ''
  mensaje.value = activo ? 'Local reabierto correctamente.' : 'Local suspendido correctamente.'
  emit('actualizado', actualizado)
}

function alCerrarLocal(): void {
  if (!desmontado) emit('eliminado', props.localId)
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
      class="m-auto w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      @cancel.prevent="cerrar">
      <div class="flex max-h-[90dvh] min-h-0 flex-col">
        <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <BuildingStorefrontIcon class="size-7 shrink-0 text-blue-600" aria-hidden="true" />
            <h2 id="detalle-local-titulo" class="text-xl font-bold">
              {{ editando ? 'Editar local' : 'Información del local' }}
            </h2>
          </div>
          <button type="button" aria-label="Cerrar ficha" :disabled="guardando"
            class="shrink-0 rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50" @click="cerrar">
            <XMarkIcon class="size-5" aria-hidden="true" />
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando información del local…</p>
          <p v-if="mensaje" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{{ mensaje }}
          </p>
          <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

          <template v-if="local">
            <LocalEditForm v-if="editando" :local="local" :guardando="guardando" @cancelar="cancelarEdicion"
              @guardar="guardar" />
            <template v-else>
              <LocalInfoView :local="local" :maquinas-activas="props.maquinasActivas" />
              <LocalAccionesEstado v-if="!cargando" :key="local.id" :id="local.id" :activo="local.activo"
                @actualizado="alCambiarEstadoLocal" @cerrado="alCerrarLocal">
                <template #acciones-ficha>
                  <button type="button"
                    class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    @click="cargar">Recargar</button>
                  <button type="button"
                    class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    @click="iniciarEdicion">Editar</button>
                </template>
              </LocalAccionesEstado>
            </template>
          </template>
          <button v-else-if="!cargando" type="button" class="text-sm font-semibold text-blue-600 underline"
            @click="cargar">Reintentar</button>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
