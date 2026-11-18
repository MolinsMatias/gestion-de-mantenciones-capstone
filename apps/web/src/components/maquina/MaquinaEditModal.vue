<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import Dialog from 'primevue/dialog'
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
            opciones.marcas, props.maquina.marca_id, props.maquina.marcaNombre ?? '',
        )
    } catch {
        if (!solicitud.signal.aborted) {
            errorCatalogos.value = 'No se pudieron cargar categorías y marcas. Intenta nuevamente.'
        }
    } finally {
        if (!solicitud.signal.aborted) cargando.value = false
    }
}

function cancelar(): void {
    if (props.guardando) return
    emit('cancelar')
}

function guardar(): void {
    if (props.guardando || cargando.value || errorCatalogos.value) return
    errorFormulario.value = ''
    if (!borrador.nombre.trim() || !borrador.categoriaId) {
        errorFormulario.value = 'Completa el nombre y la categoría.'
        return
    }
    emit('guardar', {
        nombre: borrador.nombre.trim(),
        categoria_id: borrador.categoriaId,
        marca_id: borrador.marcaId || null,
        modelo: borrador.modelo.trim() || null,
        activo: borrador.estado === '' ? null : borrador.estado === 'true',
    })
}

onMounted(() => {
    void cargarCatalogos()
})

onUnmounted(() => {
    solicitud.abort()
})
</script>

<template>
    <Dialog :visible="true" modal block-scroll :draggable="false" :closable="!guardando"
        :close-on-escape="!guardando" :dismissable-mask="!guardando"
        :style="{ width: 'min(34rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
        @update:visible="visible => { if (!visible) cancelar() }">
        <template #header>
            <div>
                <h2 id="editar-maquina-titulo" class="text-lg font-bold text-slate-900">
                    Editar máquina
                </h2>
                <p class="mt-1 text-xs text-slate-500">
                    {{ maquina.codigo_interno }} · {{ maquina.localNombre }}
                </p>
            </div>
        </template>

        <div class="py-2">
            <form id="form-editar-maquina" class="space-y-4" :aria-busy="guardando || cargando"
                @submit.prevent="guardar">
                <p v-if="errorCatalogos" role="alert" class="text-sm text-red-700">
                    {{ errorCatalogos }}
                    <button type="button" class="ml-2 font-semibold underline" @click="cargarCatalogos">
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
                            class="mt-1 w-full" />
                    </label>

                    <label class="block text-sm font-medium">
                        Marca
                        <Select v-model="borrador.marcaId" :options="opcionesMarcas" option-label="nombre"
                            option-value="id" placeholder="Sin marca" filter filter-placeholder="Buscar marca…"
                            empty-message="No hay marcas disponibles" empty-filter-message="No se encontraron coincidencias"
                            class="mt-1 w-full" />
                    </label>

                    <label class="block text-sm font-medium">
                        Modelo
                        <input v-model="borrador.modelo" :class="campo" />
                    </label>

                    <label class="block text-sm font-medium">
                        Estado en el catálogo
                        <Select v-model="borrador.estado" :options="opcionesEstado" option-label="label"
                            option-value="value" class="mt-1 w-full" />
                    </label>
                </fieldset>

                <p v-if="errorFormulario || errorGuardar" role="alert" class="text-sm text-red-700">
                    {{ errorFormulario || errorGuardar }}
                </p>
            </form>
        </div>

        <template #footer>
            <div class="flex flex-wrap justify-end gap-2">
                <button type="button" :disabled="guardando"
                    class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    @click="cancelar">
                    Cancelar
                </button>
                <button type="submit" form="form-editar-maquina"
                    :disabled="guardando || cargando || !!errorCatalogos"
                    class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
                </button>
            </div>
        </template>
    </Dialog>
</template>
