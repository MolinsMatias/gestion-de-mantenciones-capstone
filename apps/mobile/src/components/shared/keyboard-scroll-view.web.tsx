import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';

import { useKeyboardOffset } from '@/hooks/use-keyboard-offset';

export interface KeyboardScrollViewProps extends ScrollViewProps {
  bottomOffset?: number;
}

export function KeyboardScrollView({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  bottomOffset = 0,
  ...props
}: KeyboardScrollViewProps) {
  const keyboardOffset = useKeyboardOffset();

  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      contentContainerStyle={contentContainerStyle}
      {...props}
    >
      {children}
      {keyboardOffset > 0 ? (
        <View
          style={{
            height: keyboardOffset + bottomOffset,
            minHeight: keyboardOffset + bottomOffset,
          }}
        />
      ) : null}
    </ScrollView>
  );
}
