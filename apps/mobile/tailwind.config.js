/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { brand: { dark: '#07162c', blue: '#1769e6', cyan: '#258bf5' } },
    },
  },
  plugins: [],
};
