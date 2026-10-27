import React from 'react';
import type { ViewProps } from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';

/**
 * Contenedor que levanta su contenido solo lo necesario cuando aparece el teclado (Android).
 *
 * Mide cuánto se solapa realmente con el teclado (`automaticOffset` usa la posición absoluta
 * en la ventana), por lo que no duplica el desplazamiento si el sistema ya redimensionó la
 * ventana. Incluye su propio `KeyboardProvider` porque un `Modal` de Android vive en una
 * ventana nativa distinta a la de la app.
 */
export function KeyboardAvoidingContainer({ children, style, ...props }: ViewProps) {
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" automaticOffset style={style} {...props}>
        {children}
      </KeyboardAvoidingView>
    </KeyboardProvider>
  );
}
