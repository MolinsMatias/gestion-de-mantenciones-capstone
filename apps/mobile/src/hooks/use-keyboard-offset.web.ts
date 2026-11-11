import { useEffect, useState } from 'react';

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Hook para detectar el espacio adicional requerido por el teclado virtual en PWA móvil.
 *
 * Con `interactive-widget=resizes-visual` y `100dvh`, el teclado reduce únicamente
 * `window.visualViewport` sin encoger `#root`. Calculamos la altura cubierta por el
 * teclado mediante `visualViewport` para que solo los contenedores desplazables
 * (`KeyboardScrollView`, `LocalBottomSheet`) agreguen espacio inferior y desplacen el
 * input enfocado sin levantar la interfaz general.
 */
export function useKeyboardOffset(): number {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    let rafId: number | null = null;

    const update = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const activeEditable =
        typeof document !== 'undefined' && isEditableElement(document.activeElement);

      if (!activeEditable) {
        setKeyboardOffset(0);
        return;
      }

      const coveredBottom = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
      );

      setKeyboardOffset(window.innerHeight - viewport.height > 80 ? coveredBottom : 0);
    };

    const scheduleUpdate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    window.visualViewport.addEventListener('resize', scheduleUpdate);
    window.visualViewport.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    document.addEventListener('focusin', scheduleUpdate);
    document.addEventListener('focusout', scheduleUpdate);
    scheduleUpdate();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      document.removeEventListener('focusin', scheduleUpdate);
      document.removeEventListener('focusout', scheduleUpdate);
    };
  }, []);

  return keyboardOffset;
}

/**
 * Devuelve `true` cuando el teclado virtual está abierto en PWA móvil (Android o iOS),
 * permitiendo ocultar barras flotantes inferiores como `AppTabs` mientras se escribe.
 */
export function useIsKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let maxInnerHeight = window.innerHeight;
    let rafId: number | null = null;

    const checkVisibility = () => {
      const viewport = window.visualViewport;
      if (window.innerHeight > maxInnerHeight) {
        maxInnerHeight = window.innerHeight;
      }

      const activeEditable =
        typeof document !== 'undefined' && isEditableElement(document.activeElement);

      if (!activeEditable) {
        setIsVisible(false);
        return;
      }

      const layoutShrunk = maxInnerHeight - window.innerHeight > 100;
      const visualShrunk = viewport ? maxInnerHeight - viewport.height > 100 : false;

      setIsVisible(layoutShrunk || visualShrunk);
    };

    const scheduleCheck = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        checkVisibility();
      });
    };

    window.visualViewport?.addEventListener('resize', scheduleCheck);
    window.addEventListener('resize', scheduleCheck);
    document.addEventListener('focusin', scheduleCheck);
    document.addEventListener('focusout', scheduleCheck);
    scheduleCheck();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener('resize', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
      document.removeEventListener('focusin', scheduleCheck);
      document.removeEventListener('focusout', scheduleCheck);
    };
  }, []);

  return isVisible;
}
