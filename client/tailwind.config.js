/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // PROVISION color palette
        provision: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#222222',
          muted: '#333333',
          text: '#e8e8e8',
          dim: '#888888',
          // Status colors
          savings: '#22c55e',       // green — any savings
          'near-free': '#eab308',   // yellow — near free <$0.25
          free: '#4ade80',          // bright green — free
          profit: '#fbbf24',        // gold — profit (negative price)
          alert: '#ef4444',         // red — expiring soon
          // Store chain colors
          kroger: '#0052a5',
          target: '#cc0000',
          walmart: '#0071ce',
          aldi: '#00adef',
          dollar: '#6b21a8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
