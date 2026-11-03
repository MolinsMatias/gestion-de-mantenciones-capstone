<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import CatalogoSelect from '../ui/CatalogoSelect.vue'
import { obtenerPaises, obtenerRegiones, obtenerComunas } from '../../services/ubicacion.service'
import type { LocalDetalle } from '../../types/detalle-local'
import type { PaisOpcion, RegionOpcion, ComunaOpcion, UbicacionOpcion } from '../../types/ubicaciones'

export interface GuardarLocalEdicionPayload {
  nombre: string
  direccion: string
  activo: boolean
  comuna_id: string
  pais: UbicacionOpcion | null
  region: UbicacionOpcion | null
  comuna: UbicacionOpcion | null
}

const props = defineProps<{
  local: LocalDetalle
  guardando: boolean
}>()

const emit = defineEmits<{
  cancelar: []
  guardar: [payload: GuardarLocalEdicionPayload]
}>()

const formulario = reactive({
  nombre: props.local.nombre,
  direccion: props.local.direccion ?? '',
  activo: props.local.activo === true,
  paisId: props.local.pais?.id ?? '',
  regionId: props.local.region?.id ?? '',
  comunaId: props.local.comuna_id ?? '',
})

const cargandoUbicacion = ref(false)
const errorUbicacion = ref('')
const errorValidacion = ref('')

const paises = ref<PaisOpcion[]>([])
const regiones = ref<RegionOpcion[]>([])
const comunas = ref<ComunaOpcion[]>([])

let ubicacionController: AbortController | null = null
let versionUbicacion = 0
let desmontado = false

const ubicacionValida = computed(() =>
  paises.value.some(p => p.id === formulario.paisId) &&
  regiones.value.some(r => r.id === formulario.regionId && r.pais_id === formulario.paisId) &&
  comunas.value.some(c => c.id === formulario.comunaId && c.region_id === formulario.regionId),
)

function detenerUbicacion(): void {
  versionUbicacion++
  ubicacionController?.abort()
  ubicacionController = null
  cargandoUbicacion.value = false
}

async function cargarUbicacion(nivel: 'todos' | 'regiones' | 'comunas'): Promise<void> {
  detenerUbicacion()
  const version = versionUbicacion
  const peticion = new AbortController()
  ubicacionController = peticion
  const paisId = formulario.paisId
  const regionId = formulario.regionId
  errorUbicacion.value = ''
  cargandoUbicacion.value = true

  try {
    const [nuevosPaises, nuevasRegiones, nuevasComunas] = await Promise.all([
      nivel === 'todos' ? obtenerPaises(peticion.signal) : Promise.resolve(paises.value),
      nivel !== 'comunas' ? obtenerRegiones(paisId, peticion.signal) : Promise.resolve(regiones.value),
      obtenerComunas(regionId, peticion.signal),
    ])
    if (version !== versionUbicacion || desmontado) return
    paises.value = nuevosPaises
    regiones.value = nuevasRegiones
    comunas.value = nuevasComunas
  } catch (causa: unknown) {
    peticion.abort()
    if (version === versionUbicacion && !desmontado) {
      errorUbicacion.value = causa instanceof Error ? causa.message : 'No se pudo cargar la ubicación.'
    }
  } finally {
    if (version === versionUbicacion && !desmontado) {
      cargandoUbicacion.value = false
    }
  }
}

function cambiarPais(): void {
  formulario.regionId = ''
  formulario.comunaId = ''
  regiones.value = []
  comunas.value = []
  void cargarUbicacion('regiones')
}

function cambiarRegion(): void {
  formulario.comunaId = ''
  comunas.value = []
  void cargarUbicacion('comunas')
}

function enviar(): void {
  errorValidacion.value = ''
  if (!ubicacionValida.value || errorUbicacion.value) {
    errorValidacion.value = 'Selecciona un país, una región y una comuna válidos.'
    return
  }

  const paisObj = paises.value.find(p => p.id === formulario.paisId) ?? null
  const regionObj = regiones.value.find(r => r.id === formulario.regionId) ?? null
  const comunaObj = comunas.value.find(c => c.id === formulario.comunaId) ?? null

  emit('guardar', {
    nombre: formulario.nombre,
    direccion: formulario.direccion,
    activo: formulario.activo,
    comuna_id: formulario.comunaId,
    pais: paisObj,
    region: regionObj,
    comuna: comunaObj,
  })
}

onMounted(() => {
  void cargarUbicacion('todos')
})

onBeforeUnmount(() => {
  desmontado = true
  detenerUbicacion()
})
</script>

<template>
  <form class="space-y-5" :aria-busy="guardando" @submit.prevent="enviar">
    <fieldset :disabled="guardando" class="space-y-5">
      <div>
        <label for="editar-local-nombre" class="block text-sm font-semibold">Nombre</label>
        <input
          id="editar-local-nombre"
          v-model="formulario.nombre"
          required
          class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div>
        <label for="editar-local-direccion" class="block text-sm font-semibold">Dirección</label>
        <input
          id="editar-local-direccion"
          v-model="formulario.direccion"
          required
          class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <CatalogoSelect
          id="editar-local-pais"
          v-model="formulario.paisId"
          label="País"
          :opciones="paises"
          placeholder="Selecciona un país"
          mensaje-vacio="No hay países disponibles."
          :deshabilitado="cargandoUbicacion"
          @update:model-value="cambiarPais"
        />

        <CatalogoSelect
          id="editar-local-region"
          v-model="formulario.regionId"
          label="Región"
          :opciones="regiones"
          placeholder="Selecciona una región"
          mensaje-vacio="Selecciona un país con regiones disponibles."
          :deshabilitado="cargandoUbicacion || !formulario.paisId"
          @update:model-value="cambiarRegion"
        />

        <CatalogoSelect
          id="editar-local-comuna"
          v-model="formulario.comunaId"
          label="Comuna"
          :opciones="comunas"
          placeholder="Selecciona una comuna"
          mensaje-vacio="Selecciona una región con comunas disponibles."
          :deshabilitado="cargandoUbicacion || !formulario.regionId"
        />
      </div>

      <p v-if="cargandoUbicacion" role="status" class="text-sm text-slate-500">
        Cargando ubicación…
      </p>

      <div v-if="errorUbicacion" role="alert" class="text-sm text-red-700">
        {{ errorUbicacion }}
        <button
          type="button"
          class="ml-2 font-semibold underline"
          @click="cargarUbicacion('todos')"
        >
          Reintentar ubicación
        </button>
      </div>

      <p v-if="errorValidacion" role="alert" class="text-sm text-red-700">
        {{ errorValidacion }}
      </p>

      <div class="rounded-xl bg-slate-50 p-4 text-sm">
        <p class="font-semibold">Prefijo: {{ local.prefijo || 'Sin registrar' }}</p>
        <p class="mt-1 text-slate-500">
          Se mantiene fijo en esta ficha para conservar la identificación de las máquinas.
        </p>
      </div>

      <label class="flex items-center gap-3 text-sm font-medium">
        <input
          v-model="formulario.activo"
          type="checkbox"
          class="size-4 accent-blue-600"
        />
        Local activo
      </label>
      <p class="text-xs text-slate-500">
        Cambiar el estado del local no modifica automáticamente sus máquinas.
      </p>
    </fieldset>

    <p v-if="guardando" role="status" class="text-sm text-slate-500">
      Guardando cambios…
    </p>

    <div class="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        :disabled="guardando"
        class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50"
        @click="$emit('cancelar')"
      >
        Cancelar edición
      </button>

      <button
        type="submit"
        :disabled="guardando || cargandoUbicacion || !!errorUbicacion || !ubicacionValida"
        class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </div>
  </form>
</template>

