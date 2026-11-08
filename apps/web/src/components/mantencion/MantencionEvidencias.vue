<script setup lang="ts">
import { ref } from 'vue'
import { fechaMantencion, obtenerEnlaceEvidencia, puedeAbrirEvidencias, type EvidenciaMantencion } from '../../services/mantencion.service'

defineProps<{ evidencias: EvidenciaMantencion[] }>()
const preparando = ref<string | null>(null)
const error = ref('')
const enlace = ref<{ id: string; url: string } | null>(null)

async function preparar(archivo: EvidenciaMantencion) {
  if (!archivo.archivo_path || preparando.value) return
  error.value = ''
  enlace.value = null
  preparando.value = archivo.id
  try {
    enlace.value = { id: archivo.id, url: await obtenerEnlaceEvidencia(archivo.archivo_path) }
  } catch {
    error.value = 'No se pudo abrir el archivo. Revisa los permisos y la ruta en Storage.'
  } finally {
    preparando.value = null
  }
}
</script>

<template>
  <div>
    <p v-if="!evidencias.length" class="text-sm text-slate-500">Sin evidencias disponibles.</p>
    <ul v-else class="space-y-2">
      <li v-for="(archivo, indice) in evidencias" :key="archivo.id"
        class="rounded-lg border border-slate-200 p-3 text-sm">
        <p class="whitespace-pre-wrap break-words">{{ archivo.descripcion || `Archivo adjunto ${indice + 1}` }}</p>
        <p v-if="archivo.created_at" class="mt-1 text-xs text-slate-500">{{ fechaMantencion(archivo.created_at) }}</p>
        <a v-if="enlace?.id === archivo.id" :href="enlace.url" target="_blank" rel="noopener noreferrer"
          class="mt-1 inline-block font-semibold text-blue-700 underline" @click="enlace = null">
          Abrir archivo (nueva pestaña)
        </a>
        <button v-else-if="puedeAbrirEvidencias && archivo.archivo_path" type="button" :disabled="!!preparando"
          class="mt-1 font-semibold text-blue-700 underline disabled:opacity-50" @click="preparar(archivo)">
          {{ preparando === archivo.id ? 'Preparando…' : 'Generar enlace' }}
        </button>
        <p v-else-if="archivo.archivo_path" class="mt-1 text-xs text-slate-500">Apertura de archivos sin configurar.</p>
      </li>
    </ul>
    <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">{{ error }}</p>
  </div>
</template>
