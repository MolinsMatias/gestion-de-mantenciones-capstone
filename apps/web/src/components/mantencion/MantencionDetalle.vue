<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import Dialog from 'primevue/dialog'
import { etiquetaMantencion, fechaMantencion, obtenerDetalleMantencion, type FilaMantencion } from '../../services/mantencion.service'
import MantencionEvidencias from './MantencionEvidencias.vue'

const props = defineProps<{ fila: FilaMantencion }>()
const emit = defineEmits<{ cerrar: [] }>()
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
  <Dialog :visible="true" modal block-scroll :draggable="false"
    :style="{ width: 'min(72rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
    @update:visible="visible => { if (!visible) emit('cerrar') }">
    <template #header>
      <div class="min-w-0">
        <h2 id="titulo-detalle-mantencion" class="text-lg font-bold text-slate-900">Detalle de mantención</h2>
        <p v-if="fila.maquina?.nombre" class="truncate text-sm text-slate-500">{{ fila.maquina.nombre }}</p>
      </div>
    </template>

    <div class="space-y-6 py-2" role="region" aria-label="Contenido de la mantención" tabindex="0">
      <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="text-slate-500">Máquina</dt>
          <dd class="font-medium">{{ fila.maquina?.nombre ?? 'No disponible' }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Código</dt>
          <dd class="font-medium">{{ fila.maquina?.codigo_interno ?? 'No disponible' }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Local registrado</dt>
          <dd class="font-medium">{{ fila.local?.nombre ?? 'No disponible' }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Tipo</dt>
          <dd class="font-medium">{{ etiquetaMantencion(fila.tipo) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Recibida</dt>
          <dd class="font-medium">{{ fechaMantencion(fila.recibida_at) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Finalizada</dt>
          <dd class="font-medium">{{ fechaMantencion(fila.finalizada_at) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Estado del registro</dt>
          <dd class="font-medium">{{ etiquetaMantencion(fila.estado) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Estado final del equipo</dt>
          <dd class="font-medium">{{ etiquetaMantencion(fila.estado_equipo_final) }}</dd>
        </div>
      </dl>

      <p v-if="cargando" role="status" class="mt-4 text-sm text-slate-600">Cargando información del registro…</p>
      <p v-else-if="error" role="alert" class="mt-4 text-sm text-red-700">{{ error }}</p>

      <div v-else-if="detalle" class="space-y-6">
        <section class="border-t border-slate-200 pt-4">
          <h3 class="mb-3 font-semibold text-slate-900">Pauta y técnico</h3>
          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-slate-500">Técnico</dt>
              <dd class="font-medium">{{ detalle.nombreTecnico || 'No disponible' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Pauta aplicada</dt>
              <dd class="font-medium">{{ detalle.pauta ? detalle.pauta.nombre + ' · versión ' + detalle.pauta.version : 'No disponible' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Iniciada</dt>
              <dd class="font-medium">{{ fechaMantencion(detalle.registro.iniciada_at) }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Enviada</dt>
              <dd class="font-medium">{{ fechaMantencion(detalle.registro.enviada_at) }}</dd>
            </div>
          </dl>
        </section>

        <section class="border-t border-slate-200 pt-4">
          <h3 class="mb-3 font-semibold text-slate-900">Informe técnico</h3>
          <dl class="space-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Requiere repuestos</dt>
              <dd class="font-medium">{{ detalle.registro.requiere_repuestos === true ? 'Sí' : detalle.registro.requiere_repuestos === false ? 'No' : 'Sin informar' }}</dd>
            </div>
            <div v-for="campo in textos" :key="campo.nombre">
              <dt class="text-slate-500">{{ campo.nombre }}</dt>
              <dd class="whitespace-pre-wrap break-words font-medium">{{ campo.valor || 'Sin informar' }}</dd>
            </div>
          </dl>
        </section>

        <section class="border-t border-slate-200 pt-4">
          <h3 ref="tituloRespuestas" tabindex="-1" class="mb-3 scroll-mt-4 font-semibold text-slate-900">
            Respuestas de la pauta ({{ detalle.respuestas.length }})
          </h3>
          <p v-if="!detalle.respuestas.length" class="text-sm text-slate-500">Sin respuestas disponibles.</p>
          <ul v-else class="space-y-3">
            <li v-for="respuesta in detalle.respuestas" :key="respuesta.id"
              class="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <p class="min-w-0 flex-1 basis-56 break-words font-medium">{{ respuesta.pregunta }}</p>
                <p class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-xs">
                  {{ etiquetaMantencion(respuesta.resultado) }}
                </p>
              </div>
              <p v-if="respuesta.observaciones" class="whitespace-pre-wrap break-words text-slate-600">
                {{ respuesta.observaciones }}
              </p>
              <MantencionEvidencias
                v-if="detalle.evidencias.some(archivo => archivo.respuesta_item_id === respuesta.id)"
                :evidencias="detalle.evidencias.filter(archivo => archivo.respuesta_item_id === respuesta.id)" />
            </li>
          </ul>
        </section>

        <section class="border-t border-slate-200 pt-4">
          <h3 class="mb-3 font-semibold text-slate-900">Otras evidencias</h3>
          <MantencionEvidencias :evidencias="evidenciasGenerales" />
        </section>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <button v-if="detalle" type="button"
          class="rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" @click="irARespuestas">
          Ir a respuestas ({{ detalle.respuestas.length }})
        </button>
        <button type="button"
          class="ml-auto rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          @click="emit('cerrar')">
          Cerrar
        </button>
      </div>
    </template>
  </Dialog>
</template>
