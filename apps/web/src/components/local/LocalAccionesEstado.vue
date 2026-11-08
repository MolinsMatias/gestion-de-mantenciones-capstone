<script setup lang="ts">
import { ref } from 'vue'
import {
  gestionarEstadoLocal, obtenerMaquinasPendientes, type AccionLocal,
} from '../../services/ciclo-catalogos.service'

const props = defineProps<{ id: string; activo: boolean | null }>()
const emit = defineEmits<{ actualizado: [activo: boolean]; cerrado: [] }>()
const accion = ref<AccionLocal | null>(null)
const pendientes = ref<Awaited<ReturnType<typeof obtenerMaquinasPendientes>>>([])
const ocupado = ref(false)
const verificado = ref(false)
const error = ref('')
const etiquetas = { suspender: 'Suspender local', reabrir: 'Reabrir local', cerrar: 'Cerrar local' }

async function revisar(siguiente: AccionLocal) {
  accion.value = siguiente
  error.value = ''
  verificado.value = false
  pendientes.value = []
  if (siguiente !== 'cerrar') return
  ocupado.value = true
  try {
    pendientes.value = await obtenerMaquinasPendientes(props.id)
    verificado.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo verificar el cierre.'
  } finally {
    ocupado.value = false
  }
}

async function confirmar() {
  const actual = accion.value
  if (!actual || ocupado.value || (actual === 'cerrar' && (!verificado.value || pendientes.value.length))) return
  ocupado.value = true
  error.value = ''
  try {
    await gestionarEstadoLocal(actual, props.id)
    accion.value = null
    if (actual === 'cerrar') emit('cerrado')
    else emit('actualizado', actual === 'reabrir')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cambiar el estado.'
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <section class="space-y-3 border-t border-slate-200 pt-4" aria-label="Estado del local">
    <div v-if="!accion" class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="revisar(activo === true ? 'suspender' : 'reabrir')">
          {{ activo === true ? etiquetas.suspender : etiquetas.reabrir }}
        </button>
        <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          @click="revisar('cerrar')">{{ etiquetas.cerrar }}</button>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <slot name="acciones-ficha" />
      </div>
    </div>
    <div v-else class="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <p v-if="accion === 'suspender'">El local quedará suspendido. Sus máquinas e historial se conservan.</p>
      <p v-else-if="accion === 'reabrir'">El local volverá a estar disponible para la operación.</p>
      <p v-else-if="ocupado && !verificado" role="status">Verificando máquinas asignadas…</p>
      <template v-else-if="pendientes.length">
        <p>Antes de cerrar, reasigna o retira estas máquinas:</p>
        <ul class="list-disc space-y-1 pl-5">
          <li v-for="m in pendientes" :key="m.id">{{ m.nombre }} · {{ m.codigo_interno }}</li>
        </ul>
      </template>
      <p v-else-if="verificado">El local dejará de aparecer en la operación. Las mantenciones históricas se conservan.</p>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" :disabled="ocupado" class="rounded-lg border border-slate-300 px-3 py-2"
          @click="accion = null">Cancelar</button>
        <button v-if="accion !== 'cerrar' || (verificado && !pendientes.length)" type="button" :disabled="ocupado"
          class="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
          @click="confirmar">{{ etiquetas[accion] }}</button>
      </div>
    </div>
  </section>
</template>
