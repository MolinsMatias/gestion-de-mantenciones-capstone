import { ArrowLeft, Clock } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/shared/app-header';

interface MaintenanceHeaderProps {
  title: string;
  step: number;
  totalSteps?: number;
  elapsedTime: string;
  isOnline: boolean;
  onBack: () => void;
  disabled?: boolean;
}

export function MaintenanceHeader({
  title,
  step,
  totalSteps,
  elapsedTime,
  isOnline,
  onBack,
  disabled = false,
}: MaintenanceHeaderProps) {
  const progress = totalSteps ? Math.round((step / totalSteps) * 100) : 0;
  return (
    <AppHeader
      title="Mantención"
      subtitle={title}
      leadingElement={
        <Pressable
          onPress={onBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior"
          accessibilityState={{ disabled }}
          className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
        >
          <ArrowLeft size={20} color="#ffffff" />
        </Pressable>
      }
      rightElement={
        <View className="flex-row items-center gap-2">
          <View
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
          />
          <Text className="text-xs font-medium text-slate-200">
            {isOnline ? 'En línea' : 'Modo local'}
          </Text>
        </View>
      }
    >
      <View className="w-full max-w-xl self-center border-t border-white/10 pt-4">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text accessibilityLiveRegion="polite" className="text-xs font-semibold text-white">
            {totalSteps ? `Paso ${step} de ${totalSteps}` : `Paso ${step}`}
          </Text>
          <View className="flex-row items-center gap-2">
            <Clock size={14} color="#cbd5e1" />
            <Text className="text-xs font-medium text-slate-200">{elapsedTime}</Text>
          </View>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={
            totalSteps ? 'Progreso de pasos de la mantención' : 'Cargando pauta de mantención'
          }
          accessibilityState={{ busy: !totalSteps }}
          accessibilityValue={totalSteps ? { min: 1, max: totalSteps, now: step } : undefined}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"
        >
          <View className="h-full rounded-full bg-blue-400" style={{ width: `${progress}%` }} />
        </View>
      </View>
    </AppHeader>
  );
}
