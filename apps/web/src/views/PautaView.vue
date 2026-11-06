<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import PautaDetalle from '../components/pauta/PautaDetalle.vue'
import PautaGestionModal from '../components/pauta/PautaGestionModal.vue'
import { obtenerCatalogoPautas, type Pauta, type CategoriaPauta, type AccionPauta } from '../services/pauta.service'

const pautas = ref<Pauta[]>([])
const categorias = ref<CategoriaPauta[]>([])
const cargando = ref(false)
const error = ref(false)
const busqueda = ref('')
const categoriaId = ref('')
const estado = ref('')
const primeraFila = ref(0)
const seleccionadaId = ref<string | null>(null)
const gestion = ref<{ accion: AccionPauta; pauta?: Pauta } | null>(null)
const mensaje = ref('')
let solicitud: AbortController | null = null

function abrirGestion(accion: AccionPauta, pauta?: Pauta): void {
  if (cargando.value || gestion.value || (accion !== 'crear' && !pauta)) return
  mensaje.value = ''
  gestion.value = { accion, pauta }
}

async function alCompletar(accion: AccionPauta): Promise<void> {
  seleccionadaId.value = null
  gestion.value = null
  mensaje.value = accion === 'crear' ? 'Pauta creada.'
    : accion === 'editar' ? 'Pauta actualizada.' : 'Pauta retirada del catálogo.'
  await cargar()
}

const categoriasPorId = computed(() => new Map(categorias.value.map(c => [c.id, c.nombre])))
function nombreCategoria(id: string) { return categoriasPorId.value.get(id) ?? 'Categoría no disponible' }
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
const filtradas = computed(() => {
  const texto = normalizar(busqueda.value)
  return pautas.value.filter(p =>
    normalizar(p.nombre).includes(texto) &&
    (!categoriaId.value || p.categoria_id === categoriaId.value) &&
    (!estado.value || p.activo === (estado.value === 'activa')),
  )
})
const seleccionada = computed(() => pautas.value.find(p => p.id === seleccionadaId.value))
const detalleVisible = computed({
  get: () => seleccionada.value !== undefined,
  set: (visible: boolean) => {
    if (!visible) seleccionadaId.value = null
  },
})
watch([busqueda, categoriaId, estado], () => { primeraFila.value = 0 })

async function cargar() {
  if (cargando.value) return
  const actual = new AbortController()
  solicitud = actual
  cargando.value = true
  error.value = false
  try {
    const resultado = await obtenerCatalogoPautas(actual.signal)
    if (actual.signal.aborted) return
    pautas.value = resultado.pautas
    categorias.value = resultado.categorias
    primeraFila.value = 0
    if (!seleccionada.value) seleccionadaId.value = null
  } catch {
    if (!actual.signal.aborted) error.value = true
  } finally {
    if (!actual.signal.aborted) cargando.value = false
  }
}

function verPauta(id: string) {
  seleccionadaId.value = id
}
onMounted(cargar)
onUnmounted(() => solicitud?.abort())
</script>

<template>
  <section aria-labelledby="titulo-pautas">
    <header class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 id="titulo-pautas" class="text-2xl font-bold">Pautas de mantenimiento</h1>
        <p class="mt-1 text-sm text-slate-600">Consulta las instrucciones por categoría de máquina.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" :disabled="cargando"
          class="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          @click="abrirGestion('crear')">
          Crear pauta
        </button>
        <button type="button" :disabled="cargando"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" @click="cargar">
          Actualizar
        </button>
      </div>
    </header>

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <label class="text-sm">Buscar por nombre
        <input v-model="busqueda" type="search" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" />
      </label>
      <label class="text-sm">Categoría
        <select v-model="categoriaId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2">
          <option value="">Todas</option>
          <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">{{ categoria.nombre }}
          </option>
        </select>
      </label>
      <label class="text-sm">Estado
        <select v-model="estado" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2">
          <option value="">Todos</option>
          <option value="activa">Activas</option>
          <option value="inactiva">Inactivas</option>
        </select>
      </label>
    </div>

    <p v-if="mensaje" role="status" class="mb-3 text-sm text-emerald-700">{{ mensaje }}</p>
    <p v-if="error" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      No se pudo cargar el catálogo. Comprueba los permisos de lectura o pulsa Actualizar.
    </p>

    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <DataTable v-model:first="primeraFila" :value="filtradas" data-key="id" :loading="cargando" paginator :rows="10"
        :rows-per-page-options="[10, 25, 50]" :table-style="{ minWidth: '38rem' }">
        <template #empty>{{ error ? 'Catálogo no disponible.' : 'No hay pautas que coincidan.' }}</template>
        <Column field="nombre" header="Pauta" />
        <Column header="Categoría">
          <template #body="{ data }">{{ nombreCategoria(data.categoria_id) }}</template>
        </Column>
        <Column field="version" header="Versión" />
        <Column header="Estado">
          <template #body="{ data }">
            <span class="rounded-full px-2 py-1 text-xs font-medium"
              :class="data.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'">
              {{ data.activo ? 'Activa' : 'Inactiva' }}
            </span>
          </template>
        </Column>
        <Column header="Acción">
          <template #body="{ data }">
            <button type="button" class="font-semibold text-blue-700 hover:underline" @click="verPauta(data.id)">
              Ver pauta
            </button>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-if="!gestion" v-model:visible="detalleVisible" modal block-scroll header="Detalle de pauta"
      :style="{ width: 'min(52rem, calc(100vw - 2rem))', maxHeight: '90dvh' }">
      <PautaDetalle v-if="seleccionada" :key="seleccionada.id" :pauta="seleccionada"
        :categoria="nombreCategoria(seleccionada.categoria_id)" />
      <template #footer>
        <div v-if="seleccionada" class="flex flex-wrap justify-end gap-2">
          <button type="button" :disabled="cargando"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            @click="abrirGestion('editar', seleccionada)">
            Editar pauta
          </button>
          <button type="button" :disabled="cargando"
            class="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            @click="abrirGestion('eliminar', seleccionada)">
            Retirar pauta
          </button>
        </div>
      </template>
    </Dialog>
    <PautaGestionModal v-if="gestion" :accion="gestion.accion" :pauta="gestion.pauta" :categorias="categorias"
      @cerrar="gestion = null" @completado="alCompletar" />
  </section>
</template>
