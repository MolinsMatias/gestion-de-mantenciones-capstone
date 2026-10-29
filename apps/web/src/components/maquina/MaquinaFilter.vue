<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import type { CatalogoOpcion } from '../../types/maquina'

defineProps<{ locales: CatalogoOpcion[]; categorias: CatalogoOpcion[]; deshabilitado: boolean }>()
const busqueda = defineModel<string>('busqueda', { required: true })
const localId = defineModel<string>('localId', { required: true })
const categoriaId = defineModel<string>('categoriaId', { required: true })
const estado = defineModel<'todos' | 'activas' | 'inactivas'>('estado', { required: true })
defineEmits<{ limpiar: [] }>()
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
        <select id="maquinas-local" v-model="localId" :disabled="deshabilitado"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50">
          <option value="">Todos los locales</option>
          <option v-for="local in locales" :key="local.id" :value="local.id">{{ local.nombre }}</option>
        </select>
      </div>
      <div>
        <label for="maquinas-categoria" class="sr-only">Filtrar por categoría</label>
        <select id="maquinas-categoria" v-model="categoriaId" :disabled="deshabilitado"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50">
          <option value="">Todas las categorías</option>
          <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">{{ categoria.nombre }}</option>
        </select>
      </div>
      <div>
        <label for="maquinas-estado" class="sr-only">Filtrar por estado de registro</label>
        <select id="maquinas-estado" v-model="estado" :disabled="deshabilitado"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50">
          <option value="todos">Todos los estados</option>
          <option value="activas">Activas</option>
          <option value="inactivas">Inactivas</option>
        </select>
      </div>
    </div>
    <button type="button" @click="$emit('limpiar')" class="text-sm font-semibold text-blue-600 hover:underline">Limpiar filtros</button>
  </section>
</template>
