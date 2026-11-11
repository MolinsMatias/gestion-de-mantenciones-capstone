<script setup lang="ts">
import Dialog from 'primevue/dialog'
import type { UsuarioListado } from '../../services/usuarios.service'

defineProps<{ usuario: UsuarioListado | null; fechaRegistro: string }>()
const visible = defineModel<boolean>('visible', { required: true })
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    block-scroll
    header="Perfil de usuario"
    :style="{ width: 'min(32rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
  >
    <div v-if="usuario" class="space-y-4 text-slate-900">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h3 class="min-w-0 break-words text-xl font-bold">{{ usuario.nombre || 'Sin nombre' }}</h3>
        <span class="rounded-full px-3 py-1 text-xs font-semibold"
          :class="usuario.activo === true ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'">
          {{ usuario.activo === true ? 'Activo' : usuario.activo === false ? 'Inactivo' : 'Sin definir' }}
        </span>
      </div>
      <dl class="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-slate-600">Rol</dt>
          <dd class="mt-1 break-words font-semibold">{{ usuario.rol || 'Sin rol' }}</dd>
        </div>
        <div>
          <dt class="text-slate-600">Fecha de registro (Chile)</dt>
          <dd class="mt-1 font-semibold">{{ fechaRegistro }}</dd>
        </div>
      </dl>
    </div>
    <template #footer>
      <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="visible = false">Cerrar</button>
    </template>
  </Dialog>
</template>
