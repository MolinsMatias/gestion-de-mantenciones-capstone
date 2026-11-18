<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { CubeIcon } from '@heroicons/vue/24/outline'
import { crearMaquina, obtenerOpcionesCrearMaquina } from '../../services/crear-maquina.service'
import type { MaquinaCreada, OpcionesCrearMaquina } from '../../types/crear-maquina'

const emit = defineEmits<{ cerrar: []; creada: [maquina: MaquinaCreada] }>()
const opciones = ref<OpcionesCrearMaquina>({ locales: [], categorias: [], marcas: [] })
const cargando = ref(false)
const guardando = ref(false)
const errorCarga = ref('')
const errorGuardar = ref('')
const formulario = reactive({
  nombre: '', local_id: '', categoria_id: '', marca_id: '', modelo: '', activo: true,
})
const opcionesMarcas = computed(() => [
  { id: '', nombre: 'Sin marca' },
  ...opciones.value.marcas,
])
let controller: AbortController | null = null
let desmontado = false

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
  void cargarOpciones()
})

onBeforeUnmount(() => {
  desmontado = true
  controller?.abort()
})
</script>

<template>
  <Dialog :visible="true" modal block-scroll :draggable="false" :closable="!guardando"
    :close-on-escape="!guardando" :dismissable-mask="!guardando"
    :style="{ width: 'min(38rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
    @update:visible="visible => { if (!visible) cerrar() }">
    <template #header>
      <div>
        <CubeIcon class="mb-2 size-8 text-blue-600" aria-hidden="true" />
        <h2 id="crear-maquina-titulo" class="text-xl font-bold text-slate-900">Crear máquina</h2>
        <p id="crear-maquina-descripcion" class="mt-1 text-sm text-slate-500">
          Registra un equipo en el catálogo asociándolo a su local.
        </p>
      </div>
    </template>

    <div class="py-2">
      <p v-if="errorCarga" role="alert" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {{ errorCarga }}
        <button type="button" @click="cargarOpciones" class="font-semibold underline">Reintentar</button>
      </p>
      <form id="form-crear-maquina" class="space-y-4" :aria-busy="guardando" @submit.prevent="guardar">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="maquina-nombre" class="block text-sm font-semibold">Nombre de la máquina</label>
            <input id="maquina-nombre" v-model="formulario.nombre" type="text" required autofocus :disabled="guardando"
              placeholder="Ej.: Pinsetter pista 4"
              class="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
          </div>

          <div class="sm:col-span-2">
            <label for="maquina-local" class="block text-sm font-semibold">Local</label>
            <Select id="maquina-local" input-id="maquina-local" v-model="formulario.local_id"
              :options="opciones.locales" option-label="nombre" option-value="id"
              placeholder="Selecciona un local" filter filter-placeholder="Buscar local…"
              empty-message="No hay locales disponibles" empty-filter-message="No se encontraron coincidencias"
              :disabled="guardando || cargando" class="mt-1 w-full" />
          </div>
          <div>
            <label for="maquina-categoria" class="block text-sm font-semibold">Categoría</label>
            <Select id="maquina-categoria" input-id="maquina-categoria" v-model="formulario.categoria_id"
              :options="opciones.categorias" option-label="nombre" option-value="id"
              placeholder="Selecciona una categoría" filter filter-placeholder="Buscar categoría…"
              empty-message="No hay categorías disponibles" empty-filter-message="No se encontraron coincidencias"
              :disabled="guardando || cargando" class="mt-1 w-full" />
          </div>
          <div>
            <label for="maquina-marca" class="block text-sm font-semibold">
              Marca <span class="font-normal text-slate-500">(opcional)</span>
            </label>
            <Select id="maquina-marca" input-id="maquina-marca" v-model="formulario.marca_id"
              :options="opcionesMarcas" option-label="nombre" option-value="id"
              placeholder="Sin marca" filter filter-placeholder="Buscar marca…"
              empty-message="No hay marcas disponibles" empty-filter-message="No se encontraron coincidencias"
              :disabled="guardando || cargando" class="mt-1 w-full" />
          </div>
          <div class="sm:col-span-2">
            <label for="maquina-modelo" class="block text-sm font-semibold">
              Modelo <span class="font-normal text-slate-500">(opcional)</span>
            </label>
            <input id="maquina-modelo" v-model="formulario.modelo" type="text" :disabled="guardando"
              placeholder="Ej.: GS-X"
              class="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
          </div>
        </div>
        <label class="flex items-center gap-3 text-sm font-medium">
          <input v-model="formulario.activo" type="checkbox" :disabled="guardando" class="size-4 accent-blue-600" />
          Máquina activa en el catálogo
        </label>
        <p class="text-xs leading-relaxed text-slate-500">
          El estado operativo se registra mediante las mantenciones. Marcar activa no la declara operativa.
        </p>
        <p v-if="errorGuardar" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ errorGuardar }}</p>
        <p v-if="guardando" role="status" class="text-sm text-slate-500">Guardando la máquina. Espera antes de cerrar.</p>
      </form>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" :disabled="guardando" @click="cerrar"
          class="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          Cancelar
        </button>
        <button type="submit" form="form-crear-maquina" :disabled="guardando || cargando"
          class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-40">
          {{ guardando ? 'Guardando…' : 'Guardar máquina' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>
