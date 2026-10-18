import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const bgImage = require('@/assets/images/bowling-bg.jpg');
const logoImage = require('@/assets/images/logo.png');

export function LoginHeader() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Altura proporcional que muestra más imagen de bowling (~42-44% de pantalla)
  const headerHeight = Math.min(380, Math.max(300, Math.round(screenHeight * 0.43) + insets.top));

  return (
    <View
      className="relative w-full overflow-hidden bg-brand-dark"
      style={{ height: headerHeight, flexShrink: 0 }}
    >
      {/* Imagen de fondo de alta calidad optimizada para web y móvil */}
      <Image
        source={bgImage}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="left"
        priority="high"
      />

      {/* Gradiente refinado: más translúcido arriba para resaltar las pistas y pines iluminados */}
      <LinearGradient
        colors={['rgba(7, 22, 44, 0.12)', 'rgba(7, 22, 44, 0.55)', '#07162c']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Contenido institucional: logo, saludo y subtítulo */}
      <View
        style={{ paddingTop: Math.max(insets.top, 20) }}
        className="flex-1 items-center justify-end px-6 pb-6"
      >
        <Image
          source={logoImage}
          style={{ width: 210, height: 105 }}
          contentFit="contain"
          accessibilityLabel="Bowling Service Electronics"
        />
        <Text accessibilityRole="header" className="mt-3 text-center text-4xl font-bold text-white">
          Bienvenido
        </Text>
        <Text className="mt-1 text-center text-sm text-slate-300">
          Sistema de gestión de mantenciones
        </Text>
      </View>
    </View>
  );
}
