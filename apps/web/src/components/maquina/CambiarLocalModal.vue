<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
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

const destinoId = ref('')
const guardando = ref(false)
const error = ref('')
const destinos = computed(() =>
  props.locales.filter(local => local.id !== props.maquina.local_id),
)
const destinoValido = computed(() =>
  destinos.value.some(local => local.id === destinoId.value),
)

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
  <Dialog :visible="true" modal block-scroll :draggable="false" :closable="!guardando" :close-on-escape="!guardando"
    :dismissable-mask="!guardando" header="Cambiar local"
    :style="{ width: 'min(30rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
    @update:visible="visible => { if (!visible) cancelar() }">
    <div class="py-2">
      <form id="form-cambiar-local" class="space-y-4" :aria-busy="guardando" @submit.prevent="guardar">
        <p class="text-sm text-slate-600">
          <strong>{{ maquina.nombre }}</strong> · {{ maquina.codigo_interno }}
        </p>
        <p class="text-sm text-slate-600">Ubicación actual: {{ maquina.localNombre }}</p>

        <label for="local-destino" class="block text-sm font-semibold text-slate-900">
          Local de destino
          <Select id="local-destino" input-id="local-destino" v-model="destinoId" :options="destinos"
            option-label="nombre" option-value="id" placeholder="Selecciona un local" filter
            filter-placeholder="Buscar local…" empty-message="No hay locales disponibles"
            empty-filter-message="No se encontraron coincidencias" :disabled="guardando || !destinos.length"
            class="mt-1 w-full" />
        </label>

        <p v-if="!destinos.length" class="text-sm text-slate-500">No hay otro local disponible.</p>
        <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      </form>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" :disabled="guardando"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          @click="cancelar">
          Cancelar
        </button>
        <button type="submit" form="form-cambiar-local" :disabled="guardando || !destinoValido"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {{ guardando ? 'Guardando…' : 'Confirmar traslado' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>
