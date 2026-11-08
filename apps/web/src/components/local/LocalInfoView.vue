<script setup lang="ts">
import { computed } from 'vue'
import type { LocalDetalle } from '../../types/detalle-local'
import type { MaquinaMonitor } from '../../types/monitor'

const props = defineProps<{
  local: LocalDetalle
  maquinasActivas: (MaquinaMonitor & { nombre?: string | null; codigo_interno?: string | null })[]
}>()

const campos = computed(() => {
  const fecha = props.local.created_at ? new Date(props.local.created_at) : null
  return [
    { etiqueta: 'Dirección', valor: props.local.direccion },
    { etiqueta: 'País', valor: props.local.pais?.nombre },
    { etiqueta: 'Región', valor: props.local.region?.nombre },
    { etiqueta: 'Comuna', valor: props.local.comuna?.nombre },
    { etiqueta: 'Prefijo de máquinas', valor: props.local.prefijo },
    { etiqueta: 'Fecha de registro', valor: fecha && Number.isFinite(fecha.getTime())
      ? fecha.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }) : null },
  ]
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="break-words text-xl font-bold">{{ local.nombre }}</h3>
      <span class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="local.activo === true ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'">
        {{ local.activo === true ? 'Activo' : local.activo === false ? 'Suspendido' : 'Sin definir' }}
      </span>
    </div>

    <dl class="grid gap-x-6 gap-y-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 sm:p-5">
      <div v-for="(campo, indice) in campos" :key="campo.etiqueta" :class="{ 'sm:col-span-2': indice === 0 }">
        <dt class="text-slate-500">{{ campo.etiqueta }}</dt>
        <dd class="mt-1 break-words font-medium">{{ campo.valor || 'Sin registrar' }}</dd>
      </div>
    </dl>

    <section v-if="local.activo === true" aria-label="Máquinas activas">
      <h4 class="font-semibold">Máquinas activas ({{ maquinasActivas.length }})</h4>
      <ul v-if="maquinasActivas.length" class="mt-2 divide-y divide-slate-100 text-sm">
        <li v-for="maquina in maquinasActivas" :key="maquina.id" class="flex flex-wrap gap-x-2 py-2">
          <span>{{ maquina.nombre || 'Máquina' }}</span>
          <span v-if="maquina.codigo_interno" class="text-slate-500">{{ maquina.codigo_interno }}</span>
        </li>
      </ul>
      <p v-else class="mt-2 text-sm text-slate-500">Este local no tiene máquinas activas.</p>
    </section>
  </div>
</template>
