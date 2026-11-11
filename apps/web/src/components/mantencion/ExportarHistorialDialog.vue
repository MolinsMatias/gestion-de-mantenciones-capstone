<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import Dialog from 'primevue/dialog'
import { obtenerHistorialExportacion } from '../../services/exportacion.service'
import type { FiltrosHistorial } from '../../types/exportacion'
const props = defineProps<{ filtros: FiltrosHistorial }>()
const emit = defineEmits<{ cerrar: [] }>()
const formato = ref<'pdf' | 'xlsx'>('pdf')
const ocupado = ref(false)
const mensaje = ref('')
const error = ref('')
let controller: AbortController | null = null
onBeforeUnmount(() => controller?.abort())
function cerrar() { if (!ocupado.value) emit('cerrar') }
async function exportar() {
  if (ocupado.value) return
  ocupado.value = true; error.value = ''; mensaje.value = ''
  const actual = new AbortController(); controller = actual
  const filtros = { ...props.filtros, mes: '' }
  const extension = formato.value
  try {
    const datos = await obtenerHistorialExportacion(filtros, actual.signal)
    if (actual.signal.aborted) return
    if (!datos.registros.length) { mensaje.value = 'No hay mantenciones para estos filtros. No se descargó un archivo.'; return }
    const { crearExcel, crearPdf, descargarInforme } = await import('../../utils/exportar-historial')
    if (actual.signal.aborted) return
    const opciones = { orden: '', encargado: '', recomendaciones: '', conclusiones: '', responsable: '' }
    const bytes = extension === 'pdf' ? crearPdf(datos, filtros, 'historial', opciones) : await crearExcel(datos, filtros, 'historial', opciones)
    if (actual.signal.aborted) return
    descargarInforme(bytes, extension, 'historial')
    mensaje.value = `Descarga iniciada: ${datos.registros.length} mantenciones.`
  } catch (causa: unknown) {
    if (!actual.signal.aborted) error.value = causa instanceof Error ? causa.message : 'No se pudo exportar el historial.'
  } finally { if (!actual.signal.aborted) ocupado.value = false }
}
</script>
<template>
  <Dialog :visible="true" modal block-scroll header="Exportar historial" :closable="!ocupado"
    :close-on-escape="!ocupado" :dismissable-mask="false" :style="{ width: '30rem', maxWidth: 'calc(100vw - 2rem)' }"
    @update:visible="valor => { if (!valor) cerrar() }">
    <div class="space-y-4 text-slate-800" :aria-busy="ocupado">
      <p class="text-sm text-slate-600">Se descargarán todos los registros de los filtros aplicados en Mantenciones, no
        solo la página visible.</p>
      <label class="grid gap-2 text-sm font-semibold">Formato
        <select v-model="formato" :disabled="ocupado"
          class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900">
          <option value="pdf">PDF</option>
          <option value="xlsx">Excel (.xlsx)</option>
        </select>
      </label>
      <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <p v-if="mensaje" role="status" class="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{{ mensaje }}</p>
      <p v-if="ocupado" role="status" class="text-sm text-slate-600">Preparando la descarga…</p>
    </div>
    <template #footer>
      <button type="button" :disabled="ocupado"
        class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        @click="cerrar">Cerrar</button>
      <button type="button" :disabled="ocupado"
        class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        @click="exportar">{{ ocupado ? 'Exportando…' : 'Descargar' }}</button>
    </template>
  </Dialog>
</template>
