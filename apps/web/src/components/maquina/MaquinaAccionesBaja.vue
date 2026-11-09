<script setup lang="ts">
import { computed, ref } from 'vue'
import { cambiarEstadoMaquina, retirarMaquina } from '../../services/maquina.service'


type Accion = 'desactivar' | 'reactivar' | 'retirar'
const props = defineProps<{ id: string; nombre: string; activo: boolean | null }>()
const emit = defineEmits<{ completado: [accion: Accion, id: string]; ocupado: [valor: boolean] }>()
const accion = ref<Accion | null>(null)
const ocupado = ref(false)
const error = ref('')
const cambioEstado = computed(() => props.activo === true ? 'desactivar' : 'reactivar')
const etiquetas = { desactivar: 'Desactivar', reactivar: 'Reactivar', retirar: 'Retirar del inventario' }
const detalle = {
  desactivar: 'La máquina seguirá en el inventario como inactiva. Podrás reactivarla más adelante.',
  reactivar: 'La máquina volverá a quedar activa en el inventario.',
  retirar: 'La máquina dejará de aparecer en el inventario habitual. Su código y su historial se conservarán.',
}

function elegir(valor: Accion | null) {
  if (ocupado.value) return
  accion.value = valor
  error.value = ''
}

async function confirmar() {
  const actual = accion.value
  if (!actual || ocupado.value) return
  const id = props.id
  ocupado.value = true
  emit('ocupado', true)
  error.value = ''
  try {
    if (actual === 'retirar') await retirarMaquina(id)
    else await cambiarEstadoMaquina(id, actual === 'reactivar')
    accion.value = null
    emit('completado', actual, id)
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo realizar la acción.'
  } finally {
    ocupado.value = false
    emit('ocupado', false)
  }
}
</script>

<template>
  <section aria-label="Estado de la máquina" :aria-busy="ocupado" class="border-t border-slate-200 pt-4">
    <div v-if="!accion" class="flex flex-wrap gap-2">
      <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        @click="elegir(cambioEstado)">{{ etiquetas[cambioEstado] }}</button>
      <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        @click="elegir('retirar')">Retirar del inventario</button>
      <button></button>
    </div>
    <div v-else class="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <p class="font-semibold">{{ etiquetas[accion] }}: {{ nombre }}</p>
      <p>{{ detalle[accion] }}</p>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" :disabled="ocupado" class="rounded-lg border border-slate-300 px-3 py-2"
          @click="elegir(null)">Cancelar</button>
        <button type="button" :disabled="ocupado"
          class="rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50"
          :class="accion === 'retirar' ? 'bg-red-700' : 'bg-blue-700'" @click="confirmar">
          {{ ocupado ? 'Procesando…' : etiquetas[accion] }}
        </button>
      </div>
    </div>
  </section>
</template>
