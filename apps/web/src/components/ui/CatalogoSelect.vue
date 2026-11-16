<script setup lang="ts">
import Select from 'primevue/select'
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
  appendTo?: string | HTMLElement
}>(), { cargando: false, error: '', deshabilitado: false, appendTo: 'self' })
defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div>
    <label :for="id" class="block text-sm font-semibold">{{ label }}</label>
    <Select :id="id" :input-id="id" v-model="model" :options="opciones" option-label="nombre" option-value="id"
      :placeholder="cargando ? 'Cargando…' : placeholder"
      :disabled="deshabilitado || cargando || !opciones.length"
      :loading="cargando"
      :invalid="Boolean(error)"
      filter
      filter-placeholder="Buscar…"
      :empty-message="mensajeVacio || 'No hay opciones disponibles'"
      empty-filter-message="No se encontraron coincidencias"
      :append-to="appendTo"
      :aria-describedby="`${id}-ayuda`"
      class="mt-2 w-full" />
    <div :id="`${id}-ayuda`">
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">{{ error }}</p>
      <p v-else-if="cargando" role="status" class="mt-2 text-xs text-slate-500">Cargando opciones…</p>
      <p v-else-if="!opciones.length" class="mt-2 text-xs text-slate-500">{{ mensajeVacio }}</p>
    </div>
    <button v-if="error" type="button" :disabled="cargando || deshabilitado" @click="$emit('reintentar')"
      class="mt-2 text-sm font-semibold text-blue-600 underline disabled:opacity-50">Reintentar</button>
  </div>
</template>
