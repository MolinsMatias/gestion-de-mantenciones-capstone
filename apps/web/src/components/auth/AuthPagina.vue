<script setup lang="ts">
import { LockClosedIcon } from '@heroicons/vue/24/outline'
defineProps<{ titulo: string; descripcion: string }>()
</script>
<template>
  <main class="grid min-h-screen bg-slate-100 lg:grid-cols-2">
    <section
      class="relative hidden overflow-hidden bg-[#081629] p-14 text-white lg:flex lg:flex-col lg:justify-between"
    >
      <div
        aria-hidden="true"
        class="absolute -right-32 top-20 size-96 rounded-full bg-blue-500/20 blur-3xl"
      />
      <p class="relative text-xl font-bold">Bowling Services</p>
      <div class="relative max-w-lg">
        <p
          class="mb-5 text-sm font-semibold uppercase tracking-widest text-blue-400"
        >
          Gestión de mantenimiento
        </p>
        <h1 class="text-5xl font-bold leading-tight">
          Tu operación,<br />en un solo lugar.
        </h1>
        <p class="mt-6 text-lg leading-relaxed text-slate-300">
          Consulta tus locales, máquinas y registros de mantenimiento.
        </p>
      </div>
      <p class="relative text-sm text-slate-400">
        Panel web · Bowling Services
      </p>
    </section>
    <section class="flex items-center justify-center px-5 py-12">
      <div
        class="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10"
      >
        <div
          class="mb-6 flex size-12 items-center justify-center rounded-2xl bg-blue-50"
        >
          <LockClosedIcon class="size-6 text-blue-600" aria-hidden="true" />
        </div>
        <h1 class="text-3xl font-bold text-slate-900">{{ titulo }}</h1>
        <p class="mt-3 text-sm leading-relaxed text-slate-500">
          {{ descripcion }}
        </p>
        <div class="mt-7"><slot /></div>
      </div>
    </section>
  </main>
</template>
