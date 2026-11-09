<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowPathIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/vue/24/outline'
import CambiarLocalModal from '../components/maquina/CambiarLocalModal.vue'
import { obtenerOpcionesCrearMaquina } from '../services/crear-maquina.service'
import CategoriasMaquinaModal from '../components/maquina/CategoriasMaquinaModal.vue'
import CargaSeccion from '../components/layout/CargaSeccion.vue'
import MaquinaFichaDatos from '../components/maquina/MaquinaFichaDatos.vue'
import type { MaquinaDetalle } from '../types/maquina'
import MaquinaAccionesBaja from '../components/maquina/MaquinaAccionesBaja.vue'
import { useCargaInicial } from '../composables/useCargaInicial'
import { useMaquinasStore } from '../stores/maquina'
import MaquinaFilter from '../components/maquina/MaquinaFilter.vue'
import MaquinaFila from '../components/maquina/MaquinaFila.vue'
import MaquinaDetallePanel from '../components/maquina/MaquinaDetallePanel.vue'
import CrearMaquinaModal from '../components/maquina/CrearMaquinaModal.vue'
import type { MaquinaCreada } from '../types/crear-maquina'

const catalogo = useMaquinasStore()
const mostrarCrearMaquina = ref(false)
const mostrarCategorias = ref(false)
const mensajeExito = ref('')

function abrirCrearMaquina(): void {
  mensajeExito.value = ''
  mostrarCrearMaquina.value = true
}

async function alCrearMaquina(maquina: MaquinaCreada): Promise<void> {
  mostrarCrearMaquina.value = false
  mensajeExito.value = `Máquina «${maquina.nombre}» agregada correctamente.`
  catalogo.limpiarFiltros()
  await catalogo.cargar()
  catalogo.seleccionar(maquina.id)
}

const { busqueda, localId, categoriaId, estado, locales, categorias, total,
  maquinasFiltradas, maquinaSeleccionada, cargando, cargado, error } = storeToRefs(catalogo)

const mostrandoCargaInicial = useCargaInicial(async () => {
  catalogo.limpiar()
  await catalogo.cargar()
})

const dialogoBaja = ref<HTMLDialogElement | null>(null)
const maquinaBaja = ref<MaquinaDetalle | null>(null)
const procesandoBaja = ref(false)

const mostrandoCambioLocal = ref(false)
const cargandoDestinos = ref(false)
const destinosCambioLocal = ref<Awaited<ReturnType<typeof obtenerOpcionesCrearMaquina>>['locales']>([])
const mensajeFicha = ref('')
const errorFicha = ref('')
let solicitudDestinos: AbortController | undefined

async function abrirCambioLocal(): Promise<void> {
  if (!maquinaBaja.value || procesandoBaja.value || cargandoDestinos.value || mostrandoCambioLocal.value) return
  solicitudDestinos?.abort()
  const actual = new AbortController()
  solicitudDestinos = actual
  cargandoDestinos.value = true
  errorFicha.value = ''
  mensajeFicha.value = ''

  try {
    const opciones = await obtenerOpcionesCrearMaquina(actual.signal)
    if (actual.signal.aborted) return
    destinosCambioLocal.value = opciones.locales.filter(local => local.id !== maquinaBaja.value?.local_id)
    mostrandoCambioLocal.value = true
  } catch {
    if (!actual.signal.aborted) errorFicha.value = 'No se pudieron cargar los locales disponibles. Intenta nuevamente.'
  } finally {
    if (!actual.signal.aborted) cargandoDestinos.value = false
  }
}

function cerrarFicha(): void {
  solicitudDestinos?.abort()
  cargandoDestinos.value = false
  mostrandoCambioLocal.value = false
  maquinaBaja.value = null
}

async function alReasignarDesdeFicha(id: string, destinoId: string): Promise<void> {
  mostrandoCambioLocal.value = false
  const actual = maquinaBaja.value
  if (!actual || actual.id !== id) return

  const destino = destinosCambioLocal.value.find(local => local.id === destinoId)
  maquinaBaja.value = { ...actual, local_id: destinoId, localNombre: destino?.nombre ?? 'Local actualizado' }
  mensajeFicha.value = 'Local actualizado. El código y el historial de la máquina se conservan.'
  await catalogo.cargar()
  if (maquinaBaja.value?.id !== id) return
  if (localId.value === actual.local_id) localId.value = destinoId
  if (maquinasFiltradas.value.some(maquina => maquina.id === id)) catalogo.seleccionar(id)
}

function abrirBaja(): void {
  if (!maquinaSeleccionada.value || cargando.value || dialogoBaja.value?.open) return
  maquinaBaja.value = { ...maquinaSeleccionada.value }
  mensajeFicha.value = ''
  errorFicha.value = ''
  mensajeExito.value = ''
  dialogoBaja.value?.showModal()
}

function cerrarBaja(): void {
  if (!procesandoBaja.value && !mostrandoCambioLocal.value) dialogoBaja.value?.close()
}

async function alCompletarBaja(accion: 'desactivar' | 'reactivar' | 'retirar', id: string): Promise<void> {
  dialogoBaja.value?.close()
  mensajeExito.value = {
    desactivar: 'Máquina desactivada. Puedes encontrarla en Todos o Inactivas.',
    reactivar: 'Máquina reactivada.',
    retirar: 'Máquina retirada del inventario. Su historial se conservó.',
  }[accion]
  await catalogo.cargar()
  if (accion !== 'retirar' && maquinasFiltradas.value.some(maquina => maquina.id === id)) {
    catalogo.seleccionar(id)
  }
}
onUnmounted(() => { solicitudDestinos?.abort(); catalogo.limpiar() })
</script>

<template>
  <header class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div>
      <p class="text-xs font-bold uppercase tracking-widest text-blue-600">Catálogo</p>
      <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Máquinas y códigos QR</h1>
      <p class="mt-2 text-sm text-slate-500">Consulta tus equipos y descarga su identificador.</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button" :disabled="cargando || mostrandoCargaInicial" @click="catalogo.cargar()"
        class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
        <ArrowPathIcon class="size-5" :class="{ 'animate-spin': cargando }" aria-hidden="true" />{{ cargando ?
          'Actualizando…' : 'Actualizar' }}
      </button>
      <button type="button" :disabled="cargando || mostrandoCargaInicial"
        class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        @click="mostrarCategorias = true">Gestionar categorías</button>
      <button type="button" :disabled="cargando || mostrandoCargaInicial" @click="abrirCrearMaquina"
        class="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
        <PlusIcon class="size-5" aria-hidden="true" />Agregar máquina
      </button>
    </div>
  </header>
  <p v-if="mensajeExito" role="status"
    class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{{ mensajeExito }}</p>
  <div v-if="error && !mostrandoCargaInicial" role="alert"
    class="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <ExclamationTriangleIcon class="size-5 shrink-0" aria-hidden="true" />{{ error }}
  </div>
  <MaquinaFilter v-model:busqueda="busqueda" v-model:local-id="localId" v-model:categoria-id="categoriaId"
    v-model:estado="estado" :locales="locales" :categorias="categorias"
    :deshabilitado="mostrandoCargaInicial || (cargando && !cargado)" @limpiar="catalogo.limpiarFiltros()" />
  <CargaSeccion v-if="mostrandoCargaInicial" variante="tabla" mensaje="Cargando máquinas…" />
  <template v-else-if="cargado">
    <p class="mb-4 text-sm text-slate-500" role="status">{{ maquinasFiltradas.length }} de {{ total }} máquinas</p>
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Listado de máquinas"
        class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div v-if="maquinasFiltradas.length" class="overflow-x-auto">
          <table class="w-full min-w-[650px] text-left">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-5 py-4">Equipo</th>
                <th scope="col" class="px-4 py-4">Categoría</th>
                <th scope="col" class="px-4 py-4">Local</th>
                <th scope="col" class="px-4 py-4">Registro</th>
              </tr>
            </thead>
            <tbody>
              <MaquinaFila v-for="maquina in maquinasFiltradas" :key="maquina.id" :maquina="maquina"
                :seleccionada="maquinaSeleccionada?.id === maquina.id" @seleccionar="catalogo.seleccionar" />
            </tbody>
          </table>
        </div>
        <p v-else class="p-10 text-center text-sm text-slate-500">{{ total === 0 ? `No hay máquinas disponibles para tu
          usuario.` : 'No hay máquinas que coincidan con los filtros.' }}</p>
      </section>
      <div v-if="maquinaSeleccionada" class="space-y-3 xl:sticky xl:top-8">
        <button type="button" :disabled="cargando"
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          @click="abrirBaja">Ver ficha y gestionar estado</button>
        <MaquinaDetallePanel :maquina="maquinaSeleccionada" />
      </div>
    </div>
    <p class="mt-6 text-xs leading-relaxed text-slate-500">Activo e inactivo corresponden al registro del catálogo. El
      estado operativo se obtiene de las mantenciones.</p>
  </template>
  <dialog ref="dialogoBaja" aria-labelledby="titulo-baja-maquina"
    class="m-auto w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-950/60"
    @cancel.prevent="cerrarBaja" @close="cerrarFicha">
    <div class="flex max-h-[90dvh] min-h-0 flex-col">
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4">
        <h2 id="titulo-baja-maquina" class="font-bold">Ficha de la máquina</h2>
        <button type="button" autofocus :disabled="procesandoBaja" class="text-sm font-semibold disabled:opacity-50"
          @click="cerrarBaja">Cerrar</button>
      </header>
      <div class="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <MaquinaFichaDatos v-if="maquinaBaja" :maquina="maquinaBaja" />
        <p v-if="mensajeFicha" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{{
          mensajeFicha
        }}</p>
        <p v-if="errorFicha" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ errorFicha }}</p>
        <button v-if="maquinaBaja" type="button" :disabled="procesandoBaja || cargandoDestinos || cargando"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          @click="abrirCambioLocal">{{ cargandoDestinos ? 'Cargando locales…' : 'Cambiar local' }}</button>
        <fieldset :disabled="cargandoDestinos || cargando" class="min-w-0 border-0 p-0">
          <MaquinaAccionesBaja v-if="maquinaBaja" :key="maquinaBaja.id" :id="maquinaBaja.id"
            :nombre="maquinaBaja.nombre" :activo="maquinaBaja.activo" @completado="alCompletarBaja"
            @ocupado="procesandoBaja = $event" />
        </fieldset>
      </div>
    </div>
  </dialog>
  <CambiarLocalModal v-if="mostrandoCambioLocal && maquinaBaja" :key="maquinaBaja.id" :maquina="maquinaBaja"
    :locales="destinosCambioLocal" @cancelar="mostrandoCambioLocal = false" @reasignada="alReasignarDesdeFicha" />
  <CategoriasMaquinaModal v-if="mostrarCategorias" @cerrar="mostrarCategorias = false"
    @actualizado="catalogo.cargar()" />
  <CrearMaquinaModal v-if="mostrarCrearMaquina" @cerrar="mostrarCrearMaquina = false" @creada="alCrearMaquina" />
</template>
