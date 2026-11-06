<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { RouterView, useRouter, type RouteLocationNormalized } from 'vue-router'

const router = useRouter()
const navegando = ref(false)
const mostrarProgreso = ref(false)
let pendiente: RouteLocationNormalized | undefined
let temporizador: ReturnType<typeof setTimeout> | undefined

function limpiar(): void {
  clearTimeout(temporizador)
  temporizador = undefined
  pendiente = undefined
  navegando.value = false
  mostrarProgreso.value = false
}

const quitarInicio = router.beforeEach((destino, origen) => {
  // Los cambios de búsqueda o hash no animan ni remontan la sección.
  if (destino.path === origen.path) {
    limpiar()
    return
  }

  clearTimeout(temporizador)
  pendiente = destino
  navegando.value = true
  temporizador = setTimeout(() => {
    if (pendiente === destino) mostrarProgreso.value = true
  }, 150)
})

function finalizar(destino: RouteLocationNormalized): void {
  if (pendiente === destino) limpiar()
}

const quitarFin = router.afterEach(finalizar)
const quitarError = router.onError((_, destino) => finalizar(destino))

onUnmounted(() => {
  quitarInicio()
  quitarFin()
  quitarError()
  limpiar()
})
</script>

<template>
  <div :aria-busy="navegando">
    <RouterView v-slot="{ Component, route }">
      <Transition name="entrada-seccion" mode="out-in" appear>
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </div>

  <p class="sr-only" role="status">{{ mostrarProgreso ? 'Cargando sección…' : '' }}</p>
  <div v-if="mostrarProgreso" class="progreso-seccion" aria-hidden="true">
    <span />
  </div>
</template>

<style scoped>
.entrada-seccion-enter-active {
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}

.entrada-seccion-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.progreso-seccion {
  position: fixed;
  inset: 0 0 auto;
  height: 3px;
  overflow: hidden;
  z-index: 60;
  pointer-events: none;
  background: #dbeafe;
}

.progreso-seccion span {
  display: block;
  width: 35%;
  height: 100%;
  background: #2563eb;
  animation: progreso-seccion 1.2s ease-in-out infinite;
}

@keyframes progreso-seccion {
  from { transform: translateX(-100%); }
  to { transform: translateX(286%); }
}

@media (prefers-reduced-motion: reduce) {
  .entrada-seccion-enter-active { transition: none; }
  .entrada-seccion-enter-from { opacity: 1; transform: none; }
  .progreso-seccion span { width: 100%; animation: none; }
}
</style>
