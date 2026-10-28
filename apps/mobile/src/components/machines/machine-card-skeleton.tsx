import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface MachineCardSkeletonProps {
  count?: number;
}

/**
 * Renders animated skeleton placeholders matching the exact layout of `MachineCard`.
 * Uses standard `View` elements for NativeWind classes inside `Animated.View`
 * to ensure full compatibility with both Android Native and Web PWA.
 */
export function MachineCardSkeletonList({ count = 6 }: MachineCardSkeletonProps) {
  const pulseOpacity = useSharedValue(0.45);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulseOpacity);
    };
  }, [pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando listado de máquinas"
      className="flex-col gap-3"
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"
        >
          <Animated.View style={animatedStyle}>
            <View className="flex-row items-center">
              {/* Miniatura skeleton */}
              <View className="h-20 w-20 shrink-0 rounded-xl bg-slate-200" />

              {/* Líneas de texto skeleton */}
              <View className="ml-3.5 min-w-0 flex-1 justify-center">
                <View className="h-4 w-3/5 rounded-md bg-slate-200" />
                <View className="mt-2 h-3 w-4/5 rounded-md bg-slate-200/80" />

                <View className="mt-3 flex-row items-center">
                  <View className="mr-2 h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <View className="h-3 w-24 rounded-md bg-slate-200" />
                </View>
              </View>

              {/* Indicador derecho skeleton */}
              <View className="ml-2 pl-1">
                <View className="h-5 w-5 rounded-md bg-slate-200/70" />
              </View>
            </View>
          </Animated.View>
        </View>
      ))}
    </View>
  );
}
