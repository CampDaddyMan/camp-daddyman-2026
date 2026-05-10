import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8e6',
          100: '#ffedb3',
          400: '#f5c842',
          500: '#e8b800',
          600: '#c49a00',
        },
        surface: {
          900: '#0d0d0d',
          800: '#141414',
          700: '#1c1c1c',
          600: '#242424',
          500: '#2e2e2e',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
