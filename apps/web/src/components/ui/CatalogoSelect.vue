<script setup lang="ts">
import type { UbicacionOpcion } from '../../types/ubicaciones'

const model = defineModel<string>({ required: true })
withDefaults(defineProps<{
  id: string
  label: string
  opciones: UbicacionOpcion[]
  placeholder: string
  mensajeVacio: string
  cargando?: boolean
  error?: string
  deshabilitado?: boolean
}>(), { cargando: false, error: '', deshabilitado: false })
defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div>
    <label :for="id" class="block text-sm font-semibold">{{ label }}</label>
    <select :id="id" v-model="model" required :aria-describedby="`${id}-ayuda`"
      :disabled="deshabilitado || cargando || !opciones.length"
      class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
      <option disabled value="">{{ cargando ? 'Cargando…' : placeholder }}</option>
      <option v-for="opcion in opciones" :key="opcion.id" :value="opcion.id">{{ opcion.nombre }}</option>
    </select>
    <div :id="`${id}-ayuda`">
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">{{ error }}</p>
      <p v-else-if="cargando" role="status" class="mt-2 text-xs text-slate-500">Cargando opciones…</p>
      <p v-else-if="!opciones.length" class="mt-2 text-xs text-slate-500">{{ mensajeVacio }}</p>
    </div>
    <button v-if="error" type="button" :disabled="cargando || deshabilitado" @click="$emit('reintentar')"
      class="mt-2 text-sm font-semibold text-blue-600 underline disabled:opacity-50">Reintentar</button>
  </div>
</template>
