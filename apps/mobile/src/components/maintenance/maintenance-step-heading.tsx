import React from 'react';
import { Text, View } from 'react-native';

interface MaintenanceStepHeadingProps {
  title: string;
  step: number;
  isLastStep?: boolean;
}

export function MaintenanceStepHeading({
  title,
  step,
  isLastStep = false,
}: MaintenanceStepHeadingProps) {
  return (
    <View>
      {step === 0 || isLastStep ? (
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
          {step === 0 ? 'Antes de comenzar' : 'Último paso'}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-3">
        {step > 0 && !isLastStep ? (
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Text className="text-sm font-bold text-blue-700">{step}</Text>
          </View>
        ) : null}
        <Text accessibilityRole="header" className="flex-1 text-xl font-bold text-slate-900">
          {title}
        </Text>
      </View>
      {step === 0 || isLastStep ? (
        <Text className="mt-2 text-sm leading-6 text-slate-600">
          {step === 0
            ? 'Confirma el equipo y selecciona el tipo de trabajo que vas a realizar.'
            : 'Completa el registro antes de finalizar la mantención.'}
        </Text>
      ) : null}
    </View>
  );
}
