<script setup lang="ts">
defineProps<{
  nombre: string
  guardando: boolean
}>()

defineEmits<{
  cancelar: []
  confirmar: []
}>()
</script>

<template>
  <section
    class="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5"
    aria-labelledby="confirmar-eliminacion-titulo"
  >
    <h3 id="confirmar-eliminacion-titulo" class="font-semibold text-red-900">
      ¿Eliminar el local «{{ nombre }}»?
    </h3>

    <p class="text-sm text-red-800">
      Esta acción no se puede deshacer. Si el local tiene equipos o mantenciones
      asociados, no se podrá eliminar.
    </p>

    <div class="flex justify-end gap-3">
      <button
        type="button"
        :disabled="guardando"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        @click="$emit('cancelar')"
      >
        Cancelar
      </button>

      <button
        type="button"
        :disabled="guardando"
        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        @click="$emit('confirmar')"
      >
        {{ guardando ? 'Eliminando…' : 'Sí, eliminar' }}
      </button>
    </div>
  </section>
</template>

