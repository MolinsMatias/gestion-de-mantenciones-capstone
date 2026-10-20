/**
 * URL base de la aplicación Web / PWA.
 * Única fuente de la verdad para enlaces externos que apuntan a la app web.
 * Se sobreescribe mediante la variable EXPO_PUBLIC_WEB_URL en producción.
 */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/+$/, '') || 'http://localhost:8081';

/**
 * URL de redirección a la que Supabase Auth enviará al usuario en el correo de recuperación.
 */
export const RESET_PASSWORD_REDIRECT_URL = `${WEB_BASE_URL}/reset-password`;
