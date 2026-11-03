<script setup lang="ts">
import { ref, watch } from 'vue'
import { BuildingStorefrontIcon, CpuChipIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import { supabase } from '../../services/supabase'
import KpiCard from './KpiCard.vue'

const props = defineProps<{ actualizacion: Date }>()
type Volumen = { total_recintos: number; total_equipos: number; mantenciones_mes: number; mes_chile: string }
const volumen = ref<Volumen | null>(null)
const cargando = ref(false)
const error = ref(false)
const reintentos = ref(0)

function esVolumen(dato: unknown): dato is Volumen {
  if (!dato || typeof dato !== 'object') return false
  const v = dato as Record<string, unknown>
  return typeof v.mes_chile === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.mes_chile) &&
    [v.total_recintos, v.total_equipos, v.mantenciones_mes]
      .every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0)
}

function mesVisible(mes: string): string {
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(mes + '-01T00:00:00Z'))
}

watch([() => props.actualizacion, reintentos], async (_, __, onCleanup) => {
  const solicitud = new AbortController()
  onCleanup(() => solicitud.abort())
  cargando.value = true
  error.value = false
  volumen.value = null
  try {
    const { data, error: errorRpc } = await supabase.rpc('obtener_volumen_monitor')
      .abortSignal(solicitud.signal)
    if (solicitud.signal.aborted) return
    if (errorRpc || !esVolumen(data)) throw new Error('No se pudieron obtener los totales.')
    volumen.value = data
  } catch {
    if (!solicitud.signal.aborted) error.value = true
  } finally {
    if (!solicitud.signal.aborted) cargando.value = false
  }
}, { immediate: true })
</script>

<template>
  <section class="mb-8" aria-label="Volumen de operación">
    <h2 class="mb-3 text-lg font-bold text-slate-900">Volumen de operación</h2>
    <p v-if="cargando" role="status" class="text-sm text-slate-500">Cargando totales…</p>
    <div v-else-if="error" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
      No se pudieron cargar los totales.
      <button type="button" class="ml-2 font-semibold underline" @click="reintentos++">Reintentar</button>
    </div>
    <div v-else-if="volumen" class="grid gap-4 md:grid-cols-3">
      <KpiCard label="Recintos registrados" :value="volumen.total_recintos" :icon="BuildingStorefrontIcon" />
      <KpiCard :label="'Mantenciones recibidas · ' + mesVisible(volumen.mes_chile)" :value="volumen.mantenciones_mes"
        :icon="WrenchScrewdriverIcon" />
      <KpiCard label="Maquinas registradas" :value="volumen.total_equipos" :icon="CpuChipIcon" />
    </div>
  </section>
</template>
