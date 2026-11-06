<script setup lang="ts">
withDefaults(defineProps<{
  mensaje?: string
  variante?: 'tarjetas' | 'tabla'
}>(), {
  mensaje: 'Cargando sección…',
  variante: 'tabla',
})
</script>

<template>
  <section class="my-4">
    <p role="status" class="mb-3 text-sm text-slate-600">{{ mensaje }}</p>

    <div
      v-if="variante === 'tarjetas'"
      aria-hidden="true"
      class="grid gap-4 motion-safe:animate-pulse sm:grid-cols-2 xl:grid-cols-3"
    >
      <div v-for="n in 6" :key="n" class="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div class="h-9 w-9 rounded-xl bg-blue-100" />
        <div class="h-4 w-3/5 rounded bg-slate-200" />
        <div class="h-3 w-4/5 rounded bg-slate-100" />
        <div class="h-3 w-2/5 rounded bg-slate-100" />
      </div>
    </div>

    <div v-else aria-hidden="true" class="rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse">
      <div class="border-b border-slate-200 px-5 py-4">
        <div class="h-3 w-28 rounded bg-slate-200" />
      </div>
      <div v-for="n in 5" :key="n" class="flex items-center gap-4 px-5 py-4"
        :class="{ 'border-b border-slate-100': n < 5 }">
        <div class="h-8 w-8 shrink-0 rounded-lg bg-blue-100" />
        <div class="h-3 w-2/5 rounded bg-slate-200" />
        <div class="hidden h-3 w-1/5 rounded bg-slate-100 sm:block" />
        <div class="ml-auto h-5 w-14 shrink-0 rounded-full bg-slate-100" />
      </div>
    </div>
  </section>
</template>
