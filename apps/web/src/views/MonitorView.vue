<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BuildingStorefrontIcon, CheckCircleIcon, ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import KpiCard from '../components/monitor/KpiCard.vue'
import LocalCard from '../components/monitor/LocalCard.vue'
import MonitorHeader from '../components/monitor/MonitorHeader.vue'
import MonitorNotes from '../components/monitor/MonitorNotes.vue'
import { useMonitorStore } from '../stores/monitor'

const monitor = useMonitorStore()
const {
  cargando, error, ultimaActualizacion, maquinasOperativas,
  inspeccionesHoy, fechaChile, localesActivos, resumenLocales,
} = storeToRefs(monitor)

const horaActualizacion = computed(() => ultimaActualizacion.value?.toLocaleTimeString('es-CL', {
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
}))

onMounted(() => {
  monitor.limpiar()
  void monitor.cargar()
})
onUnmounted(() => monitor.limpiar())
</script>

<template>
  <MonitorHeader :cargando="cargando" @actualizar="monitor.cargar()" />
  <div v-if="error" role="alert"
    class="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <ExclamationTriangleIcon class="size-5 shrink-0" aria-hidden="true" />{{ error }}
  </div>
  <p v-if="cargando && !ultimaActualizacion" role="status" class="py-12 text-center text-slate-500">
    Cargando el monitor…
  </p>
  <template v-if="ultimaActualizacion">
    <section aria-label="Indicadores generales" class="mb-8 grid gap-4 md:grid-cols-3">
      <KpiCard label="Máquinas operativas" :value="maquinasOperativas" :icon="CheckCircleIcon" principal />
      <KpiCard label="Inspecciones realizadas hoy" :value="inspeccionesHoy" :icon="ClipboardDocumentCheckIcon" />
      <KpiCard label="Locales activos" :value="localesActivos" :icon="BuildingStorefrontIcon" />
    </section>
    <section aria-labelledby="locales-heading">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="locales-heading" class="text-lg font-bold text-slate-900">Locales</h2>
        <p class="text-xs text-slate-500">
          Actualizado: {{ fechaChile }} · {{ horaActualizacion }} · Chile
        </p>
      </div>
      <div v-if="resumenLocales.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LocalCard v-for="local in resumenLocales" :key="local.id" :local="local" />
      </div>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        No hay locales disponibles para mostrar.
      </div>
    </section>
    <MonitorNotes />
  </template>
</template>
