import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type View,
} from 'react-native';

const PULL_ACTIVATE_DEADZONE = 8;
const PULL_TRIGGER_THRESHOLD = 54;
const MAX_PULL_DISTANCE = 88;
const PULL_DAMPING = 0.48;

interface WebDomTouch {
  clientY: number;
}

interface WebDomTouchEvent {
  touches?: ArrayLike<WebDomTouch>;
  cancelable?: boolean;
  preventDefault?: () => void;
}

interface WebDomMouseEvent {
  button?: number;
  clientY?: number;
}

interface WebDomElement {
  addEventListener?: (
    type: string,
    listener: (event: unknown) => void,
    options?: boolean | { passive?: boolean },
  ) => void;
  removeEventListener?: (
    type: string,
    listener: (event: unknown) => void,
    options?: boolean | { passive?: boolean },
  ) => void;
}

export interface UseWebPullToRefreshOptions {
  isRefreshing: boolean;
  onRefresh: () => Promise<void> | void;
}

export interface UseWebPullToRefreshResult {
  containerRef: RefObject<View | null>;
  pullDistance: number;
  isThresholdReached: boolean;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Enables native-feeling pull-to-refresh on Web/PWA (`Platform.OS === 'web'`)
 * for both mobile touch screens (`touchstart`/`touchmove`/`touchend` with `passive: false`)
 * and desktop pointer drag (`mousedown`/`mousemove`/`mouseup`).
 * On Android/iOS native, this hook is a no-op so native `RefreshControl` works normally.
 */
export function useWebPullToRefresh({
  isRefreshing,
  onRefresh,
}: UseWebPullToRefreshOptions): UseWebPullToRefreshResult {
  const containerRef = useRef<View | null>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);

  const scrollOffsetRef = useRef<number>(0);
  const startYRef = useRef<number | null>(null);
  const currentPullRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const rawNode: unknown = containerRef.current;
    if (!rawNode || typeof rawNode !== 'object') return;
    const domNode = rawNode as WebDomElement;
    if (
      typeof domNode.addEventListener !== 'function' ||
      typeof domNode.removeEventListener !== 'function'
    ) {
      return;
    }

    const resetGesture = () => {
      startYRef.current = null;
      isMouseDownRef.current = false;
      if (currentPullRef.current > 0) {
        currentPullRef.current = 0;
        setPullDistance(0);
      }
    };

    const startPullAt = (clientY: number) => {
      if (isRefreshingRef.current || scrollOffsetRef.current > 2) {
        startYRef.current = null;
        return;
      }
      startYRef.current = clientY;
    };

    const movePullTo = (clientY: number, preventNativeOverscroll?: () => void) => {
      if (isRefreshingRef.current || startYRef.current === null) return;

      if (scrollOffsetRef.current > 2) {
        resetGesture();
        return;
      }

      const deltaY = clientY - startYRef.current;
      if (deltaY <= PULL_ACTIVATE_DEADZONE) {
        if (currentPullRef.current > 0) {
          currentPullRef.current = 0;
          setPullDistance(0);
        }
        return;
      }

      preventNativeOverscroll?.();

      const damped = Math.min(
        MAX_PULL_DISTANCE,
        Math.round((deltaY - PULL_ACTIVATE_DEADZONE) * PULL_DAMPING),
      );
      currentPullRef.current = damped;
      setPullDistance(damped);
    };

    const finishPull = () => {
      const finalPull = currentPullRef.current;
      resetGesture();

      if (finalPull >= PULL_TRIGGER_THRESHOLD && !isRefreshingRef.current) {
        void onRefreshRef.current();
      }
    };

    const onTouchStart = (rawEvent: unknown) => {
      const event = rawEvent as WebDomTouchEvent;
      const firstTouch = event.touches?.[0];
      if (firstTouch && typeof firstTouch.clientY === 'number') {
        startPullAt(firstTouch.clientY);
      }
    };

    const onTouchMove = (rawEvent: unknown) => {
      const event = rawEvent as WebDomTouchEvent;
      const firstTouch = event.touches?.[0];
      if (!firstTouch || typeof firstTouch.clientY !== 'number') return;

      movePullTo(firstTouch.clientY, () => {
        if (event.cancelable && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      });
    };

    const onTouchEnd = () => {
      finishPull();
    };

    const onMouseDown = (rawEvent: unknown) => {
      const event = rawEvent as WebDomMouseEvent;
      if (event.button !== 0 || typeof event.clientY !== 'number') return;
      if (scrollOffsetRef.current <= 2 && !isRefreshingRef.current) {
        isMouseDownRef.current = true;
        startPullAt(event.clientY);
      }
    };

    const onMouseMove = (rawEvent: unknown) => {
      if (!isMouseDownRef.current) return;
      const event = rawEvent as WebDomMouseEvent;
      if (typeof event.clientY !== 'number') return;
      movePullTo(event.clientY);
    };

    const onMouseUp = () => {
      if (!isMouseDownRef.current) return;
      finishPull();
    };

    domNode.addEventListener('touchstart', onTouchStart, { passive: true });
    domNode.addEventListener('touchmove', onTouchMove, { passive: false });
    domNode.addEventListener('touchend', onTouchEnd, { passive: true });
    domNode.addEventListener('touchcancel', onTouchEnd, { passive: true });
    domNode.addEventListener('mousedown', onMouseDown);
    domNode.addEventListener('mousemove', onMouseMove);
    domNode.addEventListener('mouseup', onMouseUp);
    domNode.addEventListener('mouseleave', onMouseUp);

    return () => {
      domNode.removeEventListener?.('touchstart', onTouchStart);
      domNode.removeEventListener?.('touchmove', onTouchMove);
      domNode.removeEventListener?.('touchend', onTouchEnd);
      domNode.removeEventListener?.('touchcancel', onTouchEnd);
      domNode.removeEventListener?.('mousedown', onMouseDown);
      domNode.removeEventListener?.('mousemove', onMouseMove);
      domNode.removeEventListener?.('mouseup', onMouseUp);
      domNode.removeEventListener?.('mouseleave', onMouseUp);
    };
  }, []);

  return {
    containerRef,
    pullDistance,
    isThresholdReached: pullDistance >= PULL_TRIGGER_THRESHOLD,
    handleScroll,
  };
}
