/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - deep navy to electric blue
        navy: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
        electric: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // PSA Rate indicators
        psa: {
          excellent: '#22c55e',
          good: '#eab308',
          rare: '#ef4444',
          legendary: '#f97316',
        },
        // Accent colors
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        // Card rarity colors
        rarity: {
          common: '#9ca3af',
          uncommon: '#22d3ee',
          rare: '#a855f7',
          holo: '#ec4899',
          ultra: '#f97316',
        }
      },
      fontFamily: {
        display: ['Archivo Black', 'system-ui', 'sans-serif'],
        heading: ['Bebas Neue', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 40px rgba(59, 130, 246, 0.3)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.4)',
        'glow-gold': '0 0 30px rgba(251, 191, 36, 0.4)',
      },
    },
  },
  plugins: [],
}
