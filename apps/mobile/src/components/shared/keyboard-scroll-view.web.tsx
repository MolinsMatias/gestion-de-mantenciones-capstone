import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';

import { useKeyboardOffset } from '@/hooks/use-keyboard-offset';

export interface KeyboardScrollViewProps extends ScrollViewProps {
  bottomOffset?: number;
  resetScrollKey?: number;
}

interface WebScrollableElement extends HTMLElement {
  getScrollableNode?: () => HTMLElement | null;
}

function getDomScrollNode(ref: ScrollView | null): HTMLElement | null {
  if (!ref) return null;
  const candidate = ref as unknown as WebScrollableElement;
  if (typeof candidate.getScrollableNode === 'function') {
    return candidate.getScrollableNode();
  }
  if (candidate instanceof HTMLElement) {
    return candidate;
  }
  return null;
}

export function KeyboardScrollView({
  children,
  resetScrollKey,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  // En react-native-web, 'on-drag' ejecuta blur() en cualquier evento scroll (incluso el
  // auto-scroll del navegador al enfocar un input en Android PWA), cerrando el teclado solo.
  // Por eso en Web forzamos siempre 'none'.
  keyboardDismissMode: _ignoredKeyboardDismissMode,
  bottomOffset = 24,
  ...props
}: KeyboardScrollViewProps) {
  const keyboardOffset = useKeyboardOffset();
  const scrollRef = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    if (resetScrollKey !== undefined) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [resetScrollKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const ensureFocusedInputVisible = () => {
      const scrollNode = getDomScrollNode(scrollRef.current);
      const activeEl = document.activeElement;
      if (
        !scrollNode ||
        !(activeEl instanceof HTMLElement) ||
        (activeEl.tagName !== 'INPUT' &&
          activeEl.tagName !== 'TEXTAREA' &&
          !activeEl.isContentEditable) ||
        !scrollNode.contains(activeEl)
      ) {
        return;
      }

      const scrollRect = scrollNode.getBoundingClientRect();
      const inputRect = activeEl.getBoundingClientRect();
      const viewport = window.visualViewport;
      const visibleBottom = viewport
        ? Math.min(scrollRect.bottom, viewport.offsetTop + viewport.height)
        : scrollRect.bottom;

      const desiredBottomMargin = Math.max(24, bottomOffset);
      const overlapBottom = inputRect.bottom + desiredBottomMargin - visibleBottom;

      if (overlapBottom > 4) {
        scrollNode.scrollTop += overlapBottom;
      } else if (inputRect.top < scrollRect.top + 16) {
        scrollNode.scrollTop -= scrollRect.top + 16 - inputRect.top;
      }
    };

    const scheduleEnsureVisible = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(ensureFocusedInputVisible, 120);
    };

    document.addEventListener('focusin', scheduleEnsureVisible);
    window.visualViewport?.addEventListener('resize', scheduleEnsureVisible);

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      document.removeEventListener('focusin', scheduleEnsureVisible);
      window.visualViewport?.removeEventListener('resize', scheduleEnsureVisible);
    };
  }, [bottomOffset]);

  return (
    <ScrollView
      ref={scrollRef}
      {...props}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="none"
      contentContainerStyle={contentContainerStyle}
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
