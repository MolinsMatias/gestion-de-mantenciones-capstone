import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

export function KeyboardScrollView(props: ScrollViewProps) {
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <KeyboardAwareScrollView {...props} bottomOffset={24} />
    </KeyboardProvider>
  );
}
