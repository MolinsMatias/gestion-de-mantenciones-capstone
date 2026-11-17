<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
withDefaults(
  defineProps<{
    id: string
    etiqueta: string
    modelValue: string
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [valor: string] }>()
const visible = ref(false)
</script>
<template>
  <div>
    <label :for="id" class="block text-sm font-semibold text-slate-700">{{
      etiqueta
    }}</label>
    <div class="relative mt-2">
      <input
        :id="id"
        :value="modelValue"
        :type="visible ? 'text' : 'password'"
        autocomplete="new-password"
        required
        minlength="6"
        maxlength="72"
        :disabled="disabled"
        class="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-12 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      />
      <button
        type="button"
        :disabled="disabled"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="visible"
        class="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-blue-600"
        @click="visible = !visible"
      >
        <EyeSlashIcon
          v-if="visible"
          class="size-5"
          aria-hidden="true"
        /><EyeIcon v-else class="size-5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
