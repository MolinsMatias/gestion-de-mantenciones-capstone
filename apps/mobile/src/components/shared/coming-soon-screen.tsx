import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ComingSoonScreenProps {
  title: string;
}

/** Marcador de las secciones de la barra inferior cuyo mockup aún no se implementa. */
export function ComingSoonScreen({ title }: ComingSoonScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-slate-50 px-6"
      style={{ paddingTop: insets.top }}
    >
      <Text accessibilityRole="header" className="text-xl font-bold text-slate-800">
        {title}
      </Text>
      <Text className="mt-2 text-center text-sm text-slate-500">
        Próxima pantalla a implementar según el mockup
      </Text>
    </View>
  );
}
