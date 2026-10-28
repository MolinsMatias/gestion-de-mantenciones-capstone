<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppSidebar from '../components/layout/AppSidebar.vue'
import { useAuthStore } from '../stores/auth'
import { useMonitorStore } from '../stores/monitor'

const auth = useAuthStore()
const monitor = useMonitorStore()
const router = useRouter()

// Restaura el store existente incluso al abrir /monitor directamente.
void auth.inicializar()

watch(() => auth.autenticado, (autenticado) => {
  if (!autenticado) {
    monitor.limpiar()
    void router.replace('/login')
  }
})

async function salir(): Promise<void> {
  await auth.cerrarSesion()
  if (!auth.autenticado) {
    monitor.limpiar()
    await router.replace('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 lg:flex">
    <AppSidebar :saliendo="auth.cargando" :error="auth.error" @salir="salir" />
    <main class="min-w-0 flex-1 p-5 sm:p-8 lg:ml-64 lg:p-10">
      <div class="mx-auto max-w-7xl"><RouterView /></div>
    </main>
  </div>
</template>
