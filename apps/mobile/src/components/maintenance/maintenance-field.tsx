import React from 'react';
import { Text, TextInput, View } from 'react-native';

import { Skeleton } from '@/components/shared/skeleton';

interface MaintenanceFieldContentProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
}

type MaintenanceFieldProps =
  { isLoading: true; label?: string } | (MaintenanceFieldContentProps & { isLoading?: false });

export function MaintenanceFieldSkeleton({ label }: { label?: string }) {
  return (
    <View className="mt-4">
      <Skeleton label={label ? `Cargando campo: ${label}` : 'Cargando campo de mantención'}>
        <View className="mb-2 h-5 w-44 rounded-md bg-slate-200" />
        <View className="min-h-24 rounded-xl border border-slate-200 bg-slate-100 p-3">
          <View className="h-3 w-4/5 rounded bg-slate-200" />
          <View className="mt-3 h-3 w-3/5 rounded bg-slate-200" />
        </View>
      </Skeleton>
    </View>
  );
}

export function MaintenanceField(props: MaintenanceFieldProps) {
  if (props.isLoading) return <MaintenanceFieldSkeleton label={props.label} />;
  const { label, value, onChangeText, placeholder, error } = props;
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm font-semibold text-slate-800">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        multiline
        textAlignVertical="top"
        className={`min-h-24 rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-900 ${error ? 'border-red-400' : 'border-slate-300'}`}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-xs text-red-700">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
