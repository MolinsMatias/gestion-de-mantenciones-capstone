<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
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
    } catch {
        if (!solicitud.signal.aborted) {
            errorCatalogos.value = 'No se pudieron cargar las categorías y marcas.'
        }
    } finally {
        if (!solicitud.signal.aborted) cargando.value = false
    }
}

function enviar(): void {
    if (props.guardando || cargando.value || errorCatalogos.value) return
    errorFormulario.value = ''

    const nombre = borrador.nombre.trim()
    if (!nombre) {
        errorFormulario.value = 'Ingresa el nombre de la máquina.'
        return
    }

    if (!categorias.value.some(categoria => categoria.id === borrador.categoriaId)) {
        errorFormulario.value = 'Selecciona una categoría válida.'
        return
    }

    if (borrador.marcaId && !marcas.value.some(marca => marca.id === borrador.marcaId)) {
        errorFormulario.value = 'Selecciona una marca válida o deja el campo sin marca.'
        return
    }

    emit('guardar', {
        nombre,
        categoria_id: borrador.categoriaId,
        marca_id: borrador.marcaId || null,
        modelo: borrador.modelo.trim() || null,
        activo: borrador.estado === '' ? null : borrador.estado === 'true',
    })
}

const dialogo = ref<HTMLDialogElement | null>(null)

onMounted(() => {
    dialogo.value?.showModal()
})

function solicitarCierre(): void {
    if (!props.guardando) emit('cancelar')
}

onMounted(cargarCatalogos)
onUnmounted(() => solicitud.abort())
</script>

<template>
    <Teleport to="body">
        <dialog ref="dialogo" aria-labelledby="editar-maquina-titulo"
            class="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-950/50"
            @cancel.prevent="solicitarCierre">
            <div class="flex max-h-[90dvh] min-h-0 flex-col">
                <header class="shrink-0 border-b border-slate-200 bg-white p-6">
                    <h3 id="editar-maquina-titulo" class="text-xl font-bold text-slate-900">
                        Editar máquina
                    </h3>

                    <p class="mt-1 text-sm text-slate-600">
                        Código: <strong>{{ maquina.codigo_interno }}</strong>
                        · Local: <strong>{{ maquina.localNombre }}</strong>
                    </p>
                </header>

                <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
                    <form id="form-editar-maquina" class="space-y-4" :aria-busy="guardando || cargando" @submit.prevent="enviar">
                        <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando opciones…</p>
                        <div v-if="errorCatalogos" role="alert" class="text-sm text-red-700">
                            {{ errorCatalogos }}
                            <button type="button" class="ml-2 underline" @click="cargarCatalogos">
                                Reintentar
                            </button>
                        </div>

                        <fieldset :disabled="guardando || cargando || !!errorCatalogos" class="grid gap-3 sm:grid-cols-2">
                            <label class="block text-sm font-medium sm:col-span-2">
                                Nombre *
                                <input v-model="borrador.nombre" required :class="campo" />
                            </label>

                            <label class="block text-sm font-medium">
                                Categoría *
                                <select v-model="borrador.categoriaId" required :class="campo">
                                    <option value="" disabled>Selecciona una categoría</option>
                                    <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
                                        {{ categoria.nombre }}
                                    </option>
                                </select>
                            </label>

                            <label class="block text-sm font-medium">
                                Marca
                                <select v-model="borrador.marcaId" :class="campo">
                                    <option value="">Sin marca</option>
                                    <option v-for="marca in marcas" :key="marca.id" :value="marca.id">
                                        {{ marca.nombre }}
                                    </option>
                                </select>
                            </label>

                            <label class="block text-sm font-medium">
                                Modelo
                                <input v-model="borrador.modelo" :class="campo" />
                            </label>

                            <label class="block text-sm font-medium">
                                Estado en el catálogo
                                <select v-model="borrador.estado" :class="campo">
                                    <option value="" :disabled="maquina.activo !== null">Sin definir</option>
                                    <option value="true">Activa</option>
                                    <option value="false">Inactiva</option>
                                </select>
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
                            @click="solicitarCierre">
                            Cancelar
                        </button>
                        <button type="submit" form="form-editar-maquina" :disabled="guardando || cargando || !!errorCatalogos || !categorias.length"
                            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
                        </button>
                    </div>
                </footer>
            </div>
        </dialog>
    </Teleport>
</template>