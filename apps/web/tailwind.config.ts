import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fffbe6',
          100: '#fff0a3',
          400: '#f9cc33',
          500: '#f8c202',
          600: '#d4a400',
        },
        camp: {
          50:  '#e6f0e9',
          400: '#1a6b30',
          500: '#024119',
          600: '#011d0c',
        },
        surface: {
          900: '#000000',
          800: '#0f0f0f',
          700: '#1a1a1a',
          600: '#242424',
          500: '#2e2e2e',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    function({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          display: 'none',
        },
      });
    },
  ],
};

export default config;
