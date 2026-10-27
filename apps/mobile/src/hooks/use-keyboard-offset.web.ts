import { useEffect, useState } from 'react';

/**
 * Hook para detectar la apertura y altura del teclado virtual en la PWA móvil.
 * Utiliza la API standard window.visualViewport presente en navegadores móviles (Safari iOS y Chrome Android).
 */
export function useKeyboardOffset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // La diferencia entre innerHeight y la altura visual disponible es la altura del teclado virtual
      const diff = window.innerHeight - viewport.height;
      // Umbral de 60px para evitar fluctuaciones por barras de navegación
      const isKeyboardOpen = diff > 60;
      setKeyboardHeight(isKeyboardOpen ? diff : 0);

      // Safari desplaza la página para mostrar el input enfocado aunque el layout ya lo
      // deje visible; devolvemos el scroll a 0 para que la app no "salte".
      if (isKeyboardOpen && (window.scrollY !== 0 || viewport.offsetTop !== 0)) {
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return keyboardHeight;
}
