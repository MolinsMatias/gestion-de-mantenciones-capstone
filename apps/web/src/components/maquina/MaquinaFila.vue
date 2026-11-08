<script setup lang="ts">
import { CubeIcon } from '@heroicons/vue/24/outline'
import type { MaquinaDetalle } from '../../types/maquina'

defineProps<{ maquina: MaquinaDetalle; seleccionada: boolean }>()
defineEmits<{ seleccionar: [id: string] }>()
</script>

<template>
  <tr class="border-t border-slate-100 transition-colors"
    :class="seleccionada ? 'bg-blue-50' : 'hover:bg-slate-50'">
    <td class="px-5 py-4">
      <button type="button" :aria-pressed="seleccionada" @click="$emit('seleccionar', maquina.id)"
        class="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
        <span class="rounded-xl bg-blue-100 p-2 text-blue-600"><CubeIcon class="size-5" aria-hidden="true" /></span>
        <span>
          <span class="block font-bold text-slate-900">{{ maquina.nombre }}</span>
          <span class="mt-1 block text-xs text-slate-500">{{ maquina.codigo_interno }} · {{ maquina.marcaNombre }}</span>
        </span>
      </button>
    </td>
    <td class="px-4 py-4 text-sm text-slate-600">{{ maquina.categoriaNombre }}</td>
    <td class="px-4 py-4 text-sm text-slate-600">{{ maquina.localNombre }}</td>
    <td class="px-4 py-4">
      <span class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
        :class="maquina.activo === true ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
        {{ maquina.activo === true ? 'Activa' : maquina.activo === false ? 'Inactiva' : 'Sin definir' }}
      </span>
    </td>
  </tr>
</template>
