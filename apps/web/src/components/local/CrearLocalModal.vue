<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { BuildingStorefrontIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { crearLocal } from '../../services/local.service.ts'
import { useUbicacion } from '../../composables/useUbicacion'
import CatalogoSelect from '../ui/CatalogoSelect.vue'
import type { LocalCreado } from '../../types/local'

const emit = defineEmits<{ cerrar: []; creado: [local: LocalCreado] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const guardando = ref(false)
const errorGuardar = ref('')
const formulario = reactive({ nombre: '', prefijo: '', direccion: '', activo: true })
const {
  paisId, regionId, comunaId, paises, regiones, comunas, valida,
  cargando: cargandoUbicacion, cargandoPaises, cargandoRegiones, cargandoComunas,
  errorPaises, errorRegiones, errorComunas, cargarPaises, cargarRegiones, cargarComunas,
} = useUbicacion()
let desmontado = false
let focoAnterior: HTMLElement | null = null

function cerrar(): void { if (!guardando.value) emit('cerrar') }
async function guardar(): Promise<void> {
  if (guardando.value || cargandoUbicacion.value) return
  errorGuardar.value = ''
  if (!valida.value) { errorGuardar.value = 'Selecciona un país, su región y una comuna de esa región.'; return }
  guardando.value = true
  try {
    const local = await crearLocal({ ...formulario, comuna_id: comunaId.value })
    if (!desmontado) emit('creado', local)
  } catch (causa: unknown) {
    if (!desmontado) errorGuardar.value = causa instanceof Error ? causa.message : 'No se pudo crear el local.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}
onMounted(() => {
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogo.value?.showModal()
  void cargarPaises()
})
onBeforeUnmount(() => {
  desmontado = true
  dialogo.value?.close()
  if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="crear-local-titulo" aria-describedby="crear-local-descripcion"
      class="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      @cancel.prevent="cerrar">
      <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <BuildingStorefrontIcon class="mb-3 size-8 text-blue-600" aria-hidden="true" />
          <h2 id="crear-local-titulo" class="text-2xl font-bold">Crear local</h2>
          <p id="crear-local-descripcion" class="mt-2 text-sm text-slate-500">Registra el recinto y selecciona su
            ubicación.</p>
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
            placeholder="Ej.: Strike Zone Monticello"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
        </div>
        <div>
          <label for="local-prefijo" class="block text-sm font-semibold">Prefijo</label>
          <input id="local-prefijo" v-model="formulario.prefijo" type="text" required pattern="[A-Za-z0-9]+"
            :disabled="guardando" placeholder="Ej.: SZM" autocapitalize="characters" spellcheck="false"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
          <p class="mt-2 text-xs text-slate-500">Letras y números. Se guardará en mayúsculas.</p>
        </div>
        <div>
          <label for="local-direccion" class="block text-sm font-semibold">Dirección</label>
          <input id="local-direccion" v-model="formulario.direccion" type="text" required :disabled="guardando"
            autocomplete="street-address" placeholder="Calle, número y ubicación del recinto"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
        </div>
        <CatalogoSelect id="local-pais" v-model="paisId" label="País" :opciones="paises"
          placeholder="Selecciona un país" mensaje-vacio="No hay países disponibles en el catálogo."
          :cargando="cargandoPaises" :error="errorPaises" :deshabilitado="guardando" @reintentar="cargarPaises" />
        <CatalogoSelect id="local-region" v-model="regionId" label="Región" :opciones="regiones"
          placeholder="Selecciona una región"
          :mensaje-vacio="paisId ? 'No hay regiones disponibles para este país.' : 'Selecciona primero un país.'"
          :cargando="cargandoRegiones" :error="errorRegiones" :deshabilitado="guardando || !paisId || cargandoPaises"
          @reintentar="cargarRegiones" />
        <CatalogoSelect id="local-comuna" v-model="comunaId" label="Comuna" :opciones="comunas"
          placeholder="Selecciona una comuna"
          :mensaje-vacio="regionId ? 'No hay comunas disponibles para esta región.' : 'Selecciona primero una región.'"
          :cargando="cargandoComunas" :error="errorComunas" :deshabilitado="guardando || !regionId || cargandoRegiones"
          @reintentar="cargarComunas" />
        <label class="flex items-center gap-3 text-sm font-medium"><input v-model="formulario.activo" type="checkbox"
            :disabled="guardando" class="size-4 accent-blue-600" />Local activo</label>
        <p v-if="errorGuardar" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ errorGuardar }}</p>
        <p v-if="guardando" role="status" class="text-sm text-slate-500">Guardando el local. Espera antes de cerrar.</p>
        <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" :disabled="guardando" @click="cerrar"
            class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button type="submit" :disabled="guardando || cargandoUbicacion || !valida"
            class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{{
              guardando ? 'Guardando…' : 'Crear local' }}</button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>