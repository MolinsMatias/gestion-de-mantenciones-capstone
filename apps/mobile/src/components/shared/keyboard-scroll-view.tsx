import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

export interface KeyboardScrollViewProps extends ScrollViewProps {
  bottomOffset?: number;
}

export function KeyboardScrollView({
  children,
  bottomOffset = 36,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  ...props
}: KeyboardScrollViewProps) {
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <KeyboardAwareScrollView
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
    </KeyboardProvider>
  );
}
