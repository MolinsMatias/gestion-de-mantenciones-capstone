<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  ArrowRightStartOnRectangleIcon, CubeIcon, ChartBarSquareIcon,
} from '@heroicons/vue/24/outline'

defineProps<{ saliendo: boolean; error: string }>()
defineEmits<{ salir: [] }>()
</script>

<template>
  <aside class="flex flex-col bg-navy-900 px-5 py-6 text-white lg:fixed lg:inset-y-0 lg:w-64">
    <div class="flex items-center gap-3 px-2">
      <img src="@/assets/images/logo.png" alt="Bowling Services" class="size-20" />
      <div>
        <p class="font-bold">Bowling Services</p>
        <p class="text-xs text-slate-400">Panel administrador</p>
      </div>
    </div>
    <nav class="mt-8" aria-label="Navegación principal">
      <RouterLink to="/monitor" class="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold"
        active-class="bg-blue-600 shadow-lg shadow-blue-950/30">
        <ChartBarSquareIcon class="size-5" aria-hidden="true" />Monitor
      </RouterLink>
      <RouterLink to="/maquinas" class="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 font-semibold"
        active-class="bg-blue-600 shadow-lg shadow-blue-950/30">
        <CubeIcon class="size-5" aria-hidden="true" />
        Máquinas y QR
      </RouterLink>
    </nav>
    <div class="mt-6 lg:mt-auto">
      <p v-if="error" role="alert" class="mb-3 px-2 text-sm text-red-300">{{ error }}</p>
      <button type="button" :disabled="saliendo" @click="$emit('salir')"
        class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
        <ArrowRightStartOnRectangleIcon class="size-5" aria-hidden="true" />
        {{ saliendo ? 'Cerrando sesión…' : 'Cerrar sesión' }}
      </button>
    </div>
  </aside>
</template>
