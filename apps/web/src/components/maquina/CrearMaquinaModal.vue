<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { CubeIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { crearMaquina, obtenerOpcionesCrearMaquina } from '../../services/crear-maquina.service'
import type { MaquinaCreada, OpcionesCrearMaquina } from '../../types/crear-maquina'

const emit = defineEmits<{ cerrar: []; creada: [maquina: MaquinaCreada] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const opciones = ref<OpcionesCrearMaquina>({ locales: [], categorias: [], marcas: [] })
const cargando = ref(false)
const guardando = ref(false)
const errorCarga = ref('')
const errorGuardar = ref('')
const formulario = reactive({
  nombre: '', codigo_interno: '', local_id: '', categoria_id: '', marca_id: '', modelo: '', activo: true,
})
let controller: AbortController | null = null
let desmontado = false
let focoAnterior: HTMLElement | null = null

async function cargarOpciones(): Promise<void> {
  if (cargando.value) return
  const actual = new AbortController()
  controller = actual
  cargando.value = true
  errorCarga.value = ''
  try {
    const resultado = await obtenerOpcionesCrearMaquina(actual.signal)
    if (!desmontado) opciones.value = resultado
  } catch (error: unknown) {
    actual.abort()
    if (!desmontado) errorCarga.value = error instanceof Error ? error.message : 'No se pudieron cargar las opciones.'
  } finally {
    if (!desmontado) { cargando.value = false; controller = null }
  }
}
function cerrar(): void { if (!guardando.value) emit('cerrar') }
async function guardar(): Promise<void> {
  if (guardando.value || cargando.value) return
  errorGuardar.value = ''
  if (!opciones.value.locales.some(local => local.id === formulario.local_id) ||
    !opciones.value.categorias.some(categoria => categoria.id === formulario.categoria_id) ||
    (formulario.marca_id && !opciones.value.marcas.some(marca => marca.id === formulario.marca_id))) {
    errorGuardar.value = 'Selecciona un local, una categoría y una marca disponible, si corresponde.'
    return
  }
  guardando.value = true
  try {
    const maquina = await crearMaquina({ ...formulario, marca_id: formulario.marca_id || null, modelo: formulario.modelo || null })
    if (!desmontado) emit('creada', maquina)
  } catch (error: unknown) {
    if (!desmontado) errorGuardar.value = error instanceof Error ? error.message : 'No se pudo guardar la máquina.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}
onMounted(() => {
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogo.value?.showModal()
  void cargarOpciones()
})
onBeforeUnmount(() => {
  desmontado = true
  controller?.abort()
  dialogo.value?.close()
  if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="crear-maquina-titulo" aria-describedby="crear-maquina-descripcion"
      class="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      @cancel.prevent="cerrar">
      <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <CubeIcon class="mb-3 size-8 text-blue-600" aria-hidden="true" />
          <h2 id="crear-maquina-titulo" class="text-2xl font-bold">Agregar máquina</h2>
          <p id="crear-maquina-descripcion" class="mt-2 text-sm text-slate-500">Asigna el equipo a un local y a su
            categoría.</p>
        </div>
        <button type="button" aria-label="Cerrar modal" :disabled="guardando" @click="cerrar"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
          <XMarkIcon class="size-5" aria-hidden="true" />
        </button>
      </div>
      <form class="space-y-5 p-6" :aria-busy="guardando" @submit.prevent="guardar">
        <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando locales, categorías y marcas…</p>
        <div v-if="errorCarga" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <p>{{ errorCarga }}</p>
          <button type="button" @click="cargarOpciones" class="mt-2 font-semibold underline">Reintentar</button>
        </div>
        <p v-else-if="!cargando && (!opciones.locales.length || !opciones.categorias.length)"
          class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Necesitas al menos un local activo y una categoría
          activa para registrar una máquina.</p>
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="maquina-nombre" class="block text-sm font-semibold">Nombre de la máquina</label>
            <input id="maquina-nombre" v-model="formulario.nombre" type="text" required autofocus :disabled="guardando"
              placeholder="Ej.: Pinsetter pista 4"
              class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
          </div>
          <div>
            <label for="maquina-codigo" class="block text-sm font-semibold">Código interno</label>
            <input id="maquina-codigo" v-model="formulario.codigo_interno" type="text" required :disabled="guardando"
              placeholder="Ej.: BS-PIN-004"
              class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
            <p class="mt-2 text-xs text-slate-500">Debe ser único en el sistema.</p>
          </div>
          <div>
            <label for="maquina-local" class="block text-sm font-semibold">Local</label>
            <select id="maquina-local" v-model="formulario.local_id" required :disabled="guardando || cargando"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
              <option disabled value="">Selecciona un local</option>
              <option v-for="local in opciones.locales" :key="local.id" :value="local.id">{{ local.nombre }}</option>
            </select>
          </div>
          <div>
            <label for="maquina-categoria" class="block text-sm font-semibold">Categoría</label>
            <select id="maquina-categoria" v-model="formulario.categoria_id" required :disabled="guardando || cargando"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
              <option disabled value="">Selecciona una categoría</option>
              <option v-for="categoria in opciones.categorias" :key="categoria.id" :value="categoria.id">{{
                categoria.nombre }}</option>
            </select>
          </div>
          <div>
            <label for="maquina-marca" class="block text-sm font-semibold">Marca <span
                class="font-normal text-slate-500">(opcional)</span></label>
            <select id="maquina-marca" v-model="formulario.marca_id" :disabled="guardando || cargando"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
              <option value="">Sin marca</option>
              <option v-for="marca in opciones.marcas" :key="marca.id" :value="marca.id">{{ marca.nombre }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label for="maquina-modelo" class="block text-sm font-semibold">Modelo <span
                class="font-normal text-slate-500">(opcional)</span></label>
            <input id="maquina-modelo" v-model="formulario.modelo" type="text" :disabled="guardando"
              placeholder="Ej.: GS-X"
              class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
          </div>
        </div>
        <label class="flex items-center gap-3 text-sm font-medium"><input v-model="formulario.activo" type="checkbox"
            :disabled="guardando" class="size-4 accent-blue-600" />Máquina activa en el catálogo</label>
        <p class="text-xs leading-relaxed text-slate-500">El estado operativo se registra mediante las mantenciones.
          Marcar activa no la declara operativa.</p>
        <p v-if="errorGuardar" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ errorGuardar }}</p>
        <p v-if="guardando" role="status" class="text-sm text-slate-500">Guardando la máquina. Espera antes de cerrar.
        </p>
        <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" :disabled="guardando" @click="cerrar"
            class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button type="submit"
            :disabled="guardando || cargando || !!errorCarga || !opciones.locales.length || !opciones.categorias.length"
            class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{{
              guardando ? 'Guardando…' : 'Agregar máquina' }}</button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
