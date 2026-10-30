import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface MaintenanceFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
}

export function MaintenanceField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: MaintenanceFieldProps) {
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
