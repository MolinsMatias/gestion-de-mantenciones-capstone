import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Hook to track keyboard height on Android APK.
 */
export function useKeyboardOffset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}

/**
 * Returns true while the software keyboard is open on native Android/iOS.
 */
export function useIsKeyboardVisible(): boolean {
  const keyboardHeight = useKeyboardOffset();
  return keyboardHeight > 0;
}
