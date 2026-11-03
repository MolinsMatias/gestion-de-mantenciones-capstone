<script setup lang="ts">
import { computed } from 'vue'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'
import LocalDeleteConfirm from './LocalDeleteConfirm.vue'
import type { LocalDetalle } from '../../types/detalle-local'
import type { MaquinaMonitor } from '../../types/monitor'

const props = defineProps<{
  local: LocalDetalle
  guardando: boolean
  mostrandoConfirmacion: boolean
  maquinasActivas: MaquinaMonitor[]
}>()

defineEmits<{
  editar: []
  recargar: []
  mostrarConfirmacion: []
  cancelarConfirmacion: []
  confirmarEliminacion: []
}>()

const fechaRegistro = computed(() => {
  const fecha = props.local.created_at ? new Date(props.local.created_at) : null
  return fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })
    : 'Sin registro'
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between gap-4">
      <h3 class="text-xl font-bold">{{ local.nombre }}</h3>
      <span class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="local.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
        {{ local.activo === true ? 'Activo' : local.activo === false ? 'Inactivo' : 'Sin definir' }}
      </span>
    </div>

    <dl class="grid gap-5 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
      <div class="sm:col-span-2">
        <dt class="text-slate-500">Dirección</dt>
        <dd class="mt-1 font-medium">{{ local.direccion || 'Sin registrar' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">País</dt>
        <dd class="mt-1 font-medium">{{ local.pais?.nombre || 'Sin registrar' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">Región</dt>
        <dd class="mt-1 font-medium">{{ local.region?.nombre || 'Sin registrar' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">Comuna</dt>
        <dd class="mt-1 font-medium">{{ local.comuna?.nombre || 'Sin registrar' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">Prefijo de máquinas</dt>
        <dd class="mt-1 font-medium">{{ local.prefijo || 'Sin registrar' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">Fecha de registro</dt>
        <dd class="mt-1 font-medium">{{ fechaRegistro }}</dd>
      </div>
    </dl>
    <section v-if="local.activo === true" class="space-y-2">
      <h3 class="font-semibold text-slate-900">
        Máquinas activas ({{ maquinasActivas.length }})
      </h3>

      <ul v-if="maquinasActivas.length" class="max-h-52 divide-y divide-slate-100 overflow-y-auto">
        <li v-for="maquina in maquinasActivas" :key="maquina.id" class="py-2 text-sm">
          {{ maquina.nombre }}
          <span class="text-slate-500">· {{ maquina.codigo_interno }}</span>
        </li>
      </ul>

      <p v-else class="text-sm text-slate-500">Este local no tiene máquinas activas.</p>
    </section>

    <LocalDeleteConfirm v-if="mostrandoConfirmacion" :nombre="local.nombre" :guardando="guardando"
      @cancelar="$emit('cancelarConfirmacion')" @confirmar="$emit('confirmarEliminacion')" />

    <div class="flex flex-wrap justify-end gap-3">
      <button type="button" :disabled="guardando"
        class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        @click="$emit('recargar')">
        Recargar ficha
      </button>

      <button type="button" :disabled="guardando"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        @click="$emit('editar')">
        <PencilSquareIcon class="size-5" aria-hidden="true" />
        Editar
      </button>

      <button type="button" :disabled="guardando"
        class="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        @click="$emit('mostrarConfirmacion')">
        Eliminar local
      </button>
    </div>
  </div>
</template>
