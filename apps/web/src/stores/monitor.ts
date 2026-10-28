import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { obtenerDatosMonitor } from '../services/monitor.service'
import type {
  IndicadoresMonitor, LocalMonitor, MaquinaMonitor, ResumenLocal,
} from '../types/monitor'

export const useMonitorStore = defineStore('monitor', () => {
  const locales = ref<LocalMonitor[]>([])
  const maquinas = ref<MaquinaMonitor[]>([])
  const indicadores = ref<IndicadoresMonitor | null>(null)
  const cargando = ref(false)
  const error = ref('')
  const ultimaActualizacion = ref<Date | null>(null)
  let version = 0
  let controller: AbortController | null = null

  const maquinasOperativas = computed(() => indicadores.value?.maquinas_operativas ?? null)
  const inspeccionesHoy = computed(() => indicadores.value?.inspecciones_hoy ?? null)
  const fechaChile = computed(() => indicadores.value?.fecha_chile ?? null)
  const localesActivos = computed(() => locales.value.filter(l => l.activo === true).length)

  const resumenLocales = computed<ResumenLocal[]>(() => {
    const conteos = new Map<string, { total: number; activas: number }>()
    for (const maquina of maquinas.value) {
      const conteo = conteos.get(maquina.local_id) ?? { total: 0, activas: 0 }
      conteo.total++
      if (maquina.activo === true) conteo.activas++
      conteos.set(maquina.local_id, conteo)
    }
    return locales.value.map(local => ({
      ...local,
      ...(conteos.get(local.id) ?? { total: 0, activas: 0 }),
    }))
  })

  async function cargar(): Promise<void> {
    if (cargando.value) return
    const solicitud = ++version
    const actual = new AbortController()
    controller = actual
    cargando.value = true
    error.value = ''
    try {
      const datos = await obtenerDatosMonitor(actual.signal)
      if (solicitud !== version) return
      locales.value = datos.locales
      maquinas.value = datos.maquinas
      indicadores.value = datos.indicadores
      ultimaActualizacion.value = new Date()
    } catch (causa: unknown) {
      actual.abort()
      if (solicitud !== version) return

      if (import.meta.env.DEV) {
        console.error('[Monitor] Error al cargar:', causa)
      }

      error.value =
        'No se pudo actualizar el monitor. Revisa tu conexión y permisos e intenta nuevamente.'
    } finally {
      if (solicitud === version) {
        cargando.value = false
        controller = null
      }
    }
  }

  function limpiar(): void {
    version++
    controller?.abort()
    controller = null
    locales.value = []
    maquinas.value = []
    indicadores.value = null
    cargando.value = false
    error.value = ''
    ultimaActualizacion.value = null
  }

  return {
    cargando, error, ultimaActualizacion, maquinasOperativas,
    inspeccionesHoy, fechaChile, localesActivos, resumenLocales, cargar, limpiar
  }
})
