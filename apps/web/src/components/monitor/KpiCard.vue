<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(defineProps<{
  label: string
  value: number | null
  icon: Component
  principal?: boolean
}>(), { principal: false })
</script>

<template>
  <article class="rounded-2xl border p-6 shadow-sm"
    :class="principal
      ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-600/20'
      : 'border-slate-200 bg-white text-slate-900'">
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm font-semibold" :class="principal ? 'text-blue-100' : 'text-slate-500'">
        {{ label }}
      </p>
      <component :is="icon" class="size-7 shrink-0"
        :class="principal ? 'text-blue-100' : 'text-blue-600'" aria-hidden="true" />
    </div>
    <p class="mt-5 text-4xl font-extrabold">{{ value ?? '—' }}</p>
  </article>
</template>
