<script setup lang="ts">
import { computed } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import Select from 'primevue/select'
import type { CatalogoOpcion } from '../../types/maquina'

const props = defineProps<{ locales: CatalogoOpcion[]; categorias: CatalogoOpcion[]; deshabilitado: boolean }>()
const busqueda = defineModel<string>('busqueda', { required: true })
const localId = defineModel<string>('localId', { required: true })
const categoriaId = defineModel<string>('categoriaId', { required: true })
const estado = defineModel<'todos' | 'activas' | 'inactivas'>('estado', { required: true })
defineEmits<{ limpiar: [] }>()

const opcionesLocales = computed(() => [
  { id: '', nombre: 'Todos los locales' },
  ...props.locales,
])

const opcionesCategorias = computed(() => [
  { id: '', nombre: 'Todas las categorías' },
  ...props.categorias,
])

const opcionesEstado = [
  { label: 'Todos los estados', value: 'todos' as const },
  { label: 'Activas', value: 'activas' as const },
  { label: 'Inactivas', value: 'inactivas' as const },
]
</script>

<template>
  <section aria-label="Filtros de máquinas" class="mb-6 space-y-3">
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="relative sm:col-span-2 xl:col-span-1">
        <label for="maquinas-busqueda" class="sr-only">Buscar máquinas</label>
        <MagnifyingGlassIcon class="absolute left-3 top-3.5 size-5 text-slate-400" aria-hidden="true" />
        <input id="maquinas-busqueda" v-model="busqueda" type="search" :disabled="deshabilitado"
          placeholder="Nombre, código, marca…"
          class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50" />
      </div>
      <div>
        <label for="maquinas-local" class="sr-only">Filtrar por local</label>
        <Select id="maquinas-local" input-id="maquinas-local" v-model="localId" :options="opcionesLocales"
          option-label="nombre" option-value="id" placeholder="Todos los locales" filter filter-placeholder="Buscar local…"
          empty-message="No hay locales disponibles" empty-filter-message="No se encontraron coincidencias"
          :disabled="deshabilitado" class="w-full" />
      </div>
      <div>
        <label for="maquinas-categoria" class="sr-only">Filtrar por categoría</label>
        <Select id="maquinas-categoria" input-id="maquinas-categoria" v-model="categoriaId"
          :options="opcionesCategorias" option-label="nombre" option-value="id" placeholder="Todas las categorías" filter
          filter-placeholder="Buscar categoría…" empty-message="No hay categorías disponibles"
          empty-filter-message="No se encontraron coincidencias" :disabled="deshabilitado" class="w-full" />
      </div>
      <div>
        <label for="maquinas-estado" class="sr-only">Filtrar por estado de registro</label>
        <Select id="maquinas-estado" input-id="maquinas-estado" v-model="estado" :options="opcionesEstado"
          option-label="label" option-value="value" placeholder="Todos los estados" :disabled="deshabilitado" class="w-full" />
      </div>
    </div>
    <button type="button" @click="$emit('limpiar')" class="text-sm font-semibold text-blue-600 hover:underline">Limpiar
      filtros</button>
  </section>
</template>
