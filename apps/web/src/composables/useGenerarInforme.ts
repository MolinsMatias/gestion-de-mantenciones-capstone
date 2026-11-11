import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { obtenerHistorialExportacion } from '../services/exportacion.service'
import type { FiltrosHistorial, HistorialExportacion, OpcionesInforme } from '../types/exportacion'

function mesEnChile(): string {
  const partes = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Santiago' }).formatToParts(new Date())
  return `${partes.find(p => p.type === 'year')!.value}-${partes.find(p => p.type === 'month')!.value}`
}
export function useGenerarInforme() {
  const localId = ref('')
  const mes = ref(mesEnChile())
  const datos = ref<HistorialExportacion | null>(null)
  const consultando = ref(false)
  const generando = ref(false)
  const error = ref('')
  const mensaje = ref('')
  const pdfUrl = ref('')
  const opciones = reactive<OpcionesInforme>({ orden: '', encargado: '', recomendaciones: '', conclusiones: '', responsable: '' })
  const ocupado = computed(() => consultando.value || generando.value)
  const puedeGenerar = computed(() => !!datos.value?.registros.length && !ocupado.value)
  const equipos = computed(() => new Set(datos.value?.registros.map(r => r.maquina_id).filter(Boolean)).size)
  let peticion: AbortController | null = null
  let revision = 0
  let desmontado = false
  function filtros(): FiltrosHistorial {
    // El informe es independiente de los filtros de técnico, tipo, estado y máquina del listado.
    return { localId: localId.value, mes: mes.value, maquinaId: '', tecnicoId: '', tipo: '', estado: '' }
  }
  function limpiarPdf() { if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value); pdfUrl.value = '' }
  watch([localId, mes], () => {
    revision++; peticion?.abort(); consultando.value = false
    datos.value = null; error.value = ''; mensaje.value = ''; limpiarPdf()
    Object.assign(opciones, { orden: '', encargado: '', recomendaciones: '', conclusiones: '', responsable: '' })
  }, { flush: 'sync' })
  watch(opciones, () => { revision++; limpiarPdf(); mensaje.value = '' }, { flush: 'sync' })
  async function consultar(): Promise<void> {
    if (generando.value) return
    peticion?.abort()
    datos.value = null; error.value = ''; mensaje.value = ''; limpiarPdf()
    if (!localId.value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes.value)) {
      error.value = 'Selecciona un local y un mes válido.'; return
    }
    const actual = new AbortController(); peticion = actual
    const seleccion = filtros(); consultando.value = true
    try {
      const resultado = await obtenerHistorialExportacion(seleccion, actual.signal)
      if (desmontado || actual.signal.aborted) return
      datos.value = resultado
      if (!resultado.registros.length) mensaje.value = 'No hay mantenciones enviadas y finalizadas de este local en el mes seleccionado.'
    } catch (causa: unknown) {
      if (!desmontado && !actual.signal.aborted) error.value = causa instanceof Error ? causa.message : 'No se pudo consultar la información.'
    } finally { if (!desmontado && !actual.signal.aborted) consultando.value = false }
  }
  async function generar(accion: 'vista-previa' | 'pdf' | 'xlsx'): Promise<void> {
    if (!puedeGenerar.value || !datos.value) return
    const version = revision
    const seleccion = filtros(); const complementos = { ...opciones }; const registros = datos.value
    generando.value = true; error.value = ''; mensaje.value = ''
    try {
      const { crearPdf, crearExcel, descargarInforme } = await import('../utils/exportar-historial')
      if (desmontado || version !== revision) return
      const bytes = accion === 'xlsx' ? await crearExcel(registros, seleccion, 'informe', complementos) : crearPdf(registros, seleccion, 'informe', complementos)
      if (desmontado || version !== revision) return
      if (accion === 'vista-previa') {
        limpiarPdf(); pdfUrl.value = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      } else {
        descargarInforme(bytes, accion, 'informe')
        mensaje.value = `Descarga iniciada con ${registros.registros.length} mantenciones.`
      }
    } catch (causa: unknown) {
      if (!desmontado && version === revision) error.value = causa instanceof Error ? causa.message : 'No se pudo generar el documento.'
    } finally { if (!desmontado) generando.value = false }
  }
  onScopeDispose(() => { desmontado = true; peticion?.abort(); limpiarPdf() })
  return { localId, mes, datos, consultando, generando, ocupado, error, mensaje, opciones, pdfUrl, puedeGenerar, equipos, consultar, generar }
}
