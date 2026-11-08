<script setup lang="ts">
import { computed } from 'vue'
import type { MaquinaDetalle } from '../../types/maquina'

const props = defineProps<{ maquina: MaquinaDetalle }>()
const campos = computed(() => [
  { nombre: 'Local', valor: props.maquina.localNombre },
  { nombre: 'Categoría', valor: props.maquina.categoriaNombre },
  { nombre: 'Marca', valor: props.maquina.marcaNombre },
  { nombre: 'Modelo', valor: props.maquina.modelo },
])
</script>

<template>
  <section class="space-y-4" aria-label="Datos de inventario">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="break-words text-xl font-bold text-slate-900">{{ maquina.nombre }}</h3>
        <p class="mt-1 break-words text-sm text-slate-600">
          Código de inventario: <span class="font-semibold text-slate-800">{{ maquina.codigo_interno || 'Sin código'
            }}</span>
        </p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="maquina.activo === true ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'">
        {{ maquina.activo === true ? 'Activa' : maquina.activo === false ? 'Inactiva' : 'Sin definir' }}
      </span>
    </div>

    <dl class="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
      <div v-for="campo in campos" :key="campo.nombre" class="min-w-0">
        <dt class="text-slate-500">{{ campo.nombre }}</dt>
        <dd class="mt-1 break-words font-medium text-slate-900">{{ campo.valor || 'Sin registrar' }}</dd>
      </div>
    </dl>

    <details class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
      <summary class="cursor-pointer font-medium">Identificador técnico</summary>
      <p class="mt-2 break-all font-mono text-xs">{{ maquina.id }}</p>
    </details>

    <p class="text-xs text-slate-500">La etiqueta Activa o Inactiva indica el estado en el inventario. El estado
      operativo se consulta en Mantenciones.</p>
  </section>
</template>
