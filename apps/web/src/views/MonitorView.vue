<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import KpiCard from '../components/monitor/KpiCard.vue'
import LocalCard from '../components/monitor/LocalCard.vue'
import MonitorHeader from '../components/monitor/MonitorHeader.vue'
import MonitorNotes from '../components/monitor/MonitorNotes.vue'
import LocalesFilters from '../components/monitor/LocalFilter.vue'
import CrearLocalModal from '../components/local/CrearLocalModal.vue'
import LocalDetailModal from '../components/local/LocalDetailModal.vue'
import { useMonitorStore } from '../stores/monitor'
import { useFiltroLocales } from '../composables/useFiltroLocal'

const monitor = useMonitorStore()
const {
  cargando, error, ultimaActualizacion, maquinasOperativas,
  inspeccionesHoy, fechaChile, localesActivos, resumenLocales,
} = storeToRefs(monitor)

// Totales completos: no cambian al filtrar las tarjetas.
const totalLocales = computed(() => resumenLocales.value.length)
const totalMaquinasActivas = computed(() =>
  resumenLocales.value.reduce((total, local) => total + local.activas, 0),
)
const horaActualizacion = computed(() =>
  ultimaActualizacion.value?.toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
  }),
)

const {
  busqueda: busquedaLocales,
  estado: estadoLocales,
  pagina: paginaLocales,
  hayFiltros: hayFiltrosLocales,
  encontrados: localesEncontrados,
  totalLocales: cantidadLocales,
  totalPaginas: paginasLocales,
  localesPagina,
  desde: desdeLocal,
  hasta: hastaLocal,
  limpiarFiltros: limpiarFiltrosLocales,
  anterior: paginaAnteriorLocales,
  siguiente: paginaSiguienteLocales,
} = useFiltroLocales(resumenLocales)

const mostrarCrearLocal = ref(false)
const localSeleccionadoId = ref<string | null>(null)
const mensajeExito = ref('')

function abrirCrearLocal(): void {
  mensajeExito.value = ''
  mostrarCrearLocal.value = true
}
async function alCrearLocal(): Promise<void> {
  mostrarCrearLocal.value = false
  mensajeExito.value = 'Local creado correctamente.'
  limpiarFiltrosLocales()
  await monitor.cargar()
}
function abrirLocal(id: string): void {
  mensajeExito.value = ''
  localSeleccionadoId.value = id
}
async function alActualizarLocal(): Promise<void> {
  await monitor.cargar()
}

onMounted(() => {
  monitor.limpiar()
  void monitor.cargar()
})
onUnmounted(() => monitor.limpiar())
</script>

<template>
  <MonitorHeader :cargando="cargando" @actualizar="monitor.cargar()" @crear-local="abrirCrearLocal" />

  <p v-if="mensajeExito" role="status"
    class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
    {{ mensajeExito }}
  </p>

  <div v-if="error" role="alert"
    class="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <ExclamationTriangleIcon class="size-5 shrink-0" aria-hidden="true" />
    {{ error }}
  </div>

  <p v-if="cargando && !ultimaActualizacion" role="status" class="py-12 text-center text-slate-500">
    Cargando el monitor…
  </p>

  <template v-if="ultimaActualizacion">
    <section aria-label="Indicadores generales" class="mb-8 grid gap-4 md:grid-cols-3">
      <KpiCard label="Máquinas operativas" :value="maquinasOperativas" :total="totalMaquinasActivas"
        :icon="CheckCircleIcon" principal />
      <KpiCard label="Inspecciones realizadas hoy" :value="inspeccionesHoy" :icon="ClipboardDocumentCheckIcon" />
      <KpiCard label="Locales activos" :value="localesActivos" :total="totalLocales" :icon="BuildingStorefrontIcon" />
    </section>

    <section aria-labelledby="locales-heading">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="locales-heading" class="text-lg font-bold text-slate-900">Locales</h2>
        <p class="text-xs text-slate-500">
          Actualizado: {{ fechaChile }} · {{ horaActualizacion }} · Chile
        </p>
      </div>

      <LocalesFilters v-model:busqueda="busquedaLocales" v-model:estado="estadoLocales" :total="cantidadLocales"
        :encontrados="localesEncontrados" :desde="desdeLocal" :hasta="hastaLocal" :pagina="paginaLocales"
        :total-paginas="paginasLocales" :hay-filtros="hayFiltrosLocales" @limpiar="limpiarFiltrosLocales"
        @anterior="paginaAnteriorLocales" @siguiente="paginaSiguienteLocales" />

      <div id="lista-locales">
        <div v-if="localesPagina.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LocalCard v-for="local in localesPagina" :key="local.id" :local="local" @abrir="abrirLocal" />
        </div>
        <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <p>
            {{ cantidadLocales === 0
              ? 'Todavía no hay locales disponibles para mostrar.'
              : 'No hay locales que coincidan con la búsqueda y el estado seleccionado.' }}
          </p>
          <button v-if="hayFiltrosLocales" type="button" class="mt-3 text-sm font-semibold text-blue-600 underline"
            @click="limpiarFiltrosLocales">
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>

    <MonitorNotes />
  </template>

  <CrearLocalModal v-if="mostrarCrearLocal" @cerrar="mostrarCrearLocal = false" @creado="alCrearLocal" />

  <LocalDetailModal v-if="localSeleccionadoId" :key="localSeleccionadoId" :local-id="localSeleccionadoId"
    @cerrar="localSeleccionadoId = null" @actualizado="alActualizarLocal" />
</template>
