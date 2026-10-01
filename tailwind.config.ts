import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Luxury (Homepage)
        luxury: {
          bg: '#0a0a0a',
          gold: '#d4af37',
          goldDark: '#b8860b',
          card: 'rgba(255, 255, 255, 0.03)',
        },
        // Neon Cyberpunk (Product Sections)
        neon: {
          bg: '#0d1117',
          cyan: '#00f0ff',
          magenta: '#ff00aa',
          border: 'rgba(0, 240, 255, 0.2)',
        },
        // Neutrals
        surface: {
          DEFAULT: '#18181b',
          input: '#09090b',
          border: '#27272a',
        },
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.3)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-magenta': '0 0 20px rgba(255, 0, 170, 0.3)',
        'gold': '0 0 20px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
