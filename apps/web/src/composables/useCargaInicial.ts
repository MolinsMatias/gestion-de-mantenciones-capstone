import { onMounted, onScopeDispose, readonly, ref } from 'vue'

const MINIMO_CARGA_MS = 350

export function useCargaInicial(cargar: () => Promise<unknown>) {
  const mostrandoCargaInicial = ref(true)
  let desmontado = false
  let temporizador: ReturnType<typeof setTimeout> | undefined

  onScopeDispose(() => {
    desmontado = true
    clearTimeout(temporizador)
  })

  onMounted(async () => {
    const inicio = performance.now()

    try {
      await cargar()
    } finally {
      if (!desmontado) {
        const restante = MINIMO_CARGA_MS - (performance.now() - inicio)
        if (restante > 0) {
          temporizador = setTimeout(() => {
            mostrandoCargaInicial.value = false
          }, restante)
        } else {
          mostrandoCargaInicial.value = false
        }
      }
    }
  })

  return readonly(mostrandoCargaInicial)
}
