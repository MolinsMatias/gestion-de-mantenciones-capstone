<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ArrowDownTrayIcon, QrCodeIcon } from '@heroicons/vue/24/outline'
import QRCode from 'qrcode'
import type { MaquinaDetalle } from '../../types/maquina'
import { contenidoQrMaquina } from '../../utils/maquina-qr'

const props = defineProps<{ maquina: MaquinaDetalle }>()
const imagenQr = ref('')
const cargandoQr = ref(false)
const errorQr = ref('')
let version = 0

watch(() => props.maquina.id, async (id) => {
  const actual = ++version
  imagenQr.value = ''
  errorQr.value = ''
  cargandoQr.value = true
  try {
    const imagen = await QRCode.toDataURL(contenidoQrMaquina(id), {
      width: 640, margin: 4, errorCorrectionLevel: 'M',
      color: { dark: '#0A1628', light: '#FFFFFF' },
    })
    if (actual === version) imagenQr.value = imagen
  } catch {
    if (actual === version) errorQr.value = 'No se pudo generar el QR. Vuelve a seleccionar la máquina.'
  } finally {
    if (actual === version) cargandoQr.value = false
  }
}, { immediate: true })

onBeforeUnmount(() => { version++ })

function descargarQr(): void {
  if (!imagenQr.value) return
  const codigo = (props.maquina.codigo_interno || props.maquina.id).replace(/[^a-zA-Z0-9_-]/g, '_')
  const enlace = document.createElement('a')
  enlace.href = imagenQr.value
  enlace.download = `qr-${codigo}.png`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
}
</script>

<template>
  <aside aria-labelledby="detalle-maquina-titulo" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-8">
    <div class="bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
      <div class="mb-4 flex items-center gap-2 text-sm text-blue-100"><QrCodeIcon class="size-5" aria-hidden="true" />Equipo seleccionado</div>
      <h2 id="detalle-maquina-titulo" class="text-xl font-bold">{{ maquina.nombre }}</h2>
      <p class="mt-2 text-sm text-blue-100">{{ maquina.codigo_interno }} · {{ maquina.localNombre }}</p>
    </div>
    <div class="p-6">
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div><dt class="text-slate-500">Categoría</dt><dd class="mt-1 font-semibold">{{ maquina.categoriaNombre }}</dd></div>
        <div><dt class="text-slate-500">Marca</dt><dd class="mt-1 font-semibold">{{ maquina.marcaNombre }}</dd></div>
        <div><dt class="text-slate-500">Modelo</dt><dd class="mt-1 font-semibold">{{ maquina.modelo || 'Sin modelo' }}</dd></div>
        <div><dt class="text-slate-500">Registro</dt><dd class="mt-1 font-semibold">{{ maquina.activo === true ? 'Activo' : maquina.activo === false ? 'Inactivo' : 'Sin definir' }}</dd></div>
      </dl>
      <div class="mt-6 flex min-h-56 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3">
        <p v-if="cargandoQr" role="status" class="text-sm text-slate-500">Generando QR…</p>
        <p v-else-if="errorQr" role="alert" class="text-sm text-red-700">{{ errorQr }}</p>
        <img v-else-if="imagenQr" :src="imagenQr" :alt="`Código QR de ${maquina.nombre}`" width="240" height="240" class="h-auto w-full max-w-60" />
      </div>
      <p class="mt-4 text-xs leading-relaxed text-slate-500">El QR contiene el UUID de la máquina y mantiene el mismo identificador al reimprimir.</p>
      <button type="button" :disabled="!imagenQr || cargandoQr" @click="descargarQr"
        class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        <ArrowDownTrayIcon class="size-5" aria-hidden="true" />Descargar QR en PNG
      </button>
    </div>
  </aside>
</template>
