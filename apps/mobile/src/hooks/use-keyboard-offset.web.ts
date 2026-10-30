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
 * - En Android Chrome (`interactive-widget=resizes-content` + `100dvh`), el navegador
 *   ya redimensiona `window.innerHeight` y `#root` automáticamente cuando se abre el
 *   teclado. En ese caso devolvemos `0` para no duplicar el espacio ni provocar saltos
 *   que cierren el teclado.
 * - En iOS Safari (que no reduce `window.innerHeight`), devolvemos la diferencia entre
 *   `window.innerHeight` y `visualViewport.height`.
 */
export function useKeyboardOffset(): number {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    let maxInnerHeight = window.innerHeight;
    let rafId: number | null = null;

    const update = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      if (window.innerHeight > maxInnerHeight) {
        maxInnerHeight = window.innerHeight;
      }

      // Si window.innerHeight se redujo significativamente, el navegador (Android Chrome)
      // ya redimensionó el layout viewport por sí mismo (resizes-content).
      const layoutShrunkByBrowser = maxInnerHeight - window.innerHeight > 80;
      if (layoutShrunkByBrowser) {
        setKeyboardOffset(0);
        return;
      }

      // En iOS Safari, window.innerHeight permanece fijo y solo visualViewport.height se reduce.
      const unshrunkDiff = Math.max(0, Math.round(window.innerHeight - viewport.height));
      const isIosKeyboardOpen =
        unshrunkDiff > 80 &&
        typeof document !== 'undefined' &&
        isEditableElement(document.activeElement);

      setKeyboardOffset(isIosKeyboardOpen ? unshrunkDiff : 0);
    };

    const scheduleUpdate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    window.visualViewport.addEventListener('resize', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    document.addEventListener('focusin', scheduleUpdate);
    document.addEventListener('focusout', scheduleUpdate);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
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
