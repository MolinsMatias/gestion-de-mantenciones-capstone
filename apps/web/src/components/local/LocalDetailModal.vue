<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { BuildingStorefrontIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import CatalogoSelect from '../ui/CatalogoSelect.vue'
import { actualizarLocal, obtenerDetalleLocal } from '../../services/detalle-local.service'
import { obtenerPaises, obtenerRegiones, obtenerComunas } from '../../services/ubicacion.service'
import type { LocalDetalle, LocalRegistro } from '../../types/detalle-local'
import type { PaisOpcion, RegionOpcion, ComunaOpcion } from '../../types/ubicaciones'

const props = defineProps<{ localId: string }>()
const emit = defineEmits<{ cerrar: []; actualizado: [local: LocalRegistro] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const local = ref<LocalDetalle | null>(null)
const editando = ref(false)
const cargando = ref(false)
const cargandoUbicacion = ref(false)
const guardando = ref(false)
const error = ref('')
const errorUbicacion = ref('')
const mensaje = ref('')
const paises = ref<PaisOpcion[]>([])
const regiones = ref<RegionOpcion[]>([])
const comunas = ref<ComunaOpcion[]>([])
const formulario = reactive({ nombre: '', direccion: '', activo: false, paisId: '', regionId: '', comunaId: '' })
let controller: AbortController | null = null
let ubicacionController: AbortController | null = null
let versionUbicacion = 0
let desmontado = false
let focoAnterior: HTMLElement | null = null
const ubicacionValida = computed(() =>
  paises.value.some(p => p.id === formulario.paisId) &&
  regiones.value.some(r => r.id === formulario.regionId && r.pais_id === formulario.paisId) &&
  comunas.value.some(c => c.id === formulario.comunaId && c.region_id === formulario.regionId),
)
const fechaRegistro = computed(() => {
  const fecha = local.value?.created_at ? new Date(local.value.created_at) : null
  return fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }) : 'Sin registro'
})
function detenerUbicacion() {
  versionUbicacion++
  ubicacionController?.abort()
  ubicacionController = null
  cargandoUbicacion.value = false
}
async function cargar(): Promise<void> {
  if (cargando.value || editando.value || guardando.value) return
  controller?.abort()
  const peticion = new AbortController()
  controller = peticion
  cargando.value = true
  error.value = ''
  mensaje.value = ''
  local.value = null
  try {
    const resultado = await obtenerDetalleLocal(props.localId, peticion.signal)
    if (!desmontado) local.value = resultado
  } catch (causa: unknown) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo cargar el local.'
  } finally {
    if (!desmontado) cargando.value = false
  }
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
    if (version === versionUbicacion && !desmontado) errorUbicacion.value = causa instanceof Error ? causa.message : 'No se pudo cargar la ubicación.'
  } finally {
    if (version === versionUbicacion && !desmontado) cargandoUbicacion.value = false
  }
}
function editar(): void {
  if (!local.value || guardando.value || editando.value) return
  error.value = ''; mensaje.value = ''
  Object.assign(formulario, {
    nombre: local.value.nombre, direccion: local.value.direccion ?? '', activo: local.value.activo === true,
    paisId: local.value.pais?.id ?? '', regionId: local.value.region?.id ?? '', comunaId: local.value.comuna_id ?? '',
  })
  paises.value = []; regiones.value = []; comunas.value = []
  editando.value = true
  void cargarUbicacion('todos')
}
function cambiarPais(): void {
  formulario.regionId = ''; formulario.comunaId = ''
  regiones.value = []; comunas.value = []
  void cargarUbicacion('regiones')
}
function cambiarRegion(): void {
  formulario.comunaId = ''; comunas.value = []
  void cargarUbicacion('comunas')
}
function cancelarEdicion(): void {
  if (guardando.value) return
  detenerUbicacion()
  editando.value = false
  error.value = ''; errorUbicacion.value = ''
}
function cerrar(): void {
  if (guardando.value) return
  if (editando.value) {
    error.value = 'Guarda los cambios o pulsa Cancelar edición antes de cerrar.'
    return
  }
  emit('cerrar')
}
async function guardar(): Promise<void> {
  if (!local.value || !editando.value || guardando.value || cargandoUbicacion.value) return
  error.value = ''
  if (!ubicacionValida.value || errorUbicacion.value) {
    error.value = 'Selecciona un país, una región y una comuna válidos.'
    return
  }
  guardando.value = true
  try {
    const actualizado = await actualizarLocal(local.value, {
      nombre: formulario.nombre, direccion: formulario.direccion, activo: formulario.activo, comuna_id: formulario.comunaId,
    })
    if (desmontado) return
    local.value = {
      ...actualizado,
      pais: paises.value.find(p => p.id === formulario.paisId) ?? null,
      region: regiones.value.find(r => r.id === formulario.regionId) ?? null,
      comuna: comunas.value.find(c => c.id === formulario.comunaId) ?? null,
    }
    editando.value = false
    mensaje.value = 'Los cambios del local se guardaron correctamente.'
    emit('actualizado', actualizado)
  } catch (causa: unknown) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo guardar el local.'
  } finally {
    if (!desmontado) guardando.value = false
  }
}
onMounted(() => {
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogo.value?.showModal()
  void cargar()
})
onBeforeUnmount(() => {
  desmontado = true
  controller?.abort()
  detenerUbicacion()
  dialogo.value?.close()
  if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="detalle-local-titulo" @cancel.prevent="cerrar"
      class="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60">
      <header class="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <BuildingStorefrontIcon class="mb-3 size-8 text-blue-600" aria-hidden="true" />
          <h2 id="detalle-local-titulo" class="text-2xl font-bold">{{ editando ? 'Editar local' : `Información del
            local` }}</h2>
          <p class="mt-2 text-sm text-slate-500">{{ editando ? 'Los cambios se aplican al pulsar Guardar cambios.' :
            'Consulta los datos o pulsa Editar para modificarlos.' }}</p>
        </div>
        <button type="button" aria-label="Cerrar ficha" :disabled="guardando" @click="cerrar"
          class="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50">
          <XMarkIcon class="size-5" aria-hidden="true" />
        </button>
      </header>
      <div class="space-y-5 p-6">
        <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando información del local…</p>
        <p v-if="mensaje" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{{ mensaje }}</p>
        <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

        <template v-if="local && !editando">
          <div class="flex items-start justify-between gap-4">
            <h3 class="text-xl font-bold">{{ local.nombre }}</h3>
            <span class="rounded-full px-3 py-1 text-xs font-semibold"
              :class="local.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
              {{ local.activo === true ? 'Activo' : local.activo === false ? 'Inactivo' : 'Sin definir' }}
            </span>
          </div>
          <dl class="grid gap-5 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
            <div class="sm:col-span-2">
              <dt class="text-slate-500">Dirección</dt>
              <dd class="mt-1 font-medium">{{ local.direccion || 'Sin registrar' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">País</dt>
              <dd class="mt-1 font-medium">{{ local.pais?.nombre || 'Sin registrar' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Región</dt>
              <dd class="mt-1 font-medium">{{ local.region?.nombre || 'Sin registrar' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Comuna</dt>
              <dd class="mt-1 font-medium">{{ local.comuna?.nombre || 'Sin registrar' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Prefijo de máquinas</dt>
              <dd class="mt-1 font-medium">{{ local.prefijo || 'Sin registrar' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Fecha de registro</dt>
              <dd class="mt-1 font-medium">{{ fechaRegistro }}</dd>
            </div>
          </dl>
          <div class="flex flex-wrap justify-end gap-3">
            <button type="button" @click="cargar"
              class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Recargar ficha</button>
            <button type="button" @click="editar"
              class="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              <PencilSquareIcon class="size-5" aria-hidden="true" />Editar
            </button>
          </div>
        </template>

        <form v-else-if="local && editando" class="space-y-5" :aria-busy="guardando" @submit.prevent="guardar">
          <fieldset :disabled="guardando" class="space-y-5">
            <div><label for="editar-local-nombre" class="block text-sm font-semibold">Nombre</label>
              <input id="editar-local-nombre" v-model="formulario.nombre" required
                class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100" />
            </div>
            <div><label for="editar-local-direccion" class="block text-sm font-semibold">Dirección</label>
              <input id="editar-local-direccion" v-model="formulario.direccion" required
                class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100" />
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <CatalogoSelect id="editar-local-pais" v-model="formulario.paisId" label="País" :opciones="paises"
                placeholder="Selecciona un país" mensaje-vacio="No hay países disponibles."
                :deshabilitado="cargandoUbicacion" @update:model-value="cambiarPais" />
              <CatalogoSelect id="editar-local-region" v-model="formulario.regionId" label="Región" :opciones="regiones"
                placeholder="Selecciona una región" mensaje-vacio="Selecciona un país con regiones disponibles."
                :deshabilitado="cargandoUbicacion || !formulario.paisId" @update:model-value="cambiarRegion" />
              <CatalogoSelect id="editar-local-comuna" v-model="formulario.comunaId" label="Comuna" :opciones="comunas"
                placeholder="Selecciona una comuna" mensaje-vacio="Selecciona una región con comunas disponibles."
                :deshabilitado="cargandoUbicacion || !formulario.regionId" />
            </div>
            <p v-if="cargandoUbicacion" role="status" class="text-sm text-slate-500">Cargando ubicación…</p>
            <div v-if="errorUbicacion" role="alert" class="text-sm text-red-700">
              {{ errorUbicacion }}
              <button type="button" @click="cargarUbicacion('todos')" class="ml-2 font-semibold underline">Reintentar
                ubicación</button>
            </div>
            <div class="rounded-xl bg-slate-50 p-4 text-sm">
              <p class="font-semibold">Prefijo: {{ local.prefijo || 'Sin registrar' }}</p>
              <p class="mt-1 text-slate-500">Se mantiene fijo en esta ficha para conservar la identificación de las
                máquinas.
              </p>
            </div>
            <label class="flex items-center gap-3 text-sm font-medium"><input v-model="formulario.activo"
                type="checkbox" class="size-4 accent-blue-600" />Local activo</label>
            <p class="text-xs text-slate-500">Cambiar el estado del local no modifica automáticamente sus máquinas.</p>
          </fieldset>
          <p v-if="guardando" role="status" class="text-sm text-slate-500">Guardando cambios…</p>
          <div class="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" :disabled="guardando" @click="cancelarEdicion"
              class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">Cancelar
              edición</button>
            <button type="submit" :disabled="guardando || cargandoUbicacion || !!errorUbicacion || !ubicacionValida"
              class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{{
                guardando ? 'Guardando…' : 'Guardar cambios' }}</button>
          </div>
        </form>
        <button v-if="!local && !cargando" type="button" @click="cargar"
          class="text-sm font-semibold text-blue-600 underline">Reintentar</button>
      </div>
    </dialog>
  </Teleport>
</template>
