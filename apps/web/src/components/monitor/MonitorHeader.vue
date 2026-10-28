<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

defineProps<{ cargando: boolean }>()
defineEmits<{ actualizar: [] }>()
</script>

<template>
  <header class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div>
      <p class="text-xs font-bold uppercase tracking-widest text-blue-600">Resumen general</p>
      <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Monitor de locales</h1>
      <p class="mt-2 text-sm text-slate-500">Información de tus locales y máquinas.</p>
    </div>
    <button type="button" :disabled="cargando" @click="$emit('actualizar')"
      class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
      <ArrowPathIcon class="size-5" :class="{ 'animate-spin': cargando }" aria-hidden="true" />
      {{ cargando ? 'Actualizando…' : 'Actualizar' }}
    </button>
  </header>
</template>
