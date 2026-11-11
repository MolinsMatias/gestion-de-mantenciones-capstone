import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

/**
 * Hook to track keyboard height on Android/iOS.
 */
export function useKeyboardOffset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const willShowSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const didShowSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const willHideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    const didHideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    const kcWillShowSub = KeyboardEvents.addListener('keyboardWillShow', (e) => {
      if (e.height > 0) setKeyboardHeight(e.height);
    });
    const kcDidShowSub = KeyboardEvents.addListener('keyboardDidShow', (e) => {
      if (e.height > 0) setKeyboardHeight(e.height);
    });
    const kcWillHideSub = KeyboardEvents.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    const kcDidHideSub = KeyboardEvents.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      willShowSub.remove();
      didShowSub.remove();
      willHideSub.remove();
      didHideSub.remove();
      kcWillShowSub.remove();
      kcDidShowSub.remove();
      kcWillHideSub.remove();
      kcDidHideSub.remove();
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
