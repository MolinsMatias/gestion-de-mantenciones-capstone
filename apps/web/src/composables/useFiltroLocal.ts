import { computed, ref, watch, type Ref } from 'vue'
import type { ResumenLocal } from '../types/monitor'

export type EstadoFiltroLocal = 'todos' | 'activos' | 'inactivos' | 'sin-definir'
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()

export function useFiltroLocales(locales: Readonly<Ref<readonly ResumenLocal[]>>) {
  const busqueda = ref('')
  const estado = ref<EstadoFiltroLocal>('todos')
  const pagina = ref(1)
  const porPagina = 12
  const hayFiltros = computed(() => busqueda.value.trim() !== '' || estado.value !== 'todos')
  const localesFiltrados = computed(() => {
    const palabras = normalizar(busqueda.value).split(/\s+/).filter(Boolean)
    return locales.value.filter(local => {
      const texto = normalizar(`${local.nombre} ${local.direccion ?? ''}`)
      const coincideEstado = estado.value === 'todos' ||
        (estado.value === 'activos' && local.activo === true) ||
        (estado.value === 'inactivos' && local.activo === false) ||
        (estado.value === 'sin-definir' && local.activo === null)
      return coincideEstado && palabras.every(palabra => texto.includes(palabra))
    })
  })
  const encontrados = computed(() => localesFiltrados.value.length)
  const totalLocales = computed(() => locales.value.length)
  const totalPaginas = computed(() => Math.max(1, Math.ceil(encontrados.value / porPagina)))
  const localesPagina = computed(() => localesFiltrados.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina))
  const desde = computed(() => encontrados.value ? (pagina.value - 1) * porPagina + 1 : 0)
  const hasta = computed(() => Math.min(pagina.value * porPagina, encontrados.value))
  watch([busqueda, estado], () => { pagina.value = 1 }, { flush: 'sync' })
  watch(totalPaginas, maximo => { pagina.value = Math.min(pagina.value, maximo) }, { flush: 'sync' })
  function limpiarFiltros(): void { busqueda.value = ''; estado.value = 'todos'; pagina.value = 1 }
  function anterior(): void { pagina.value = Math.max(1, pagina.value - 1) }
  function siguiente(): void { pagina.value = Math.min(totalPaginas.value, pagina.value + 1) }
  return { busqueda, estado, pagina, hayFiltros, encontrados, totalLocales, totalPaginas,
    localesPagina, desde, hasta, limpiarFiltros, anterior, siguiente }
}
