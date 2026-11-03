<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowPathIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { useMaquinasStore } from '../stores/maquina'
import MaquinasFilters from '../components/maquina/MaquinaFilter.vue'
import MachineRow from '../components/maquina/MachineRow.vue'
import MachineDetailPanel from '../components/maquina/MachineDetailPanel.vue'
import CrearMaquinaModal from '../components/maquina/CrearMaquinaModal.vue'
import CambiarLocalModal from '../components/maquina/CambiarLocalModal.vue'
import type { MaquinaCreada } from '../types/crear-maquina'
import MachineEditModal from '../components/maquina/MachineEditModal.vue'
import { actualizarMaquina, type CambiosMaquina, eliminarMaquina } from '../services/maquina.service'
import MachineDeleteModal from '../components/maquina/MachineDeleteModal.vue'


const catalogo = useMaquinasStore()
const mostrarCrearMaquina = ref(false)
const mensajeExito = ref('')
const { busqueda, localId, categoriaId, estado, locales, categorias, total,
  maquinasFiltradas, maquinaSeleccionada, cargando, cargado, error } = storeToRefs(catalogo)

const maquinaEnEdicion = ref<string | null>(null)
const guardandoEdicion = ref(false)
const errorEdicion = ref('')

const maquinaParaEliminar = ref<{ id: string; nombre: string; codigo: string } | null>(null)
const eliminando = ref(false)
const errorEliminacion = ref('')
const mensajeEliminacion = ref('')

const mostrandoCambioLocal = ref(false)


function abrirEdicion(id: string): void {
  if (guardandoEdicion.value) return
  errorEdicion.value = ''
  maquinaEnEdicion.value = id
}

function cancelarEdicion(): void {
  if (guardandoEdicion.value) return
  maquinaEnEdicion.value = null
  errorEdicion.value = ''
}

async function guardarEdicion(id: string, cambios: CambiosMaquina): Promise<void> {
  if (guardandoEdicion.value || maquinaEnEdicion.value !== id) return
  guardandoEdicion.value = true
  errorEdicion.value = ''

  try {
    await actualizarMaquina(id, cambios)
    maquinaEnEdicion.value = null
    await catalogo.cargar()
    if (!maquinasFiltradas.value.some(maquina => maquina.id === id)) {
      catalogo.limpiarFiltros()
    }
    catalogo.seleccionar(id)
  } catch (causa: unknown) {
    errorEdicion.value = causa instanceof Error ? causa.message : 'No se pudo guardar.'
  } finally {
    guardandoEdicion.value = false
  }
}

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

async function alReasignarMaquina(id: string, destinoId: string): Promise<void> {
  mostrandoCambioLocal.value = false
  await catalogo.cargar()
  if (localId.value) localId.value = destinoId
  catalogo.seleccionar(id)
}


function abrirEliminacion(): void {
  const maquina = maquinaSeleccionada.value
  if (!maquina || eliminando.value || cargando.value) return

  errorEliminacion.value = ''
  mensajeEliminacion.value = ''
  maquinaParaEliminar.value = {
    id: maquina.id,
    nombre: maquina.nombre,
    codigo: maquina.codigo_interno,
  }
}

async function confirmarEliminacion(): Promise<void> {
  const objetivo = maquinaParaEliminar.value
  if (!objetivo || eliminando.value) return

  eliminando.value = true
  errorEliminacion.value = ''

  try {
    await eliminarMaquina(objetivo.id)
  } catch (causa: unknown) {
    errorEliminacion.value = causa instanceof Error
      ? causa.message
      : 'No se pudo eliminar la máquina.'
    return
  } finally {
    eliminando.value = false
  }

  maquinaParaEliminar.value = null
  mensajeEliminacion.value = 'Máquina eliminada correctamente.'
  await catalogo.cargar()
}


onMounted(() => { catalogo.limpiar(); void catalogo.cargar() })
onUnmounted(() => catalogo.limpiar())

</script>

<template>
  <header class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div>
      <p class="text-xs font-bold uppercase tracking-widest text-blue-600">Catálogo</p>
      <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Máquinas y códigos QR</h1>
      <p class="mt-2 text-sm text-slate-500">Consulta tus equipos y descarga su identificador.</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button" :disabled="cargando" @click="catalogo.cargar()"
        class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
        <ArrowPathIcon class="size-5" :class="{ 'animate-spin': cargando }" aria-hidden="true" />{{ cargando ?
          'Actualizando…' : 'Actualizar' }}
      </button>
      <button type="button" :disabled="cargando" @click="abrirCrearMaquina"
        class="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
        <PlusIcon class="size-5" aria-hidden="true" />Agregar máquina
      </button>
    </div>
  </header>
  <p v-if="mensajeExito" role="status"
    class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{{ mensajeExito }}</p>
  <div v-if="error" role="alert"
    class="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <ExclamationTriangleIcon class="size-5 shrink-0" aria-hidden="true" />{{ error }}
  </div>
  <MaquinasFilters v-model:busqueda="busqueda" v-model:local-id="localId" v-model:categoria-id="categoriaId"
    v-model:estado="estado" :locales="locales" :categorias="categorias" :deshabilitado="cargando && !cargado"
    @limpiar="catalogo.limpiarFiltros()" />
  <p v-if="cargando && !cargado" role="status" class="py-12 text-center text-slate-500">Cargando máquinas…</p>
  <template v-if="cargado">
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
              <MachineRow v-for="maquina in maquinasFiltradas" :key="maquina.id" :maquina="maquina"
                :seleccionada="maquinaSeleccionada?.id === maquina.id" @seleccionar="catalogo.seleccionar" />
            </tbody>
          </table>
        </div>
        <p v-else class="p-10 text-center text-sm text-slate-500">
          {{ total === 0 ? 'No hay máquinas disponibles para tu usuario.' : `No hay máquinas que coincidan con los
          filtros.` }}
        </p>
      </section>
      <div v-if="maquinaSeleccionada" class="min-w-0 space-y-4 xl:sticky xl:top-8 xl:self-start">

        <div class="grid grid-cols-3 gap-2">
          <button type="button" :disabled="guardandoEdicion || cargando || eliminando"
            class="rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm font-semibold disabled:opacity-50"
            @click="abrirEdicion(maquinaSeleccionada.id)">
            Editar
          </button>

          <button type="button" :disabled="cargando || guardandoEdicion || eliminando"
            class="rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm font-semibold disabled:opacity-50"
            @click="mostrandoCambioLocal = true">
            Cambiar local
          </button>

          <button type="button" :disabled="eliminando || cargando || guardandoEdicion"
            class="rounded-lg border border-red-200 px-2 py-2 text-center text-sm font-semibold text-red-700 disabled:opacity-50"
            @click="abrirEliminacion">
            Eliminar
          </button>
        </div>
        <MachineDetailPanel :maquina="maquinaSeleccionada" />

        <MachineEditModal v-if="maquinaEnEdicion === maquinaSeleccionada.id" :key="maquinaSeleccionada.id"
          :maquina="maquinaSeleccionada" :guardando="guardandoEdicion" :error-guardar="errorEdicion"
          @cancelar="cancelarEdicion" @guardar="guardarEdicion(maquinaSeleccionada.id, $event)" />
      </div>
    </div>
    <p v-if="mensajeEliminacion" role="status" class="mt-4 text-sm text-emerald-700">
      {{ mensajeEliminacion }}
    </p>

    <MachineDeleteModal v-if="maquinaParaEliminar" :nombre="maquinaParaEliminar.nombre"
      :codigo="maquinaParaEliminar.codigo" :eliminando="eliminando" :error="errorEliminacion"
      @cancelar="maquinaParaEliminar = null" @confirmar="confirmarEliminacion" />

    <CambiarLocalModal v-if="mostrandoCambioLocal && maquinaSeleccionada" :key="maquinaSeleccionada.id"
      :maquina="maquinaSeleccionada" :locales="locales" @cancelar="mostrandoCambioLocal = false"
      @reasignada="alReasignarMaquina" />

    <p class="mt-6 text-xs leading-relaxed text-slate-500">Activo e inactivo corresponden al registro del catálogo. El
      estado operativo se obtiene de las mantenciones.</p>
  </template>
  <CrearMaquinaModal v-if="mostrarCrearMaquina" @cerrar="mostrarCrearMaquina = false" @creada="alCrearMaquina" />
</template>
