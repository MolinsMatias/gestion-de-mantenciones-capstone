<script setup lang="ts">
import { BuildingStorefrontIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import type { ResumenLocal } from '../../types/monitor'

defineProps<{ local: ResumenLocal }>()
defineEmits<{ abrir: [id: string] }>()
</script>

<template>
  <button type="button" :aria-label="`Ver información de ${local.nombre}`" @click="$emit('abrir', local.id)"
    class="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
    <div class="flex items-start justify-between gap-3">
      <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
        <BuildingStorefrontIcon class="size-6 text-blue-600" aria-hidden="true" />
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="local.activo === true ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
        {{ local.activo === true ? 'Activo' : local.activo === false ? 'Inactivo' : 'Sin definir' }}
      </span>
    </div>
    <span class="mt-4 block font-bold text-slate-900">{{ local.nombre }}</span>
    <p class="mt-1 text-sm text-slate-500">{{ local.direccion || 'Dirección no registrada' }}</p>
    <div class="mt-5 border-t border-slate-100 pt-4">
      <p class="text-sm text-slate-600">
        <span class="font-bold text-slate-900">{{ local.activas }} / {{ local.total }}</span>
        máquinas activas en el catálogo
      </p>
    </div>
    <span class="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600">
      Ver información <ArrowTopRightOnSquareIcon class="size-4" aria-hidden="true" />
    </span>
  </button>
</template>
