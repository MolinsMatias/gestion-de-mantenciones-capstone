<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CatalogoOpcion, MaquinaDetalle } from '../../types/maquina'
import { reasignarMaquina } from '../../services/maquina.service'

const props = defineProps<{
  maquina: MaquinaDetalle
  locales: CatalogoOpcion[]
}>()

const emit = defineEmits<{
  cancelar: []
  reasignada: [maquinaId: string, localId: string]
}>()

const dialogo = ref<HTMLDialogElement | null>(null)
const destinoId = ref('')
const guardando = ref(false)
const error = ref('')
const destinos = computed(() =>
  props.locales.filter(local => local.id !== props.maquina.local_id),
)
const destinoValido = computed(() =>
  destinos.value.some(local => local.id === destinoId.value),
)

onMounted(() => dialogo.value?.showModal())

function cancelar(): void {
  if (!guardando.value) emit('cancelar')
}

async function guardar(): Promise<void> {
  if (guardando.value || !destinoValido.value) return

  const { id, local_id } = props.maquina
  const destino = destinoId.value
  guardando.value = true
  error.value = ''
  try {
    await reasignarMaquina(id, local_id, destino)
    emit('reasignada', id, destino)
  } catch (causa: unknown) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo cambiar el local.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      aria-labelledby="cambiar-local-titulo"
      class="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl backdrop:bg-slate-950/50"
      @cancel.prevent="cancelar"
    >
      <h2 id="cambiar-local-titulo" class="text-lg font-bold text-slate-900">Cambiar local</h2>

      <form class="mt-4 space-y-4" :aria-busy="guardando" @submit.prevent="guardar">
        <p class="text-sm text-slate-600">
          <strong>{{ maquina.nombre }}</strong> · {{ maquina.codigo_interno }}
        </p>
        <p class="text-sm text-slate-600">Ubicación actual: {{ maquina.localNombre }}</p>

        <label class="block text-sm font-semibold text-slate-900">
          Local de destino
          <select
            v-model="destinoId"
            required
            :disabled="guardando || !destinos.length"
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
          >
            <option value="" disabled>Selecciona un local</option>
            <option v-for="local in destinos" :key="local.id" :value="local.id">
              {{ local.nombre }}
            </option>
          </select>
        </label>

        <p v-if="!destinos.length" class="text-sm text-slate-500">No hay otro local disponible.</p>
        <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>

        <div class="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            :disabled="guardando"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            @click="cancelar"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando || !destinoValido"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {{ guardando ? 'Guardando…' : 'Guardar traslado' }}
          </button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
