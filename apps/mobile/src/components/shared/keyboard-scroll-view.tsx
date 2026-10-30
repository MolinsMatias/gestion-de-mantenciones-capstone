import React, { useLayoutEffect, useRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

export interface KeyboardScrollViewProps extends ScrollViewProps {
  bottomOffset?: number;
  resetScrollKey?: number;
}

export function KeyboardScrollView({
  children,
  resetScrollKey,
  bottomOffset = 36,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  ...props
}: KeyboardScrollViewProps) {
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  useLayoutEffect(() => {
    if (resetScrollKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetScrollKey]);

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <KeyboardAwareScrollView
        ref={scrollRef}
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
