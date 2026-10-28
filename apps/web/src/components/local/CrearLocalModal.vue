<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  BuildingStorefrontIcon,
  CheckIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { crearLocal, obtenerComunas } from '../../services/locales.service'
import type { ComunaOpcion, LocalCreado } from '../../types/local'

const emit = defineEmits<{
  cerrar: []
  creado: [local: LocalCreado]
}>()

const dialogo = ref<HTMLDialogElement | null>(null)
const comunas = ref<ComunaOpcion[]>([])
const cargandoComunas = ref(false)
const guardando = ref(false)
const errorComunas = ref('')
const errorGuardar = ref('')
const formulario = reactive({ nombre: '', direccion: '', comuna_id: '', activo: true })

// Estado para el buscador y autocompletado de comuna
const busquedaComuna = ref('')
const menuComunasAbierto = ref(false)
const contenedorComuna = ref<HTMLElement | null>(null)

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const comunasFiltradas = computed(() => {
  const query = normalizarTexto(busquedaComuna.value)
  if (!query) return comunas.value.slice(0, 40) // Mostramos las primeras 40 por rendimiento
  return comunas.value
    .filter(c => normalizarTexto(c.nombre).includes(query))
    .slice(0, 40)
})

function seleccionarComuna(comuna: ComunaOpcion): void {
  formulario.comuna_id = comuna.id
  busquedaComuna.value = comuna.nombre
  menuComunasAbierto.value = false
  errorGuardar.value = ''
}

function limpiarSeleccionComuna(): void {
  formulario.comuna_id = ''
  busquedaComuna.value = ''
  menuComunasAbierto.value = true
}

function alEscribirComuna(): void {
  menuComunasAbierto.value = true
  // Si el usuario edita el texto y ya no coincide exactamente, invalidamos la selección anterior
  const coincidenciaExacta = comunas.value.find(
    c => normalizarTexto(c.nombre) === normalizarTexto(busquedaComuna.value)
  )
  formulario.comuna_id = coincidenciaExacta ? coincidenciaExacta.id : ''
}

function manejarClickFuera(event: MouseEvent): void {
  if (contenedorComuna.value && !contenedorComuna.value.contains(event.target as Node)) {
    menuComunasAbierto.value = false
    // Si cerró y no seleccionó una comuna válida, restaurar el nombre de la seleccionada o vaciar
    const seleccionada = comunas.value.find(c => c.id === formulario.comuna_id)
    busquedaComuna.value = seleccionada ? seleccionada.nombre : ''
  }
}

let controller: AbortController | null = null
let versionCatalogo = 0
let desmontado = false
let focoAnterior: HTMLElement | null = null

async function cargarComunas(): Promise<void> {
  if (cargandoComunas.value) return
  const solicitud = ++versionCatalogo
  const actual = new AbortController()
  controller = actual
  cargandoComunas.value = true
  errorComunas.value = ''
  try {
    const resultado = await obtenerComunas(actual.signal)
    if (desmontado || solicitud !== versionCatalogo) return
    comunas.value = resultado
  } catch (error: unknown) {
    if (desmontado || solicitud !== versionCatalogo) return
    errorComunas.value = error instanceof Error ? error.message : 'No se pudieron cargar las comunas.'
  } finally {
    if (!desmontado && solicitud === versionCatalogo) {
      cargandoComunas.value = false
      controller = null
    }
  }
}

function cerrar(): void {
  if (guardando.value) return
  emit('cerrar')
}

async function guardar(): Promise<void> {
  if (guardando.value || cargandoComunas.value) return
  errorGuardar.value = ''
  if (!formulario.comuna_id || !comunas.value.some(c => c.id === formulario.comuna_id)) {
    errorGuardar.value = 'Debes seleccionar una comuna válida de la lista sugerida.'
    menuComunasAbierto.value = true
    return
  }
  guardando.value = true
  try {
    const local = await crearLocal(formulario)
    if (!desmontado) emit('creado', local)
  } catch (error: unknown) {
    if (!desmontado) {
      errorGuardar.value = error instanceof Error ? error.message : 'No se pudo crear el local.'
    }
  } finally {
    if (!desmontado) guardando.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', manejarClickFuera)
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogo.value?.showModal()
  void cargarComunas()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', manejarClickFuera)
  desmontado = true
  versionCatalogo++
  controller?.abort()
  dialogo.value?.close()
  if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="crear-local-titulo" aria-describedby="crear-local-descripcion"
      class="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      @cancel.prevent="cerrar">
      <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <BuildingStorefrontIcon class="mb-3 size-8 text-blue-600" aria-hidden="true" />
          <h2 id="crear-local-titulo" class="text-2xl font-bold">Crear local</h2>
          <p id="crear-local-descripcion" class="mt-2 text-sm text-slate-500">Registra un nuevo recinto de Bowling Services.</p>
        </div>
        <button type="button" aria-label="Cerrar modal" :disabled="guardando" @click="cerrar"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
          <XMarkIcon class="size-5" aria-hidden="true" />
        </button>
      </div>

      <form class="space-y-5 p-6" :aria-busy="guardando" @submit.prevent="guardar">
        <div>
          <label for="local-nombre" class="block text-sm font-semibold">Nombre del local</label>
          <input id="local-nombre" v-model="formulario.nombre" type="text" required autofocus :disabled="guardando"
            placeholder="Ej.: Local Providencia"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
        </div>

        <div>
          <label for="local-direccion" class="block text-sm font-semibold">Dirección</label>
          <input id="local-direccion" v-model="formulario.direccion" type="text" required :disabled="guardando"
            autocomplete="street-address" placeholder="Calle, número y ubicación del recinto"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
        </div>

        <!-- Combobox con búsqueda y autocompletado para Comuna -->
        <div ref="contenedorComuna" class="relative">
          <div class="flex items-center justify-between">
            <label for="local-comuna-input" class="block text-sm font-semibold">Comuna</label>
            <span v-if="formulario.comuna_id" class="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckIcon class="size-3.5" /> Seleccionada
            </span>
          </div>

          <div class="relative mt-2">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <MagnifyingGlassIcon class="size-5" aria-hidden="true" />
            </div>

            <input
              id="local-comuna-input"
              v-model="busquedaComuna"
              type="text"
              required
              autocomplete="off"
              :disabled="guardando || cargandoComunas || comunas.length === 0"
              :placeholder="cargandoComunas ? 'Cargando comunas…' : 'Buscar comuna (ej. Providencia, Maipú)...'"
              class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
              @focus="menuComunasAbierto = true"
              @input="alEscribirComuna"
              @keydown.down.prevent="menuComunasAbierto = true"
            />

            <div class="absolute inset-y-0 right-0 flex items-center pr-2">
              <button
                v-if="busquedaComuna && !guardando"
                type="button"
                aria-label="Limpiar selección"
                class="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                @click="limpiarSeleccionComuna"
              >
                <XMarkIcon class="size-4" />
              </button>
              <button
                v-else
                type="button"
                tabindex="-1"
                aria-label="Alternar lista de comunas"
                class="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                @click="menuComunasAbierto = !menuComunasAbierto"
              >
                <ChevronUpDownIcon class="size-5" />
              </button>
            </div>
          </div>

          <!-- Menú desplegable flotante con las coincidencias -->
          <div
            v-if="menuComunasAbierto && !cargandoComunas && comunas.length > 0"
            class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
          >
            <ul v-if="comunasFiltradas.length > 0" role="listbox">
              <li
                v-for="comuna in comunasFiltradas"
                :key="comuna.id"
                role="option"
                :aria-selected="formulario.comuna_id === comuna.id"
                class="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition hover:bg-blue-50 hover:text-blue-700"
                :class="{ 'bg-blue-50 font-semibold text-blue-700': formulario.comuna_id === comuna.id }"
                @click="seleccionarComuna(comuna)"
              >
                <span>{{ comuna.nombre }}</span>
                <CheckIcon v-if="formulario.comuna_id === comuna.id" class="size-4 text-blue-600" />
              </li>
            </ul>
            <div v-else class="p-3 text-center text-xs text-slate-500">
              No se encontraron comunas que coincidan con "{{ busquedaComuna }}".
            </div>
          </div>

          <p v-if="errorComunas" role="alert" class="mt-2 text-sm text-red-700">{{ errorComunas }}</p>
          <p v-else-if="!cargandoComunas && !comunas.length" class="mt-2 text-sm text-amber-700">
            No hay comunas disponibles. Debes cargar el catálogo antes de crear un local.
          </p>
          <button
            v-if="errorComunas"
            type="button"
            :disabled="cargandoComunas"
            class="mt-2 text-sm font-semibold text-blue-600 underline"
            @click="cargarComunas"
          >
            Reintentar carga de comunas
          </button>
        </div>

        <label class="flex items-center gap-3 text-sm font-medium">
          <input v-model="formulario.activo" type="checkbox" :disabled="guardando" class="size-4 accent-blue-600" />
          Local activo
        </label>

        <p v-if="errorGuardar" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ errorGuardar }}</p>
        <p v-if="guardando" role="status" class="text-sm text-slate-500">Guardando el local. Espera antes de cerrar.</p>

        <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" :disabled="guardando" @click="cerrar"
            class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button type="submit" :disabled="guardando || cargandoComunas || !comunas.length"
            class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {{ guardando ? 'Guardando…' : 'Crear local' }}
          </button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
