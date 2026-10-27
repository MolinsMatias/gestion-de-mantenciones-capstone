import React from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { useKeyboardOffset } from '@/hooks/use-keyboard-offset';

/**
 * Versión PWA: añade espacio inferior igual a la altura del teclado según `visualViewport`.
 * El hook resta `innerHeight`, así que no duplica el ajuste cuando el navegador ya
 * redimensiona el layout (`interactive-widget=resizes-content`).
 */
export function KeyboardAvoidingContainer({ children, style, ...props }: ViewProps) {
  const keyboardOffset = useKeyboardOffset();

  return (
    <View style={[style, keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : null]} {...props}>
      {children}
    </View>
  );
}
