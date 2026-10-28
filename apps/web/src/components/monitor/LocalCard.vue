<script setup lang="ts">
import { BuildingStorefrontIcon } from '@heroicons/vue/24/outline'
import type { ResumenLocal } from '../../types/monitor'

defineProps<{ local: ResumenLocal }>()
</script>

<template>
  <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div class="flex items-start justify-between gap-3">
      <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
        <BuildingStorefrontIcon class="size-6 text-blue-600" aria-hidden="true" />
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="local.activo === true ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
        {{ local.activo === true ? 'Activo' : local.activo === false ? 'Inactivo' : 'Sin definir' }}
      </span>
    </div>
    <h3 class="mt-4 font-bold text-slate-900">{{ local.nombre }}</h3>
    <p class="mt-1 text-sm text-slate-500">{{ local.direccion || 'Dirección no registrada' }}</p>
    <div class="mt-5 border-t border-slate-100 pt-4">
      <p class="text-sm text-slate-600">
        <span class="font-bold text-slate-900">{{ local.activas }} / {{ local.total }}</span>
        máquinas activas en el catálogo
      </p>
    </div>
  </article>
</template>
