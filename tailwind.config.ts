import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf8f3',
          100: '#f5eee3',
          200: '#ebdcbe',
          300: '#dec494',
          400: '#d1a66a',
          500: '#c58b45',
          600: '#b17138',
          700: '#935530',
          800: '#79452c',
          900: '#643a28',
          950: '#381e13',
        },
        celebration: {
          purple: '#6b21a8',
          gold: '#b45309',
          rose: '#be123c',
          emerald: '#047857',
          sky: '#0369a1',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;

