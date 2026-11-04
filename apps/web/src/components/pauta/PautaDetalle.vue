<script setup lang="ts">
import { ref, watch } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import { obtenerSeccionesPauta, type Pauta, type SeccionPauta } from '../../services/pauta.service'

const props = defineProps<{ pauta: Pauta; categoria: string }>()
const secciones = ref<SeccionPauta[]>([])
const cargando = ref(false)
const error = ref(false)
const reintento = ref(0)

watch([() => props.pauta.id, reintento], async ([id], _, limpiar) => {
  const solicitud = new AbortController()
  limpiar(() => solicitud.abort())
  cargando.value = true
  error.value = false
  secciones.value = []
  try {
    const resultado = await obtenerSeccionesPauta(id, solicitud.signal)
    if (!solicitud.signal.aborted) secciones.value = resultado
  } catch {
    if (!solicitud.signal.aborted) error.value = true
  } finally {
    if (!solicitud.signal.aborted) cargando.value = false
  }
}, { immediate: true })
</script>

<template>
  <section aria-labelledby="titulo-detalle-pauta">
    <div class="mb-4">
      <h2 id="titulo-detalle-pauta" class="text-xl font-bold">{{ pauta.nombre }}</h2>
      <p class="mt-1 text-sm text-slate-600">
        {{ categoria }} · Versión {{ pauta.version }} · {{ pauta.activo ? 'Activa' : 'Inactiva' }}
      </p>
    </div>
    <p v-if="pauta.descripcion" class="mb-4 text-sm text-slate-700">{{ pauta.descripcion }}</p>
    <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando secciones…</p>
    <div v-else-if="error" role="alert" class="text-sm text-red-700">
      No se pudo cargar el detalle.
      <button type="button" class="underline" @click="reintento++">Reintentar</button>
    </div>
    <p v-else-if="!secciones.length" class="text-sm text-slate-500">Esta pauta no tiene secciones.</p>
    <Accordion v-else :key="pauta.id" :value="secciones[0]?.id">
      <AccordionPanel v-for="seccion in secciones" :key="seccion.id" :value="seccion.id">
        <AccordionHeader>{{ seccion.nombre }} ({{ seccion.items.length }})</AccordionHeader>
        <AccordionContent>
          <p v-if="seccion.descripcion" class="mb-2 text-sm text-slate-600">{{ seccion.descripcion }}</p>
          <p v-if="!seccion.items.length" class="text-sm text-slate-500">Sección sin ítems.</p>
          <ol v-else class="list-decimal space-y-3 pl-5">
            <li v-for="item in seccion.items" :key="item.id" class="text-sm">
              <p class="font-medium">{{ item.descripcion }}</p>
              <p v-if="item.instrucciones" class="whitespace-pre-line text-slate-600">{{ item.instrucciones }}</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ item.obligatorio ? 'Obligatorio' : 'Opcional' }}
                · {{ item.permite_no_aplica ? 'Permite «No aplica»' : 'No permite «No aplica»' }}
              </p>
            </li>
          </ol>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </section>
</template>
