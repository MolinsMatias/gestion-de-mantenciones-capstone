<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { etiquetaMantencion, fechaMantencion, obtenerDetalleMantencion, type FilaMantencion } from '../../services/mantencion.service'

import MantencionEvidencias from './MantencionEvidencias.vue'

const props = defineProps<{ fila: FilaMantencion }>()
const emit = defineEmits<{ cerrar: [] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const tituloRespuestas = ref<HTMLHeadingElement | null>(null)

function irARespuestas() {
  tituloRespuestas.value?.focus({ preventScroll: true })
  tituloRespuestas.value?.scrollIntoView({ block: 'start' })
}
const detalle = ref<Awaited<ReturnType<typeof obtenerDetalleMantencion>> | null>(null)
const evidenciasGenerales = computed(() => {
  const ids = new Set(detalle.value?.respuestas.map(respuesta => respuesta.id))
  return detalle.value?.evidencias.filter(archivo => !archivo.respuesta_item_id || !ids.has(archivo.respuesta_item_id)) ?? []
})
const textos = computed(() => {
  const registro = detalle.value?.registro
  if (!registro) return []
  return [
    { nombre: 'Falla reportada', valor: registro.falla_reportada },
    { nombre: 'Trabajos realizados', valor: registro.trabajos_realizados },
    { nombre: 'Detalle de repuestos', valor: registro.detalle_repuestos },
    { nombre: 'Pendientes', valor: registro.pendientes },
    { nombre: 'Observaciones', valor: registro.observaciones },
  ]
})
const cargando = ref(true)
const error = ref('')
const solicitud = new AbortController()

onMounted(async () => {
  dialogo.value?.showModal()
  try {
    const datos = await obtenerDetalleMantencion(props.fila.id, solicitud.signal)
    if (!solicitud.signal.aborted) detalle.value = datos
  } catch {
    if (!solicitud.signal.aborted) error.value = 'No se pudo cargar la información adicional de esta mantención.'
  } finally {
    if (!solicitud.signal.aborted) cargando.value = false
  }
})
onScopeDispose(() => solicitud.abort())
</script>

<template>
  <dialog ref="dialogo" aria-labelledby="titulo-detalle-mantencion" @close="emit('cerrar')"
    class="modal-mantencion fixed inset-0 m-auto overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/45">
    <div class="modal-mantencion__marco flex min-h-0 flex-col">
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <h2 id="titulo-detalle-mantencion" class="text-lg font-bold">Detalle de mantención</h2>
          <p v-if="fila.maquina?.nombre" class="truncate text-sm text-slate-500">{{ fila.maquina.nombre }}</p>
        </div>
        <form method="dialog" class="shrink-0">
          <button autofocus
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Cerrar</button>
        </form>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" role="region"
        aria-label="Contenido de la mantención" tabindex="0">
        <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-slate-500">Máquina</dt>
            <dd>{{ fila.maquina?.nombre ?? 'No disponible' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Código</dt>
            <dd>{{ fila.maquina?.codigo_interno ?? 'No disponible' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Local registrado</dt>
            <dd>{{ fila.local?.nombre ?? 'No disponible' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Tipo</dt>
            <dd>{{ etiquetaMantencion(fila.tipo) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Recibida</dt>
            <dd>{{ fechaMantencion(fila.recibida_at) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Finalizada</dt>
            <dd>{{ fechaMantencion(fila.finalizada_at) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Estado del registro</dt>
            <dd>{{ etiquetaMantencion(fila.estado) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Estado final del equipo</dt>
            <dd>{{ etiquetaMantencion(fila.estado_equipo_final) }}</dd>
          </div>
        </dl>
        <p v-if="cargando" role="status" class="mt-6 text-sm text-slate-600">Cargando información del registro…</p>
        <p v-else-if="error" role="alert" class="mt-6 text-sm text-red-700">{{ error }}</p>
        <div v-else-if="detalle" class="mt-6 space-y-6">
          <section class="border-t border-slate-200 pt-4">
            <h3 class="mb-3 font-semibold">Pauta y técnico</h3>
            <dl class="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-slate-500">Técnico</dt>
                <dd>{{ detalle.nombreTecnico || 'No disponible' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Pauta aplicada</dt>
                <dd>{{ detalle.pauta ? detalle.pauta.nombre + ' · versión ' + detalle.pauta.version : 'No disponible' }}
                </dd>
              </div>
              <div>
                <dt class="text-slate-500">Iniciada</dt>
                <dd>{{ fechaMantencion(detalle.registro.iniciada_at) }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Enviada</dt>
                <dd>{{ fechaMantencion(detalle.registro.enviada_at) }}</dd>
              </div>
            </dl>
          </section>
          <section class="border-t border-slate-200 pt-4">
            <h3 class="mb-3 font-semibold">Informe técnico</h3>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-slate-500">Requiere repuestos</dt>
                <dd>{{ detalle.registro.requiere_repuestos === true ? 'Sí' : detalle.registro.requiere_repuestos ===
                  false ? 'No' : 'Sin informar' }}</dd>
              </div>
              <div v-for="campo in textos" :key="campo.nombre">
                <dt class="text-slate-500">{{ campo.nombre }}</dt>
                <dd class="whitespace-pre-wrap break-words">{{ campo.valor || 'Sin informar' }}</dd>
              </div>
            </dl>
          </section>
          <section class="border-t border-slate-200 pt-4">
            <h3 ref="tituloRespuestas" tabindex="-1" class="mb-3 scroll-mt-4 font-semibold">Respuestas de la pauta ({{
              detalle.respuestas.length }})</h3>
            <p v-if="!detalle.respuestas.length" class="text-sm text-slate-500">Sin respuestas disponibles.</p>
            <ul v-else class="space-y-3">
              <li v-for="respuesta in detalle.respuestas" :key="respuesta.id"
                class="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <p class="min-w-0 flex-1 basis-56 break-words font-medium">{{ respuesta.pregunta }}</p>
                  <p class="rounded-full bg-white px-3 py-1 text-sm text-slate-700">{{
                    etiquetaMantencion(respuesta.resultado) }}</p>
                </div>
                <p v-if="respuesta.observaciones" class="whitespace-pre-wrap break-words">{{ respuesta.observaciones }}
                </p>
                <MantencionEvidencias
                  v-if="detalle.evidencias.some(archivo => archivo.respuesta_item_id === respuesta.id)"
                  :evidencias="detalle.evidencias.filter(archivo => archivo.respuesta_item_id === respuesta.id)" />
              </li>
            </ul>
          </section>
          <section class="border-t border-slate-200 pt-4">
            <h3 class="mb-3 font-semibold">Otras evidencias</h3>
            <MantencionEvidencias :evidencias="evidenciasGenerales" />
          </section>
        </div>
      </div>

      <footer
        class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <button v-if="detalle" type="button"
          class="rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" @click="irARespuestas">
          Ir a respuestas ({{ detalle.respuestas.length }})
        </button>
        <form method="dialog" class="ml-auto">
          <button
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Cerrar</button>
        </form>
      </footer>
    </div>
  </dialog>
</template>


<style scoped>
.modal-mantencion {
  width: min(72rem, calc(100% - 1rem));
  max-width: none;
  max-height: calc(100dvh - 1rem);
}

.modal-mantencion__marco {
  height: min(56rem, calc(100dvh - 1rem));
}

@media (min-width: 640px) {
  .modal-mantencion {
    width: min(72rem, calc(100% - 3rem));
    max-height: calc(100dvh - 3rem);
  }

  .modal-mantencion__marco {
    height: min(56rem, calc(100dvh - 3rem));
  }
}
</style>
