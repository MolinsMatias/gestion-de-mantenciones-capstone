import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BowlingPinIconProps {
  size?: number;
  color?: string;
}

// Lucide no incluye un icono de bolo; se dibuja en SVG con trazo de línea.
export function BowlingPinIcon({ size = 20, color = '#94a3b8' }: BowlingPinIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a3 3 0 0 0-3 3c0 1.2.4 2 1.3 2.9C8.6 9.4 7.5 11.5 7.5 14.2c0 2.6 1 4.2 2 6.1.3.6.2 1.2.2 1.7h4.6c0-.5-.1-1.1.2-1.7 1-1.9 2-3.5 2-6.1 0-2.7-1.1-4.8-2.8-6.3C14.6 7 15 6.2 15 5a3 3 0 0 0-3-3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.6 11h6.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
