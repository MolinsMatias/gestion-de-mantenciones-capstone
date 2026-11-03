<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
    nombre: string
    codigo: string
    eliminando: boolean
    error?: string
}>()

const emit = defineEmits<{ cancelar: []; confirmar: [] }>()
const dialogo = ref<HTMLDialogElement | null>(null)

onMounted(() => dialogo.value?.showModal())

function cancelar(): void {
    if (!props.eliminando) emit('cancelar')
}
</script>

<template>
    <Teleport to="body">
        <dialog ref="dialogo" aria-labelledby="eliminar-maquina-titulo"
            class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-950/50"
            @cancel.prevent="cancelar">
            <h2 id="eliminar-maquina-titulo" class="text-lg font-bold text-slate-900">
                ¿Eliminar la máquina?
            </h2>

            <p class="mt-2 text-sm text-slate-600">
                Vas a eliminar <strong>{{ nombre }}</strong> ({{ codigo }}).
                Si tiene historial asociado, el sistema impedirá la eliminación.
            </p>

            <p v-if="error" role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {{ error }}
            </p>

            <div class="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" autofocus :disabled="eliminando"
                    class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50" @click="cancelar">
                    Cancelar
                </button>

                <button type="button" :disabled="eliminando"
                    class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    @click="emit('confirmar')">
                    {{ eliminando ? 'Eliminando…' : 'Sí, eliminar' }}
                </button>
            </div>
        </dialog>
    </Teleport>
</template>