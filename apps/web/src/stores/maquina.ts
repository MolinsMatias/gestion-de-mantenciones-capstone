import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { obtenerCatalogoMaquinas } from '../services/maquina.service'
import type { CatalogoOpcion, MaquinaDetalle } from '../types/maquina'

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

export const useMaquinasStore = defineStore('maquinas', () => {
  const maquinas = ref<MaquinaDetalle[]>([])
  const locales = ref<CatalogoOpcion[]>([])
  const categorias = ref<CatalogoOpcion[]>([])
  const busqueda = ref('')
  const localId = ref('')
  const categoriaId = ref('')
  const estado = ref<'todos' | 'activas' | 'inactivas'>('todos')
  const seleccionId = ref<string | null>(null)
  const cargando = ref(false)
  const cargado = ref(false)
  const error = ref('')
  let version = 0
  let controller: AbortController | null = null

  const maquinasFiltradas = computed(() => {
    const texto = normalizar(busqueda.value.trim())
    return maquinas.value.filter(maquina => {
      if (localId.value && maquina.local_id !== localId.value) return false
      if (categoriaId.value && maquina.categoria_id !== categoriaId.value) return false
      if (estado.value === 'activas' && maquina.activo !== true) return false
      if (estado.value === 'inactivas' && maquina.activo !== false) return false
      return normalizar([
        maquina.nombre, maquina.codigo_interno, maquina.modelo ?? '',
        maquina.localNombre, maquina.categoriaNombre, maquina.marcaNombre,
      ].join(' ')).includes(texto)
    })
  })

  const maquinaSeleccionada = computed(() =>
    maquinasFiltradas.value.find(maquina => maquina.id === seleccionId.value) ??
    maquinasFiltradas.value[0] ?? null,
  )
  const total = computed(() => maquinas.value.length)

  function seleccionar(id: string): void { seleccionId.value = id }
  function limpiarFiltros(): void {
    busqueda.value = ''
    localId.value = ''
    categoriaId.value = ''
    estado.value = 'todos'
  }
  async function cargar(): Promise<void> {
    if (cargando.value) return
    const solicitud = ++version
    const actual = new AbortController()
    controller = actual
    cargando.value = true
    error.value = ''
    try {
      const resultado = await obtenerCatalogoMaquinas(actual.signal)
      if (solicitud !== version) return
      maquinas.value = resultado.maquinas
      locales.value = resultado.locales
      categorias.value = resultado.categorias
      cargado.value = true
    } catch (causa: unknown) {
      actual.abort()
      if (solicitud !== version) return
      if (import.meta.env.DEV && causa instanceof Error) {
        console.error('[Máquinas] No se pudo cargar el catálogo:', causa.message)
      }
      error.value = 'No se pudo actualizar el catálogo. Revisa tu conexión y permisos e intenta nuevamente.'
    } finally {
      if (solicitud === version) { cargando.value = false; controller = null }
    }
  }
  function limpiar(): void {
    version++
    controller?.abort()
    controller = null
    maquinas.value = []
    locales.value = []
    categorias.value = []
    seleccionId.value = null
    cargando.value = false
    cargado.value = false
    error.value = ''
    limpiarFiltros()
  }
  return {
    busqueda, localId, categoriaId, estado, locales, categorias, total,
    maquinasFiltradas, maquinaSeleccionada, cargando, cargado, error,
    seleccionar, limpiarFiltros, cargar, limpiar
  }
})
