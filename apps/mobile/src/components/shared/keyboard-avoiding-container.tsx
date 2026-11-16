import React from 'react';
import type { ViewProps } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

/**
 * Contenedor que levanta su contenido solo lo necesario cuando aparece el teclado (Android/iOS).
 *
 * Mide cuánto se solapa realmente con el teclado (`automaticOffset` usa la posición absoluta
 * en la ventana), por lo que no duplica el desplazamiento si el sistema ya redimensionó la
 * ventana. Utiliza el `KeyboardProvider` global montado en `src/app/_layout.tsx`.
 */
export function KeyboardAvoidingContainer({ children, style, ...props }: ViewProps) {
  return (
    <KeyboardAvoidingView behavior="padding" automaticOffset style={style} {...props}>
      {children}
    </KeyboardAvoidingView>
  );
}
