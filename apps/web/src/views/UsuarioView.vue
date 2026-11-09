<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import UsuarioPerfilDialog from '../components/usuarios/UsuarioPerfilDialog.vue'
import CargaSeccion from '../components/layout/CargaSeccion.vue'
import { useCargaInicial } from '../composables/useCargaInicial'
import { listarUsuarios, type UsuariosPagina, type UsuarioListado } from '../services/usuarios.service'

const busqueda = ref('')
const mostrarPerfil = ref(false)
const usuarioSeleccionado = ref<UsuarioListado | null>(null)

function verPerfil(usuario: UsuarioListado) {
  usuarioSeleccionado.value = usuario
  mostrarPerfil.value = true
}
const rol = ref('')
const estado = ref<'' | 'activo' | 'inactivo'>('')
const listado = ref<UsuariosPagina>({ filas: [], roles: [], total: 0, pagina: 1 })
const cargando = ref(false)
const error = ref('')
const totalPaginas = computed(() => Math.max(1, Math.ceil(listado.value.total / 20)))
const fecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' })
let controller: AbortController | undefined
let espera: ReturnType<typeof setTimeout> | undefined

function fechaRegistro(valor: string | null) {
  const dia = valor ? new Date(valor) : null
  return dia && Number.isFinite(dia.getTime()) ? fecha.format(dia) : 'Sin registro'
}

async function cargar(pagina: number) {
  clearTimeout(espera)
  controller?.abort()
  const actual = new AbortController()
  controller = actual
  cargando.value = true
  error.value = ''
  try {
    const respuesta = await listarUsuarios({ busqueda: busqueda.value, rol: rol.value, estado: estado.value, pagina }, actual.signal)
    if (!actual.signal.aborted) listado.value = respuesta
  } catch {
    if (!actual.signal.aborted) error.value = 'No se pudo cargar el listado. Comprueba tus permisos o vuelve a intentar.'
  } finally {
    if (!actual.signal.aborted) cargando.value = false
  }
}

watch([busqueda, rol, estado], ([texto], [anterior]) => {
  clearTimeout(espera)
  controller?.abort()
  cargando.value = true
  error.value = ''
  if (texto !== anterior && texto.trim()) espera = setTimeout(() => { void cargar(1) }, 250)
  else void cargar(1)
})

const mostrandoCargaInicial = useCargaInicial(() => cargar(1))
onScopeDispose(() => { clearTimeout(espera); controller?.abort() })
</script>

<template>
  <section aria-labelledby="titulo-usuarios">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 id="titulo-usuarios" class="text-2xl font-bold text-slate-900">Usuarios y técnicos</h1>
        <p class="mt-1 text-sm text-slate-600">Consulta los perfiles registrados, sus roles y su estado de acceso.</p>
      </div>
      <button type="button" :disabled="cargando || mostrandoCargaInicial"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        @click="cargar(error ? 1 : listado.pagina)">Actualizar</button>
    </header>

    <CargaSeccion v-if="mostrandoCargaInicial" variante="tabla" mensaje="Cargando usuarios…" />
    <template v-else>
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-sm font-medium text-slate-700">
          Buscar por nombre
          <input v-model="busqueda" type="search" maxlength="100"
            class="rounded-lg border border-slate-300 bg-white p-2" />
        </label>
        <label class="grid gap-1 text-sm font-medium text-slate-700">
          Rol
          <select v-model="rol" class="rounded-lg border border-slate-300 bg-white p-2">
            <option value="">Todos los roles</option>
            <option v-for="opcion in listado.roles" :key="opcion.id" :value="opcion.id">{{ opcion.nombre }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm font-medium text-slate-700">
          Estado
          <select v-model="estado" class="rounded-lg border border-slate-300 bg-white p-2">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </label>
        <button v-if="busqueda || rol || estado" type="button"
          class="px-2 py-2 text-sm font-semibold text-blue-700 hover:underline"
          @click="busqueda = ''; rol = ''; estado = ''">Limpiar filtros</button>
      </div>
      <p v-if="error" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <p role="status" class="mb-2 text-sm text-slate-600">{{ cargando ? 'Buscando usuarios…' : error ? '' :
        `${listado.total} resultados` }}</p>
      <div :aria-busy="cargando" class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table class="w-full text-left text-sm text-slate-800">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="p-3">Nombre</th>
              <th scope="col" class="p-3">Rol</th>
              <th scope="col" class="p-3">Estado</th>
              <th scope="col" class="p-3">Registro (Chile)</th>
              <th scope="col" class="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in listado.filas" :key="usuario.id" class="border-t border-slate-100">
              <td class="p-3 font-medium">{{ usuario.nombre || 'Sin nombre' }}</td>
              <td class="p-3">{{ usuario.rol || 'Sin rol' }}</td>
              <td class="p-3"><span class="rounded-full px-2 py-1 text-xs font-semibold"
                  :class="usuario.activo === true ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'">
                  {{ usuario.activo === true ? 'Activo' : usuario.activo === false ? 'Inactivo' : 'Sin definir' }}
                </span></td>
              <td class="p-3">{{ fechaRegistro(usuario.created_at) }}</td>
              <td class="p-3">
                <button type="button" class="whitespace-nowrap font-semibold text-blue-700 hover:underline"
                  :aria-label="usuario.nombre ? 'Ver perfil de ' + usuario.nombre : 'Ver perfil de usuario sin nombre'"
                  @click="verPerfil(usuario)">Ver perfil</button>
              </td>
            </tr>
            <tr v-if="!listado.filas.length && !error && !cargando">
              <td colspan="5" class="p-8 text-center text-slate-500">No hay usuarios para estos filtros.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="listado.total" aria-label="Paginación de usuarios"
        class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>Página {{ listado.pagina }} de {{ totalPaginas }}</p>
        <div class="flex gap-2">
          <button type="button" :disabled="cargando || !!error || listado.pagina <= 1"
            class="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            @click="cargar(listado.pagina - 1)">Anterior</button>
          <button type="button" :disabled="cargando || !!error || listado.pagina >= totalPaginas"
            class="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            @click="cargar(listado.pagina + 1)">Siguiente</button>
        </div>
      </nav>
    </template>
    <UsuarioPerfilDialog v-model:visible="mostrarPerfil" :usuario="usuarioSeleccionado"
      :fecha-registro="fechaRegistro(usuarioSeleccionado?.created_at ?? null)" />
  </section>
</template>
