import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import React from 'react';

/**
 * Root HTML layout for web output.
 * Configura la versión web como una PWA móvil instalable (standalone),
 * y permite que el contenido cubra el viewport y sus áreas seguras.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* El fondo cubre las áreas seguras; el contenido gestiona sus propios insets. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Enlace al Web App Manifest para instalación PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Metadatos PWA para Android / Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#07162c" />

        {/* Metadatos PWA para iOS Safari (Añadir a pantalla de inicio) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BowlingServices" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <meta name="format-detection" content="telephone=no" />

        <ScrollViewStyleReset />

        {/* Estilos web para altura 100% y comportamiento nativo móvil */}
        <style dangerouslySetInnerHTML={{ __html: responsivePWAStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsivePWAStyles = `
/* Usa la fuente del sistema sin descargar ni depender de fuentes personalizadas. */
html, body, #root, [dir="auto"], input, textarea, button, select {
  font-family: -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
}

/* Desactivar resaltado táctil y eliminar el retraso de 300ms en dispositivos táctiles */
* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* El documento aporta un fondo de respaldo; cada pantalla pinta sus propias áreas. */
html, body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  overflow: hidden;
  overscroll-behavior-y: none;
  overscroll-behavior-x: none;
}

#root {
  /* Sigue el viewport disponible; el scroll y los insets viven dentro de Expo. */
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

/* Evitar selección accidental de textos como en app nativa */
body {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

input, textarea {
  user-select: auto;
  -webkit-user-select: auto;
}

/* En web/PWA, los TextInput de React Native renderizan como <input> o <textarea>.
   El feedback visual de foco se gestiona en los contenedores de componentes,
   por lo que eliminamos el contorno/halo nativo del navegador de forma global. */
input:focus,
textarea:focus,
select:focus {
  outline: none;
}
`;
