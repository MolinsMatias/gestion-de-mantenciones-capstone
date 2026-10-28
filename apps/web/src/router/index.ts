import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      redirect: '/monitor',
      meta: { requiresAdmin: true },
      children: [
        {
          path: 'monitor',
          name: 'monitor',
          component: () => import('../views/MonitorView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return

  try {
    const { data, error: authError } = await supabase.auth.getUser()

    if (authError || !data.user) {
      return { name: 'login' }
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('usuario')
      .select('activo, rol_id')
      .eq('id', data.user.id)
      .single()

    if (perfilError) throw perfilError

    if (perfil.activo !== true) {
      return { name: 'login', query: { acceso: 'denegado' } }
    }

    const { data: rol, error: rolError } = await supabase
      .from('rol')
      .select('nombre')
      .eq('id', perfil.rol_id)
      .single()

    if (rolError) throw rolError

    if (rol.nombre !== 'administrador') {
      return { name: 'login', query: { acceso: 'denegado' } }
    }
  } catch {
    return { name: 'login', query: { acceso: 'error' } }
  }
})

export default router