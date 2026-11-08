<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { gestionarCategoria, listarCategoriasGestion, type AccionCategoria, type CategoriaGestion } from '../../services/categorias-maquina.service'

const emit = defineEmits<{ cerrar: []; actualizado: [] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const categorias = ref<CategoriaGestion[]>([])
const busqueda = ref('')
const nombre = ref('')
const error = ref('')
const mensaje = ref('')
const cargando = ref(false)
const guardando = ref(false)
const accion = ref<{ tipo: AccionCategoria; categoria?: CategoriaGestion } | null>(null)
let solicitud: AbortController | undefined
let desmontado = false

const visibles = computed(() => categorias.value.filter(categoria =>
  categoria.nombre.toLocaleLowerCase('es').includes(busqueda.value.trim().toLocaleLowerCase('es')),
))
const titulos = { crear: 'Crear categoría', renombrar: 'Renombrar categoría', archivar: 'Archivar categoría', reactivar: 'Reactivar categoría' }
const requiereNombre = computed(() => accion.value?.tipo === 'crear' || accion.value?.tipo === 'renombrar')

async function cargar() {
  solicitud?.abort()
  const actual = new AbortController()
  solicitud = actual
  cargando.value = true
  error.value = ''
  try {
    const filas = await listarCategoriasGestion(actual.signal)
    if (!actual.signal.aborted) categorias.value = filas
  } catch (causa) {
    if (!actual.signal.aborted) error.value = causa instanceof Error ? causa.message : 'No se pudieron cargar las categorías.'
  } finally {
    if (!actual.signal.aborted) cargando.value = false
  }
}

function elegir(tipo: AccionCategoria, categoria?: CategoriaGestion) {
  if (guardando.value || cargando.value) return
  accion.value = { tipo, categoria }
  nombre.value = tipo === 'renombrar' ? categoria?.nombre ?? '' : ''
  error.value = ''
  mensaje.value = ''
}

async function guardar() {
  const actual = accion.value
  if (!actual || guardando.value || (requiereNombre.value && !nombre.value.trim())) return
  guardando.value = true
  error.value = ''
  try {
    await gestionarCategoria(actual.tipo, actual.categoria?.id ?? null, requiereNombre.value ? nombre.value : null)
    if (desmontado) return
    accion.value = null
    mensaje.value = 'Categoría actualizada.'
    emit('actualizado')
    await cargar()
  } catch (causa) {
    if (!desmontado) error.value = causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.'
  } finally {
    guardando.value = false
  }
}

function cerrar() {
  if (!guardando.value) dialogo.value?.close()
}

onMounted(() => {
  dialogo.value?.showModal()
  void cargar()
})
onScopeDispose(() => {
  desmontado = true
  solicitud?.abort()
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" aria-labelledby="titulo-categorias-maquina" @cancel.prevent="cerrar"
      @close="emit('cerrar')"
      class="m-auto w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/60">
      <div class="flex max-h-[90dvh] min-h-0 flex-col">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 id="titulo-categorias-maquina" class="text-lg font-bold">Gestionar categorías</h2>
            <p class="mt-1 text-sm text-slate-600">Catálogo compartido por Máquinas y Pautas.</p>
          </div>
          <button type="button" autofocus :disabled="guardando"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50" @click="cerrar">
            Cerrar
          </button>
        </header>

        <div class="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-5" :aria-busy="cargando || guardando">
          <p v-if="mensaje" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{{ mensaje }}</p>
          <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
          <form v-if="accion" class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" @submit.prevent="guardar">
            <h3 class="font-semibold">{{ titulos[accion.tipo] }}</h3>
            <label v-if="requiereNombre" class="grid gap-1 text-sm">
              Nombre
              <input v-model="nombre" maxlength="80" required :disabled="guardando"
                class="rounded-lg border border-slate-300 bg-white px-3 py-2" />
            </label>
            <p v-else-if="accion.tipo === 'archivar'" class="text-sm">
              «{{ accion.categoria?.nombre }}» dejará de estar disponible para nuevas asignaciones.
              Se conservan sus vínculos: {{ accion.categoria?.maquinas }} máquinas y {{ accion.categoria?.pautas }} pautas.
            </p>
            <p v-else class="text-sm">«{{ accion.categoria?.nombre }}» volverá a estar disponible para nuevas asignaciones.</p>
            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" :disabled="guardando" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                @click="accion = null; error = ''">Cancelar</button>
              <button type="submit" :disabled="guardando || (requiereNombre && !nombre.trim())"
                class="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {{ guardando ? 'Guardando…' : titulos[accion.tipo] }}
              </button>
            </div>
          </form>
          <template v-else>
            <div class="flex flex-wrap items-end gap-3">
              <label class="grid grow gap-1 text-sm">
                Buscar categoría
                <input v-model="busqueda" type="search" class="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <button type="button" :disabled="guardando || cargando"
                class="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                @click="elegir('crear')">Crear categoría</button>
              <button type="button" :disabled="guardando || cargando"
                class="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" @click="cargar">Actualizar</button>
            </div>
            <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando categorías…</p>
            <p v-else-if="!error && !visibles.length" class="text-sm text-slate-500">No hay categorías que coincidan.</p>
            <ul v-if="visibles.length" class="divide-y divide-slate-200 rounded-xl border border-slate-200">
              <li v-for="categoria in visibles" :key="categoria.id" class="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div class="min-w-0">
                  <p class="break-words font-semibold">{{ categoria.nombre }}</p>
                  <p class="text-slate-500">
                    {{ categoria.archivada_at ? 'Archivada' : 'Vigente' }} · {{ categoria.maquinas }} máquinas · {{ categoria.pautas }} pautas
                  </p>
                </div>
                <div class="flex flex-wrap gap-3">
                  <button type="button" :disabled="cargando || guardando" class="font-semibold text-blue-700"
                    @click="elegir('renombrar', categoria)">Renombrar</button>
                  <button type="button" :disabled="cargando || guardando" class="font-semibold text-slate-700"
                    @click="elegir(categoria.archivada_at ? 'reactivar' : 'archivar', categoria)">
                    {{ categoria.archivada_at ? 'Reactivar' : 'Archivar' }}
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
