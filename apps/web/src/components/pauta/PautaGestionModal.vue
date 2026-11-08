<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Dialog from 'primevue/dialog'
import {
  gestionarPauta, gestionarVersionPauta, obtenerSeccionesPauta,
  type AccionPauta, type AccionVersionPauta, type CategoriaPauta, type ItemPautaBorrador,
  type Pauta, type PautaBorrador, type SeccionPautaBorrador,
} from '../../services/pauta.service'

const props = defineProps<{
  accion: AccionPauta | AccionVersionPauta
  pauta?: Pauta
  categorias: CategoriaPauta[]
}>()
const emit = defineEmits<{ cerrar: []; completado: [accion: AccionPauta | AccionVersionPauta, id: string] }>()
const encabezados = { crear: 'Crear pauta', editar: 'Editar pauta', eliminar: 'Archivar pauta', crear_borrador: 'Crear nueva versión', publicar: 'Publicar versión' }
const campo = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900'
const nuevoItem = (): ItemPautaBorrador => ({
  descripcion: '', instrucciones: '', obligatorio: true, permite_no_aplica: false,
})
const nuevaSeccion = (): SeccionPautaBorrador => ({
  nombre: '', descripcion: '', items: [nuevoItem()],
})
const borrador = ref<PautaBorrador>({
  nombre: props.pauta?.nombre ?? '',
  descripcion: props.pauta?.descripcion ?? '',
  categoria_id: props.pauta?.categoria_id ?? '',
  activo: props.pauta?.activo ?? true,
  secciones: props.accion === 'crear' ? [nuevaSeccion()] : [],
})
const cargando = ref(props.accion === 'editar')
const cargaFallida = ref(false)
const guardando = ref(false)
const error = ref('')
const solicitud = new AbortController()

onMounted(async () => {
  if (props.accion !== 'editar' || !props.pauta) return
  try {
    const secciones = await obtenerSeccionesPauta(props.pauta.id, solicitud.signal)
    if (solicitud.signal.aborted) return
    borrador.value.secciones = secciones.map(seccion => ({
      nombre: seccion.nombre,
      descripcion: seccion.descripcion ?? '',
      items: seccion.items.map(item => ({
        descripcion: item.descripcion,
        instrucciones: item.instrucciones ?? '',
        obligatorio: item.obligatorio,
        permite_no_aplica: item.permite_no_aplica,
      })),
    }))
  } catch {
    if (!solicitud.signal.aborted) {
      cargaFallida.value = true
      error.value = 'No se pudo cargar la pauta. Cierra el diálogo y vuelve a abrirlo.'
    }
  } finally {
    if (!solicitud.signal.aborted) cargando.value = false
  }
})
onUnmounted(() => solicitud.abort())

function cerrar(): void {
  if (!guardando.value) emit('cerrar')
}

async function guardar(): Promise<void> {
  if (guardando.value || cargando.value || cargaFallida.value) return
  if (props.accion !== 'crear' && !props.pauta) return
  error.value = ''
  if (props.accion === 'crear' || props.accion === 'editar') {
    const p = borrador.value
    if (!p.nombre.trim() || !p.categoria_id || !p.secciones.length ||
      p.secciones.some(s => !s.nombre.trim() || !s.items.length ||
        s.items.some(i => !i.descripcion.trim()))) {
      error.value = 'Completa el nombre, la categoría y al menos un ítem por sección.'
      return
    }
  }

  guardando.value = true
  try {
    const id = props.accion === 'crear_borrador' || props.accion === 'publicar'
      ? await gestionarVersionPauta(props.accion, props.pauta!.id)
      : await gestionarPauta(props.accion, props.pauta?.id ?? null,
        props.accion === 'eliminar' ? null : borrador.value)
    emit('completado', props.accion, id)
  } catch (causa: unknown) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialog :visible="true" modal block-scroll :closable="!guardando" :close-on-escape="!guardando"
    :header="encabezados[accion]" :style="{ width: 'min(72rem, calc(100vw - 2rem))', maxHeight: '90dvh' }"
    @update:visible="visible => { if (!visible) cerrar() }">
    <form id="form-gestion-pauta" class="space-y-4" :aria-busy="guardando || cargando" @submit.prevent="guardar">
      <p v-if="accion === 'eliminar'" class="text-sm text-slate-700">
        ¿Archivar <strong>{{ pauta?.nombre }}</strong> (versión {{ pauta?.version }})?
        Dejará de ofrecerse para trabajos nuevos. Sus secciones, ítems y mantenciones se conservarán.
      </p>
      <p v-else-if="accion === 'crear_borrador'" class="text-sm text-slate-700">
        Se abrirá una copia editable como borrador. La versión actual seguirá vigente.
      </p>
      <p v-else-if="accion === 'publicar'" class="text-sm text-slate-700">
        La nueva versión quedará vigente y se archivará la anterior. Se conservarán sus mantenciones y respuestas.
      </p>
      <p v-else-if="cargando" role="status">Cargando secciones e ítems…</p>

      <fieldset v-else-if="!cargaFallida" :disabled="guardando" class="min-w-0 space-y-4">
        <label class="block text-sm font-medium">Nombre de la pauta *
          <input v-model="borrador.nombre" required :class="campo" />
        </label>
        <label class="block text-sm font-medium">Categoría *
          <select v-model="borrador.categoria_id" :disabled="pauta?.borrador_version" required :class="campo">
            <option value="" disabled>Selecciona una categoría</option>
            <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
              {{ categoria.nombre }}
            </option>
          </select>
        </label>
        <label class="block text-sm font-medium">Descripción
          <textarea v-model="borrador.descripcion" rows="2" :class="campo" />
        </label>
        <label v-if="!pauta?.borrador_version" class="flex items-center gap-2 text-sm">
          <input v-model="borrador.activo" type="checkbox" /> Pauta activa
        </label>
        <p v-if="accion === 'editar'" class="text-xs text-slate-500">
          Versión {{ pauta?.version }}. Solo se pueden editar pautas sin historial asociado.
        </p>

        <section v-for="(seccion, s) in borrador.secciones" :key="s"
          class="space-y-3 rounded-xl border border-slate-200 p-3">
          <div class="flex justify-between gap-3">
            <h3 class="font-semibold">Sección {{ s + 1 }}</h3>
            <button type="button" class="text-sm text-red-700" :disabled="borrador.secciones.length <= 1"
              @click="borrador.secciones.splice(s, 1)">
              Quitar sección
            </button>
          </div>
          <label class="block text-sm">Nombre de sección *
            <input v-model="seccion.nombre" required :class="campo" />
          </label>
          <label class="block text-sm">Descripción de sección
            <textarea v-model="seccion.descripcion" rows="2" :class="campo" />
          </label>

          <div v-for="(item, i) in seccion.items" :key="i" class="space-y-2 rounded-lg bg-slate-50 p-3">
            <div class="flex justify-between gap-3 text-sm">
              <strong>Ítem {{ i + 1 }}</strong>
              <button type="button" class="text-red-700" :disabled="seccion.items.length <= 1"
                @click="seccion.items.splice(i, 1)">Quitar ítem</button>
            </div>
            <label class="block text-sm">Descripción del ítem *
              <input v-model="item.descripcion" required :class="campo" />
            </label>
            <label class="block text-sm">Instrucciones
              <textarea v-model="item.instrucciones" rows="2" :class="campo" />
            </label>
            <div class="flex flex-wrap gap-4 text-sm">
              <label><input v-model="item.obligatorio" type="checkbox" /> Obligatorio</label>
              <label><input v-model="item.permite_no_aplica" type="checkbox" /> Permite «No aplica»</label>
            </div>
          </div>
          <button type="button" class="text-sm font-semibold text-blue-700"
            @click="seccion.items.push(nuevoItem())">Agregar ítem</button>
        </section>

        <button type="button" class="text-sm font-semibold text-blue-700"
          @click="borrador.secciones.push(nuevaSeccion())">Agregar sección</button>
      </fieldset>

      <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" :disabled="guardando" class="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          @click="cerrar">Cancelar</button>
        <button type="submit" form="form-gestion-pauta" :disabled="guardando || cargando || cargaFallida"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :class="accion === 'eliminar' ? 'bg-red-700' : 'bg-blue-700'">
          {{ guardando ? 'Procesando…' : accion === 'eliminar' ? 'Sí, archivar' : accion === 'publicar' ? 'Publicar' :
            accion === 'crear_borrador' ? 'Crear borrador' : 'Guardar pauta' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>
