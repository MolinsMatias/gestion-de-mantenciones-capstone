<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number | null
  total?: number | null
  icon: Component
  principal?: boolean
}>(), {
  total: null,
  principal: false,
})

const porcentaje = computed(() => {
  if (
    props.value === null ||
    props.total === null ||
    props.total <= 0
  ) return null

  return Math.min(100, Math.max(0, props.value / props.total * 100))
})

const porcentajeTexto = computed(() => {
  if (porcentaje.value === null) return '—'

  return `${porcentaje.value.toLocaleString('es-CL', {
    maximumFractionDigits: 1,
  })}%`
})

const fondoDona = computed(() => {
  const color = props.principal ? '#ffffff' : '#2563eb'
  const fondo = props.principal ? '#ffffff33' : '#e2e8f0'
  const grados = (porcentaje.value ?? 0) * 3.6

  return {
    background: `conic-gradient(
      ${color} 0deg ${grados}deg,
      ${fondo} ${grados}deg 360deg
    )`,
  }
})
</script>

<template>
  <article class="rounded-2xl border p-6 shadow-sm" :class="principal
    ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-600/20'
    : 'border-slate-200 bg-white text-slate-900'">
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm font-semibold" :class="principal ? 'text-blue-100' : 'text-slate-500'">
        {{ label }}
      </p>

      <component :is="icon" class="size-7 shrink-0" :class="principal ? 'text-blue-100' : 'text-blue-600'"
        aria-hidden="true" />
    </div>

    <div class="mt-5 flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-4xl font-extrabold tracking-tight">
          {{ value ?? '—' }}
          <span v-if="total !== null" class="text-xl font-medium"
            :class="principal ? 'text-blue-100' : 'text-slate-400'">
            / {{ total }}
          </span>
        </p>

        <p v-if="total !== null" class="mt-2 text-xs" :class="principal ? 'text-blue-100' : 'text-slate-500'">
          {{ total === 0 ? 'Sin registros' : 'Del total' }}
        </p>
      </div>

      <div v-if="total !== null" class="flex size-24 shrink-0 items-center justify-center rounded-full"
        :style="fondoDona" aria-hidden="true">
        <div class="flex size-19 items-center justify-center rounded-full text-sm font-bold"
          :class="principal ? 'bg-blue-600' : 'bg-white'">
          {{ porcentajeTexto }}
        </div>
      </div>
    </div>

    <span v-if="porcentaje !== null" class="sr-only">
      {{ porcentajeTexto }} del total
    </span>
  </article>
</template>