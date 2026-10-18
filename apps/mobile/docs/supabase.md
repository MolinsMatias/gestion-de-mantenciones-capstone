# Configuración inicial de Supabase

## Estado

El cliente de Expo está preparado para Android y web. La URL y la clave Publishable
locales se verificaron contra Auth con una respuesta HTTP 200. Email está habilitado,
la confirmación de correo está activa y el registro público sigue habilitado.
El usuario confirmó la creación manual de `rol`, `usuario` y un perfil vinculado a
Auth. El formulario está conectado a la Edge Function `login-run`, cuyo código y
SQL están en `apps/supabase`; su despliegue y prueba real siguen pendientes.
La conexión de administración de Supabase disponible en este entorno no incluye
este proyecto; las credenciales públicas no permiten modificar su esquema.

## 1. Conectar el proyecto

En el Dashboard del proyecto Bowling Services, abrir **Connect** y copiar:

- Project URL (`https://<project-ref>.supabase.co`).
- Publishable key (`sb_publishable_...`), también disponible en **Settings > API Keys**.

Completar `apps/mobile/.env.local` a partir de `.env.example`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La URL es de Supabase; no corresponde a la dirección local de Expo.
El archivo `.env.local` se ignora en Git. Las variables `EXPO_PUBLIC_*` se incluyen
en el cliente: no poner claves secretas, `service_role` ni la contraseña de Postgres.

Desde `apps/mobile`, reiniciar el servidor con `pnpm start --clear`.
El cliente se obtiene con `getSupabase()` desde `@/services/supabase`.
Sin las variables, la pantalla actual puede seguir ejecutándose; las llamadas al
cliente informarán que falta configurar la conexión.

## 2. Ajustes iniciales de Auth en el Dashboard

- Mantener habilitado el proveedor Email: Auth lo usará internamente aunque el
  usuario ingrese RUN en la aplicación.
- Recomendación para esta app interna: deshabilitar **Allow new users to sign up**
  y **Allow anonymous sign-ins**. Crear las cuentas desde un flujo administrativo
  de confianza; confirmar esta política antes de implementar el alta de técnicos.
- Mantener la confirmación de correo para verificar el correo de recuperación.
- Configurar **URL Configuration** cuando tengamos la ruta de recuperación:
  Site URL de la PWA publicada y Redirect URLs exactas para desarrollo y producción.
  No dar por implementada una ruta por registrarla en el Dashboard.
- Para enviar recuperaciones a técnicos, configurar **Custom SMTP** y un remitente
  verificado. El correo integrado de Supabase es para pruebas limitadas con las
  direcciones autorizadas del equipo del proyecto.

## 3. Modelo de identidad acordado

```text
auth.users.id = public.usuario.id (UUID)
public.usuario.rol_id -> public.rol.id
```

Supabase administra `auth.users`, las contraseñas y las sesiones. Ya se creó
`usuario` con RUN único, DV, nombres, apellidos, rol y estado activo, y `rol`.
El RUN no reemplaza al UUID. No se almacenarán contraseñas en `public`.

Las tablas expuestas necesitarán RLS y permisos explícitos. El usuario no podrá
cambiar su RUN, rol o estado activo desde el cliente. Desactivar una cuenta deberá
restringir también el acceso a datos; un booleano no cierra por sí solo una sesión.

## 4. Flujos de acceso

### Acceso con RUN y contraseña

La app envía el RUN con DV y la contraseña a `login-run`. La función normaliza y
valida el RUN, resuelve el correo de Auth de forma privada y verifica la contraseña
con Supabase Auth. No devuelve el correo para que el cliente lo use en otra llamada.
Solo una autenticación válida de un perfil activo entrega una sesión a la app.
La app conserva la sesión y protege las rutas de navegación según su presencia.

La función es accesible antes del login y usa límites persistentes por RUN y globales.
Las claves de backend viven exclusivamente en los secretos de Supabase; no se
consulta el directorio de RUN/correo desde una tabla pública accesible sin sesión.
Ver los pasos de SQL, despliegue y pruebas en `apps/supabase/README.md`.

### Recuperación con RUN o correo

El usuario ingresará uno de los dos identificadores. El backend iniciará el envío
del enlace al correo registrado. Se mostrará la misma respuesta para una cuenta
existente o inexistente: «Si los datos corresponden a una cuenta, recibirás un
correo con las instrucciones».

La ruta de recuperación deberá intercambiar el código PKCE, permitir definir una
nueva contraseña y manejar enlaces vencidos. PKCE requiere conservar el estado
del navegador/dispositivo que inició la recuperación: hay que validar el recorrido
real APK/correo/PWA antes de elegir las redirecciones definitivas. No se utilizarán
correos ficticios derivados del RUN, porque necesitamos recuperación por correo.

## Referencias

- [Supabase Auth con React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Perfiles vinculados a Auth](https://supabase.com/docs/guides/auth/managing-user-data)
- [Contraseñas y recuperación](https://supabase.com/docs/guides/auth/passwords)
- [Configuración de Auth](https://supabase.com/docs/guides/auth/general-configuration)
- [Correo mediante SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
