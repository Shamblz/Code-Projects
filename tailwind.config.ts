import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/client/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0b3d2e',
          dark: '#06251c',
          light: '#16584a',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f5d976',
          dark: '#a8841f',
        },
        velvet: {
          DEFAULT: '#7a1f1f',
          light: '#a82d2d',
          dark: '#4d1212',
        },
        ivory: '#f5e8c7',
      },
      fontFamily: {
        display: ['var(--font-limelight)', 'serif'],
        heading: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      boxShadow: {
        'felt-inset': 'inset 0 0 80px rgba(0,0,0,0.6)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.5)',
        'chip': '0 2px 6px rgba(0,0,0,0.5), inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.2)',
      },
      animation: {
        'gold-shimmer': 'gold-shimmer 2s ease-in-out infinite',
        'chip-slide': 'chip-slide 0.5s ease-out',
        'pot-pulse': 'pot-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'gold-shimmer': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.9)' },
        },
        'chip-slide': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) scale(0.8)', opacity: '0' },
        },
        'pot-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
