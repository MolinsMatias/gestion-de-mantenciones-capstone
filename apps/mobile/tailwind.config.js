/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    boxShadow: {
      sm: '0px 1px 2px rgba(15, 23, 42, 0.04)',
      DEFAULT: '0px 1px 3px rgba(15, 23, 42, 0.06)',
      md: '0px 4px 8px rgba(15, 23, 42, 0.07)',
      lg: '0px 10px 15px rgba(15, 23, 42, 0.08)',
      xl: '0px 20px 25px rgba(15, 23, 42, 0.10)',
      '2xl': '0px 25px 50px rgba(15, 23, 42, 0.16)',
      none: '0 0 #0000',
    },
    extend: {
      colors: { brand: { dark: '#07162c', blue: '#1769e6', cyan: '#258bf5' } },
    },
  },
  plugins: [],
};
