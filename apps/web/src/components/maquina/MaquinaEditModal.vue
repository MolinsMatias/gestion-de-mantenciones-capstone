<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import Select from 'primevue/select'
import { obtenerOpcionesCrearMaquina } from '../../services/crear-maquina.service'
import type { CambiosMaquina } from '../../services/maquina.service'
import type { CatalogoOpcion, MaquinaDetalle } from '../../types/maquina'

const props = defineProps<{
    maquina: MaquinaDetalle
    guardando: boolean
    errorGuardar?: string
}>()

const emit = defineEmits<{
    guardar: [cambios: CambiosMaquina]
    cancelar: []
}>()

const borrador = reactive({
    nombre: props.maquina.nombre,
    categoriaId: props.maquina.categoria_id,
    marcaId: props.maquina.marca_id ?? '',
    modelo: props.maquina.modelo ?? '',
    estado: props.maquina.activo === null ? '' : String(props.maquina.activo),
})

const categorias = ref<CatalogoOpcion[]>([])
const marcas = ref<CatalogoOpcion[]>([])
const cargando = ref(false)
const errorCatalogos = ref('')
const errorFormulario = ref('')
const solicitud = new AbortController()
const campo = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'

const opcionesMarcas = computed(() => [
    { id: '', nombre: 'Sin marca' },
    ...marcas.value,
])

const opcionesEstado = [
    { label: 'Sin definir', value: '' },
    { label: 'Activa', value: 'true' },
    { label: 'Inactiva', value: 'false' },
]

function conservarOpcionActual(opciones: CatalogoOpcion[], id: string | null, nombre: string) {
    if (!id || opciones.some(opcion => opcion.id === id)) return opciones
    return [{ id, nombre: nombre + ' (actual)' }, ...opciones]
}

async function cargarCatalogos(): Promise<void> {
    if (cargando.value) return
    cargando.value = true
    errorCatalogos.value = ''
    try {
        const opciones = await obtenerOpcionesCrearMaquina(solicitud.signal)
        if (solicitud.signal.aborted) return
        categorias.value = conservarOpcionActual(
            opciones.categorias, props.maquina.categoria_id, props.maquina.categoriaNombre,
        )
        marcas.value = conservarOpcionActual(
            opciones.marcas, props.maquina.marca_id, props.maquina.marcaNombre,
        )
    } catch (error: unknown) {
        if (!solicitud.signal.aborted) {
            errorCatalogos.value = error instanceof Error ? error.message : 'No se pudieron cargar los catálogos.'
        }
    } finally {
        if (!solicitud.signal.aborted) cargando.value = false
    }
}

const dialogo = ref<HTMLDialogElement | null>(null)
onMounted(() => {
    dialogo.value?.showModal()
    void cargarCatalogos()
})
onUnmounted(() => solicitud.abort())

function cancelar(): void {
    if (!props.guardando) emit('cancelar')
}

function guardar(): void {
    errorFormulario.value = ''
    const nombre = borrador.nombre.trim()
    if (!nombre || !borrador.categoriaId) {
        errorFormulario.value = 'El nombre y la categoría son obligatorios.'
        return
    }

    emit('guardar', {
        nombre,
        categoria_id: borrador.categoriaId,
        marca_id: borrador.marcaId || null,
        modelo: borrador.modelo || null,
        activo: borrador.estado === '' ? null : borrador.estado === 'true',
    })
}
</script>

<template>
    <Teleport to="body">
        <dialog ref="dialogo" aria-labelledby="editar-maquina-titulo"
            class="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-950/50"
            @cancel.prevent="cancelar">
            <div class="flex max-h-[90dvh] min-h-0 flex-col">
                <header class="shrink-0 border-b border-slate-200 bg-white p-5">
                    <h2 id="editar-maquina-titulo" class="text-lg font-bold text-slate-900">
                        Editar máquina
                    </h2>
                    <p class="mt-1 text-xs text-slate-500">
                        {{ maquina.codigo_interno }} · {{ maquina.localNombre }}
                    </p>
                </header>

                <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                    <form id="form-editar-maquina" class="space-y-4" :aria-busy="guardando || cargando"
                        @submit.prevent="guardar">
                        <p v-if="errorCatalogos" role="alert" class="text-sm text-red-700">
                            {{ errorCatalogos }}
                            <button type="button" class="ml-2 underline font-semibold" @click="cargarCatalogos">
                                Reintentar
                            </button>
                        </p>

                        <fieldset :disabled="guardando || cargando || !!errorCatalogos" class="grid gap-3 sm:grid-cols-2">
                            <label class="block text-sm font-medium sm:col-span-2">
                                Nombre *
                                <input v-model="borrador.nombre" required :class="campo" />
                            </label>

                            <label class="block text-sm font-medium">
                                Categoría *
                                <Select v-model="borrador.categoriaId" :options="categorias" option-label="nombre"
                                    option-value="id" placeholder="Selecciona una categoría" filter filter-placeholder="Buscar categoría…"
                                    empty-message="No hay categorías disponibles" empty-filter-message="No se encontraron coincidencias"
                                    append-to="self" class="mt-1 w-full" />
                            </label>

                            <label class="block text-sm font-medium">
                                Marca
                                <Select v-model="borrador.marcaId" :options="opcionesMarcas" option-label="nombre"
                                    option-value="id" placeholder="Sin marca" filter filter-placeholder="Buscar marca…"
                                    empty-message="No hay marcas disponibles" empty-filter-message="No se encontraron coincidencias"
                                    append-to="self" class="mt-1 w-full" />
                            </label>

                            <label class="block text-sm font-medium">
                                Modelo
                                <input v-model="borrador.modelo" :class="campo" />
                            </label>

                            <label class="block text-sm font-medium">
                                Estado en el catálogo
                                <Select v-model="borrador.estado" :options="opcionesEstado" option-label="label"
                                    option-value="value" append-to="self" class="mt-1 w-full" />
                            </label>
                        </fieldset>

                        <p v-if="errorFormulario || errorGuardar" role="alert" class="text-sm text-red-700">
                            {{ errorFormulario || errorGuardar }}
                        </p>
                    </form>
                </div>

                <footer class="shrink-0 border-t border-slate-200 bg-white p-4">
                    <div class="flex flex-wrap justify-end gap-2">
                        <button type="button" :disabled="guardando"
                            class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
                            @click="cancelar">
                            Cancelar
                        </button>

                        <button type="submit" form="form-editar-maquina"
                            :disabled="guardando || cargando || !!errorCatalogos"
                            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
                        </button>
                    </div>
                </footer>
            </div>
        </dialog>
    </Teleport>
</template>
