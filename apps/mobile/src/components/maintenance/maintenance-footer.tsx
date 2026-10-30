import { ArrowLeft, ArrowRight, Send } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MaintenanceFooterProps {
  helperText: string;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
  isLastStep?: boolean;
}

export function MaintenanceFooter({
  helperText,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  isSubmitting = false,
  isLastStep = false,
}: MaintenanceFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      className="border-t border-slate-200 bg-white px-5 pt-3"
    >
      <View className="w-full max-w-xl self-center">
        <Text className="mb-3 text-center text-xs text-slate-600">{helperText}</Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={onPrevious}
            disabled={previousDisabled}
            accessibilityRole="button"
            accessibilityLabel="Volver al paso anterior"
            accessibilityState={{ disabled: previousDisabled }}
            className={`min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 active:bg-slate-200 ${previousDisabled ? 'opacity-40' : ''}`}
          >
            <ArrowLeft size={22} color="#334155" />
          </Pressable>
          <Pressable
            onPress={onNext}
            disabled={nextDisabled}
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? 'Finalizar mantención' : 'Siguiente paso'}
            accessibilityState={{ disabled: nextDisabled, busy: isSubmitting }}
            className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 active:bg-blue-700 ${nextDisabled ? 'opacity-60' : ''}`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : isLastStep ? (
              <Send size={18} color="#ffffff" />
            ) : (
              <ArrowRight size={18} color="#ffffff" />
            )}
            {isLastStep && !isSubmitting ? (
              <Text className="text-sm font-bold text-white">Finalizar</Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
