import React, { useLayoutEffect, useRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';

import { useKeyboardOffset } from '@/hooks/use-keyboard-offset';

export interface KeyboardScrollViewProps extends ScrollViewProps {
  bottomOffset?: number;
  resetScrollKey?: number;
}

export function KeyboardScrollView({
  children,
  resetScrollKey,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  bottomOffset = 0,
  ...props
}: KeyboardScrollViewProps) {
  const keyboardOffset = useKeyboardOffset();
  const scrollRef = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    if (resetScrollKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetScrollKey]);

  return (
    <ScrollView
      ref={scrollRef}
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
