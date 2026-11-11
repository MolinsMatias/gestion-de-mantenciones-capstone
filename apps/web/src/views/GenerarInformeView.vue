<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowDownTrayIcon, ArrowLeftIcon, DocumentTextIcon, EyeIcon } from '@heroicons/vue/24/outline'
import InformeDatosForm from '../components/informe/InformeDatosForm.vue'
import { useGenerarInforme } from '../composables/useGenerarInforme'
import { obtenerLocalesInforme, type LocalInforme } from '../services/informe.service'

const route = useRoute()
const locales = ref<LocalInforme[]>([])
const cargandoLocales = ref(false)
const errorLocales = ref('')
const avisoLocal = ref('')
let peticionLocales: AbortController | null = null
const { localId, mes, datos, consultando, generando, ocupado, error, mensaje, opciones, pdfUrl, puedeGenerar, equipos, consultar, generar } = useGenerarInforme()
const localSeleccionado = computed(() => locales.value.find(local => local.id === localId.value))
const muestra = computed(() => datos.value?.registros.slice(0, 10) ?? [])
const fechaChile = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' })
const fecha = (valor: string) => fechaChile.format(new Date(valor))
async function cargarLocales() {
  peticionLocales?.abort()
  const actual = new AbortController(); peticionLocales = actual
  cargandoLocales.value = true; errorLocales.value = ''
  try {
    const resultado = await obtenerLocalesInforme(actual.signal)
    if (actual.signal.aborted) return
    locales.value = resultado
    const id = typeof route.query.local === 'string' ? route.query.local : ''
    if (id && resultado.some(local => local.id === id)) localId.value = id
    else if (id) avisoLocal.value = 'El local indicado no está disponible para tu cuenta. Selecciona otro local.'
  } catch (causa: unknown) {
    if (!actual.signal.aborted) errorLocales.value = causa instanceof Error ? causa.message : 'No se pudieron cargar los locales.'
  } finally { if (!actual.signal.aborted) cargandoLocales.value = false }
}
function actualizarOpciones(valor: typeof opciones) { Object.assign(opciones, valor) }
onMounted(() => { void cargarLocales() })
onBeforeUnmount(() => peticionLocales?.abort())
</script>
<template>
  <section aria-labelledby="titulo-generar-informe" class="space-y-6 text-slate-900">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-blue-600">Reportes del recinto</p>
        <h1 id="titulo-generar-informe" class="mt-2 text-3xl font-extrabold">Generar informe</h1>
        <p class="mt-2 text-sm text-slate-500">Selecciona un local y el mes para preparar su informe de mantención.</p>
      </div>
      <RouterLink to="/mantenciones" class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        <ArrowLeftIcon class="size-4" aria-hidden="true" />Volver a mantenciones
      </RouterLink>
    </header>
    <div v-if="errorLocales" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
      {{ errorLocales }} <button type="button" class="ml-2 font-semibold underline" @click="cargarLocales">Reintentar</button>
    </div>
    <p v-if="avisoLocal" role="status" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ avisoLocal }}</p>
    <form class="rounded-2xl border border-slate-200 bg-white p-5" @submit.prevent="consultar">
      <h2 class="mb-4 text-lg font-bold">1. Local y período</h2>
      <div class="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <label class="grid gap-2 text-sm font-semibold text-slate-700">Local <span class="sr-only">obligatorio</span>
          <select v-model="localId" required :disabled="cargandoLocales || ocupado || !!errorLocales"
            class="min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900 disabled:opacity-60">
            <option value="">{{ cargandoLocales ? 'Cargando locales…' : 'Selecciona un local' }}</option>
            <option v-for="local in locales" :key="local.id" :value="local.id">{{ local.nombre }}</option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-slate-700">Mes y año
          <input v-model="mes" type="month" required :disabled="ocupado" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 disabled:opacity-60" />
        </label>
        <button type="submit" :disabled="ocupado || cargandoLocales || !localId || !mes || !!errorLocales"
          class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {{ consultando ? 'Consultando…' : 'Consultar mantenciones' }}
        </button>
      </div>
      <p class="mt-3 text-xs text-slate-500">Incluye locales suspendidos o cerrados disponibles para tu cuenta. El mes se aplica a la finalización en horario de Chile. Cambiar local o mes limpia la consulta y los datos complementarios.</p>
    </form>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>
    <p v-if="mensaje" role="status" class="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{{ mensaje }}</p>
    <div v-if="consultando" role="status" class="animate-pulse rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Consultando el historial completo del local…</div>
    <template v-else-if="datos?.registros.length">
      <section class="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="resumen-informe">
        <h2 id="resumen-informe" class="text-lg font-bold">2. Revisar registros incluidos</h2>
        <p class="mt-2 text-sm text-slate-600"><strong>{{ localSeleccionado?.nombre }}</strong> · {{ mes }} · {{ datos.registros.length }} mantenciones · {{ equipos }} máquinas</p>
        <p class="mt-1 text-xs text-slate-500">Consulta realizada: {{ fecha(datos.generado_at) }}. Los documentos usan esta misma consulta; vuelve a consultar para incorporar cambios recientes.</p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600"><tr><th scope="col" class="p-3">Finalizada (Chile)</th><th scope="col" class="p-3">Máquina</th><th scope="col" class="p-3">Técnico</th><th scope="col" class="p-3">Tipo</th></tr></thead>
            <tbody><tr v-for="registro in muestra" :key="registro.id" class="border-t border-slate-100">
              <td class="p-3">{{ fecha(registro.finalizada_at) }}</td><td class="p-3">{{ registro.maquina || 'Sin registro' }} · {{ registro.codigo || 'Sin código' }}</td><td class="p-3">{{ registro.tecnico || 'Sin registro' }}</td><td class="p-3">{{ registro.tipo }}</td>
            </tr></tbody>
          </table>
        </div>
        <p class="mt-3 text-xs text-slate-500">Vista resumida: {{ muestra.length }} de {{ datos.registros.length }} registros. El informe incluye todos.</p>
      </section>
      <InformeDatosForm :model-value="opciones" :deshabilitado="ocupado" @update:model-value="actualizarOpciones" />
      <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Los contadores de pruebas, números de parte y cantidades no están en el esquema compartido. El informe indica su ausencia y conserva el detalle de repuestos registrado.</p>
    </template>
    <div class="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <p v-if="generando" role="status" class="mr-auto self-center text-sm text-slate-500">Preparando documento…</p>
      <button type="button" :disabled="!puedeGenerar" class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50" @click="generar('vista-previa')"><EyeIcon class="size-5" aria-hidden="true" />Vista previa PDF</button>
      <button type="button" :disabled="!puedeGenerar" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="generar('pdf')"><DocumentTextIcon class="size-5" aria-hidden="true" />Descargar PDF</button>
      <button type="button" :disabled="!puedeGenerar" class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50" @click="generar('xlsx')"><ArrowDownTrayIcon class="size-5" aria-hidden="true" />Descargar Excel</button>
    </div>
    <section v-if="pdfUrl" class="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="vista-previa-informe">
      <h2 id="vista-previa-informe" class="mb-3 text-lg font-bold">Vista previa del informe</h2>
      <iframe :src="pdfUrl" title="Vista previa PDF del informe de mantención" class="h-[75dvh] w-full rounded-xl border border-slate-200" />
      <a :href="pdfUrl" target="_blank" rel="noopener" class="mt-3 inline-block text-sm font-semibold text-blue-700 underline">Abrir PDF en otra pestaña</a>
    </section>
  </section>
</template>
