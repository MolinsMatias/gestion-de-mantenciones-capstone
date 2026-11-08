<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import MantencionDetalle from '../components/mantencion/MantencionDetalle.vue'
import CargaSeccion from '../components/layout/CargaSeccion.vue'
import { useCargaInicial } from '../composables/useCargaInicial'
import {
  etiquetaMantencion, fechaMantencion, obtenerLocalesMantenciones, obtenerMaquinasMantenciones, obtenerMaquinasDelHistorialLocal, obtenerMantenciones, POR_PAGINA,
  type FilaMantencion, type LocalMantencion, type MaquinaMantencion,
} from '../services/mantencion.service'

const filas = ref<FilaMantencion[]>([])
const locales = ref<LocalMantencion[]>([])
const maquinas = ref<MaquinaMantencion[]>([])
const seleccion = ref<FilaMantencion | null>(null)
const localId = ref('')
const tipo = ref('')
const estado = ref('')
const maquinaId = ref('')
const historialLocal = ref<{ localId: string; ids: Set<string> } | null>(null)
const opcionesMaquinaListas = computed(() => !localId.value || historialLocal.value?.localId === localId.value)
const maquinasDisponibles = computed(() => {
  if (!localId.value) return maquinas.value
  const historial = historialLocal.value
  return historial?.localId === localId.value
    ? maquinas.value.filter(maquina => historial.ids.has(maquina.id))
    : []
})
const pagina = ref(1)
const total = ref(0)
const cargando = ref(false)
const cargado = ref(false)
const error = ref('')
const paginas = computed(() => Math.max(1, Math.ceil(total.value / POR_PAGINA)))
let controller: AbortController | undefined

async function cargar(destino: number, filtros = { localId: localId.value, maquinaId: maquinaId.value, tipo: tipo.value, estado: estado.value }, recargarCatalogos = false) {
  controller?.abort()
  const actual = new AbortController()
  controller = actual
  cargando.value = true
  error.value = ''
  try {
    const recargar = recargarCatalogos || !cargado.value
    const local = filtros.localId
    const historial = historialLocal.value
    const [opciones, equipos, ids] = await Promise.all([
      recargar ? obtenerLocalesMantenciones(actual.signal) : locales.value,
      recargar ? obtenerMaquinasMantenciones(actual.signal) : maquinas.value,
      !local ? null
        : !recargar && historial?.localId === local ? historial.ids
          : obtenerMaquinasDelHistorialLocal(local, actual.signal),
    ])
    let nuevaPagina = destino
    let resultado = await obtenerMantenciones({ ...filtros, pagina: nuevaPagina }, opciones, actual.signal)
    const ultima = Math.max(1, Math.ceil(resultado.total / POR_PAGINA))
    if (nuevaPagina > ultima) {
      nuevaPagina = ultima
      resultado = await obtenerMantenciones({ ...filtros, pagina: nuevaPagina }, opciones, actual.signal)
    }
    if (actual.signal.aborted) return
    locales.value = opciones
    maquinas.value = equipos
    historialLocal.value = ids ? { localId: local, ids } : null
    filas.value = resultado.filas
    total.value = resultado.total
    pagina.value = nuevaPagina
    cargado.value = true
  } catch (fallo) {
    if (actual.signal.aborted) return
    console.error('[Mantenciones] Error al consultar:', fallo)
    error.value = 'No se pudieron consultar las mantenciones. Intenta actualizar.'
  } finally {
    if (!actual.signal.aborted) cargando.value = false
  }
}

// El filtro de máquina anterior no debe aplicarse al cambiar de recinto.
watch(localId, () => { maquinaId.value = '' }, { flush: 'sync' })
watch([localId, maquinaId, tipo, estado], () => {
  void cargar(1)
})

const mostrandoCargaInicial = useCargaInicial(() => cargar(1))
onScopeDispose(() => controller?.abort())
</script>

<template>
  <section aria-labelledby="titulo-mantenciones">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 id="titulo-mantenciones" class="text-2xl font-bold text-slate-900">Mantenciones</h1>
        <p class="mt-1 text-sm text-slate-600">Consulta los registros recibidos desde la app del técnico.</p>
      </div>
      <button type="button" :disabled="cargando || mostrandoCargaInicial"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        @click="cargar(error ? 1 : pagina, undefined, true)">
        {{ cargando && !mostrandoCargaInicial ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>
    <CargaSeccion v-if="mostrandoCargaInicial" variante="tabla" mensaje="Cargando mantenciones…" />
    <template v-else>
      <p v-if="error" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <template v-if="cargado">
        <div class="mb-4 flex flex-wrap items-end gap-3">
          <label class="grid gap-1 text-sm font-medium text-slate-700">
            Local
            <select v-model="localId" class="rounded-lg border border-slate-300 bg-white p-2">
              <option value="">Todos los locales</option>
              <option v-for="local in locales" :key="local.id" :value="local.id">{{ local.nombre }}</option>
            </select>
          </label>
          <label class="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
            Máquina
            <select v-model="maquinaId" :disabled="!opcionesMaquinaListas"
              class="w-full max-w-72 rounded-lg border border-slate-300 bg-white p-2 disabled:opacity-60">
              <option value="">{{ !opcionesMaquinaListas
                ? (cargando ? 'Cargando máquinas…' : 'Opciones no disponibles')
                : localId && !maquinasDisponibles.length ? 'Sin máquinas en este historial' : 'Todas las máquinas' }}
              </option>
              <option v-for="maquina in maquinasDisponibles" :key="maquina.id" :value="maquina.id">
                {{ maquina.nombre }} · {{ maquina.codigo_interno }}
              </option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-medium text-slate-700">
            Tipo
            <select v-model="tipo" class="rounded-lg border border-slate-300 bg-white p-2">
              <option value="">Todos los tipos</option>
              <option value="inspeccion">Inspección</option>
              <option value="preventiva">Preventiva</option>
              <option value="correctiva">Correctiva</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-medium text-slate-700">
            Estado final del equipo
            <select v-model="estado" class="rounded-lg border border-slate-300 bg-white p-2">
              <option value="">Todos los estados</option>
              <option value="operativa">Operativa</option>
              <option value="operativa_con_observaciones">Operativa con observaciones</option>
              <option value="fuera_de_servicio">Fuera de servicio</option>
            </select>
          </label>
          <button v-if="localId || maquinaId || tipo || estado" type="button"
            class="px-2 py-2 text-sm font-semibold text-blue-700 hover:underline"
            @click="localId = ''; maquinaId = ''; tipo = ''; estado = ''">
            Limpiar filtros
          </button>
          <p role="status" class="py-2 text-sm text-slate-500">{{ cargando ? 'Buscando mantenciones…' : '' }}</p>
        </div>
        <div :aria-busy="cargando" class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table class="w-full text-left text-sm text-slate-800">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" class="p-3">Finalizada (Chile)</th>
                <th scope="col" class="p-3">Local registrado</th>
                <th scope="col" class="p-3">Máquina</th>
                <th scope="col" class="p-3">Tipo</th>
                <th scope="col" class="p-3">Estado final</th>
                <th scope="col" class="p-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in filas" :key="fila.id" class="border-t border-slate-100">
                <td class="p-3 whitespace-nowrap">{{ fechaMantencion(fila.finalizada_at) }}</td>
                <td class="p-3">{{ fila.local?.nombre ?? 'No disponible' }}</td>
                <td class="p-3">
                  {{ fila.maquina?.nombre ?? 'No disponible' }}
                  <span v-if="fila.maquina?.codigo_interno" class="block text-xs text-slate-500">
                    {{ fila.maquina.codigo_interno }}
                  </span>
                </td>
                <td class="p-3">{{ etiquetaMantencion(fila.tipo) }}</td>
                <td class="p-3">{{ etiquetaMantencion(fila.estado_equipo_final) }}</td>
                <td class="p-3">
                  <button type="button" class="font-semibold text-blue-700 hover:underline"
                    :aria-label="`Ver detalle de ${fila.maquina?.nombre ?? 'mantención'} · ${fechaMantencion(fila.finalizada_at)}`"
                    @click="seleccion = fila">Ver detalle</button>
                </td>
              </tr>
              <tr v-if="!filas.length && !error">
                <td colspan="6" class="p-8 text-center text-slate-600">No hay registros para estos filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav v-if="total" aria-label="Paginación de mantenciones"
          class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p aria-live="polite">Página {{ pagina }} de {{ paginas }} · {{ total }} registros</p>
          <div class="flex gap-2">
            <button type="button" :disabled="cargando || pagina <= 1" @click="cargar(pagina - 1)"
              class="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50">Anterior</button>
            <button type="button" :disabled="cargando || pagina >= paginas" @click="cargar(pagina + 1)"
              class="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50">Siguiente</button>
          </div>
        </nav>
      </template>
    </template>
    <MantencionDetalle v-if="seleccion" :fila="seleccion" @cerrar="seleccion = null" />
  </section>
</template>
