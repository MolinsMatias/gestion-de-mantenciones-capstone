<script setup lang="ts">
import type { OpcionesInforme } from '../../types/exportacion'
const props = defineProps<{ modelValue: OpcionesInforme; deshabilitado: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [valor: OpcionesInforme] }>()
function actualizar(campo: keyof OpcionesInforme, evento: Event) {
  emit('update:modelValue', { ...props.modelValue, [campo]: (evento.target as HTMLInputElement | HTMLTextAreaElement).value })
}
</script>
<template>
  <fieldset :disabled="deshabilitado" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 disabled:opacity-60">
    <legend class="px-2 text-lg font-bold text-slate-900">Contenido del informe</legend>
    <p class="text-sm text-slate-500">Datos complementarios de esta descarga. No se guardan en la base de datos.</p>
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="grid gap-1 text-sm text-slate-700">N.º de orden
        <input :value="modelValue.orden" maxlength="60" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" @input="actualizar('orden', $event)" />
      </label>
      <label class="grid gap-1 text-sm text-slate-700">Encargado del local
        <input :value="modelValue.encargado" maxlength="180" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" @input="actualizar('encargado', $event)" />
      </label>
    </div>
    <label class="grid gap-1 text-sm text-slate-700">Recomendaciones
      <textarea :value="modelValue.recomendaciones" rows="4" maxlength="4000" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" @input="actualizar('recomendaciones', $event)" />
    </label>
    <label class="grid gap-1 text-sm text-slate-700">Conclusiones
      <textarea :value="modelValue.conclusiones" rows="4" maxlength="4000" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" @input="actualizar('conclusiones', $event)" />
    </label>
    <label class="grid gap-1 text-sm text-slate-700">Responsable del informe
      <input :value="modelValue.responsable" maxlength="180" class="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" @input="actualizar('responsable', $event)" />
    </label>
  </fieldset>
</template>
