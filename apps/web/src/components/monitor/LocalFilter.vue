<script setup lang="ts">
import { MagnifyingGlassIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { EstadoFiltroLocal } from '../../composables/useFiltroLocal'
const busqueda = defineModel<string>('busqueda', { required: true })
const estado = defineModel<EstadoFiltroLocal>('estado', { required: true })
defineProps<{
  total: number
  encontrados: number
  desde: number
  hasta: number
  pagina: number
  totalPaginas: number
  hayFiltros: boolean
}>()
defineEmits<{ limpiar: []; anterior: []; siguiente: [] }>()
</script>

<template>
  <div class="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
      <div>
        <label for="buscar-locales" class="mb-2 block text-sm font-semibold text-slate-700">Buscar local</label>
        <div class="relative">
          <MagnifyingGlassIcon
            class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true" />
          <input id="buscar-locales" v-model="busqueda" type="search" placeholder="Nombre o dirección…"
            autocomplete="off" aria-controls="lista-locales"
            class="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
      </div>
      <div>
        <label for="estado-locales" class="mb-2 block text-sm font-semibold text-slate-700">Estado del local</label>
        <select id="estado-locales" v-model="estado" aria-controls="lista-locales"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="sin-definir">Sin definir</option>
        </select>
      </div>
      <button type="button" :disabled="!hayFiltros" @click="$emit('limpiar')"
        class="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-default disabled:opacity-40">
        <XMarkIcon class="size-4" aria-hidden="true" />Limpiar
      </button>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p role="status" aria-live="polite" aria-atomic="true" class="text-xs text-slate-500">
        {{ encontrados ? `Mostrando ${desde}–${hasta} de ${encontrados}` : 'Sin coincidencias' }} · {{ total }} locales
        en total
      </p>
      <nav v-if="totalPaginas > 1" aria-label="Páginas de locales" class="flex items-center gap-3">
        <button type="button" aria-label="Página anterior de locales" :disabled="pagina <= 1" @click="$emit('anterior')"
          class="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40">
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
        </button>
        <span class="text-xs font-medium text-slate-600">{{ pagina }} / {{ totalPaginas }}</span>
        <button type="button" aria-label="Página siguiente de locales" :disabled="pagina >= totalPaginas"
          @click="$emit('siguiente')"
          class="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40">
          <ChevronRightIcon class="size-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </div>
</template>
