import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { obtenerPaises, obtenerRegiones, obtenerComunas } from '../services/ubicacion.service'
import type { PaisOpcion, RegionOpcion, ComunaOpcion } from '../types/ubicaciones'

// Cada lista administra su propia petición y descarta respuestas anteriores.
function crearCarga<T>() {
  const datos = shallowRef<T[]>([])
  const cargando = ref(false)
  const error = ref('')
  let version = 0
  let controller: AbortController | null = null
  function reiniciar(): void {
    version++
    controller?.abort()
    controller = null
    datos.value = []
    cargando.value = false
    error.value = ''
  }
  async function cargar(consulta: (signal: AbortSignal) => Promise<T[]>): Promise<void> {
    reiniciar()
    const actual = ++version
    const peticion = new AbortController()
    controller = peticion
    cargando.value = true
    try {
      const resultado = await consulta(peticion.signal)
      if (actual === version) datos.value = resultado
    } catch (causa: unknown) {
      if (actual === version) error.value = causa instanceof Error ? causa.message : 'No se pudo cargar el catálogo.'
    } finally {
      if (actual === version) { cargando.value = false; controller = null }
    }
  }
  return { datos, cargando, error, cargar, reiniciar }
}

export function useUbicacion() {
  const paisId = ref('')
  const regionId = ref('')
  const comunaId = ref('')
  const paises = crearCarga<PaisOpcion>()
  const regiones = crearCarga<RegionOpcion>()
  const comunas = crearCarga<ComunaOpcion>()

  async function cargarPaises(): Promise<void> {
    paisId.value = ''
    regionId.value = ''
    comunaId.value = ''
    regiones.reiniciar()
    comunas.reiniciar()
    await paises.cargar(obtenerPaises)
  }
  async function cargarRegiones(): Promise<void> {
    const id = paisId.value
    regionId.value = ''
    comunaId.value = ''
    regiones.reiniciar()
    comunas.reiniciar()
    if (id) await regiones.cargar(signal => obtenerRegiones(id, signal))
  }
  async function cargarComunas(): Promise<void> {
    const id = regionId.value
    comunaId.value = ''
    comunas.reiniciar()
    if (id) await comunas.cargar(signal => obtenerComunas(id, signal))
  }
  watch(paisId, () => { void cargarRegiones() }, { flush: 'sync' })
  watch(regionId, () => { void cargarComunas() }, { flush: 'sync' })

  const cargando = computed(() => paises.cargando.value || regiones.cargando.value || comunas.cargando.value)
  const valida = computed(() =>
    paises.datos.value.some(pais => pais.id === paisId.value) &&
    regiones.datos.value.some(region => region.id === regionId.value && region.pais_id === paisId.value) &&
    comunas.datos.value.some(comuna => comuna.id === comunaId.value && comuna.region_id === regionId.value),
  )
  onScopeDispose(() => { paises.reiniciar(); regiones.reiniciar(); comunas.reiniciar() })
  return {
    paisId, regionId, comunaId, cargando, valida,
    paises: paises.datos, regiones: regiones.datos, comunas: comunas.datos,
    cargandoPaises: paises.cargando, cargandoRegiones: regiones.cargando, cargandoComunas: comunas.cargando,
    errorPaises: paises.error, errorRegiones: regiones.error, errorComunas: comunas.error,
    cargarPaises, cargarRegiones, cargarComunas,
  }
}
