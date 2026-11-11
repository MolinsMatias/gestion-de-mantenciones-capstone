import React, { useLayoutEffect, useRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';

import { useIsKeyboardVisible } from '@/hooks/use-keyboard-offset';

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
  const isKeyboardVisible = useIsKeyboardVisible();
  const scrollRef = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    if (resetScrollKey !== undefined) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [resetScrollKey]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let settleId: ReturnType<typeof setTimeout> | null = null;

    const ensureFocusedInputVisible = () => {
      settleId = null;
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
      const pinnedRoot = scrollNode.closest('#root');
      const viewportTop = pinnedRoot?.getBoundingClientRect().top ?? viewport?.offsetTop ?? 0;
      const visibleTop = viewport ? Math.max(scrollRect.top, viewportTop) : scrollRect.top;
      const visibleBottom = viewport
        ? Math.min(scrollRect.bottom, viewportTop + viewport.height)
        : scrollRect.bottom;
      const visibleHeight = visibleBottom - visibleTop;
      if (visibleHeight <= 0) return;

      if (inputRect.height > visibleHeight) {
        if (Math.abs(inputRect.top - visibleTop) > 1) {
          scrollNode.scrollTop += inputRect.top - visibleTop;
        }
      } else if (inputRect.bottom > visibleBottom + 1) {
        scrollNode.scrollTop += inputRect.bottom - visibleBottom;
      } else if (inputRect.top < visibleTop - 1) {
        scrollNode.scrollTop += inputRect.top - visibleTop;
      }
    };

    const scheduleEnsureVisible = () => {
      if (settleId !== null) clearTimeout(settleId);
      settleId = setTimeout(ensureFocusedInputVisible, 180);
    };

    scheduleEnsureVisible();

    const scrollNode = getDomScrollNode(scrollRef.current);
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleEnsureVisible);
    if (scrollNode) resizeObserver?.observe(scrollNode);

    document.addEventListener('focusin', scheduleEnsureVisible);
    document.addEventListener('input', scheduleEnsureVisible);
    window.addEventListener('resize', scheduleEnsureVisible);
    window.addEventListener('scroll', scheduleEnsureVisible);
    window.visualViewport?.addEventListener('resize', scheduleEnsureVisible);
    window.visualViewport?.addEventListener('scroll', scheduleEnsureVisible);

    return () => {
      if (settleId !== null) clearTimeout(settleId);
      resizeObserver?.disconnect();
      document.removeEventListener('focusin', scheduleEnsureVisible);
      document.removeEventListener('input', scheduleEnsureVisible);
      window.removeEventListener('resize', scheduleEnsureVisible);
      window.removeEventListener('scroll', scheduleEnsureVisible);
      window.visualViewport?.removeEventListener('resize', scheduleEnsureVisible);
      window.visualViewport?.removeEventListener('scroll', scheduleEnsureVisible);
    };
  }, [bottomOffset, isKeyboardVisible]);

  return (
    <ScrollView
      ref={scrollRef}
      {...props}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="none"
      contentContainerStyle={contentContainerStyle}
    >
      {children}
      {isKeyboardVisible ? (
        <div
          aria-hidden="true"
          style={{
            height: `max(0px, calc(100dvh - var(--keyboard-viewport-height, 100dvh) + ${bottomOffset}px))`,
            flexShrink: 0,
          }}
        />
      ) : null}
    </ScrollView>
  );
}
