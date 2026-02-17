import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        dark: { 900: '#0a0a0f', 800: '#12121a', 700: '#1a1a26', 600: '#222233' },
        accent: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
export default config;
