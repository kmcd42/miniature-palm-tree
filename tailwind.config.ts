import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // AETHER-OS palette — Nostromo terminal
        graphite: {
          950: '#04070A',
          900: '#070B0F',
          850: '#0B1116',
          800: '#0E1418',
          750: '#121A20',
          700: '#162026',
          650: '#1A262D',
          600: '#1F2C33',
          550: '#26343C',
          500: '#2A3E47',
          450: '#33495A',
          400: '#3D5762',
        },
        ink: {
          50: '#F5FAFC',
          100: '#E5EEF1',
          200: '#C5D2D7',
          300: '#B8C5CA',
          500: '#98A6AC',
          600: '#7E8B91',
          700: '#5E6D72',
          800: '#384449',
        },
        phosphor: {
          amber: '#FFB453',
          'amber-dim': '#B07E3D',
          'amber-deep': '#8C6230',
          mint: '#7FF0BD',
          'mint-dim': '#5BB088',
          'mint-deep': '#3D7D60',
          red: '#FF6B5C',
          'red-dim': '#B0494D',
          cyan: '#5BC8FF',
          'cyan-dim': '#3F8BB0',
          violet: '#C599FF',
          'violet-dim': '#8A6BB0',
        },
        // Legacy aliases so older class refs still work
        'money-green': '#7FF0BD',
        'money-red': '#FF6B5C',
        'ios-blue': '#5BC8FF',
        'ios-green': '#7FF0BD',
        'ios-red': '#FF6B5C',
        'ios-orange': '#FFB453',
        'ios-yellow': '#FFB453',
        'ios-purple': '#C599FF',
        'ios-pink': '#FF6B5C',
        'ios-gray': {
          50: '#F5FAFC',
          100: '#E5EEF1',
          200: '#C5D2D7',
          300: '#A8B7BC',
          400: '#7A8B91',
          500: '#5E6D72',
          600: '#4A595F',
          700: '#384449',
          800: '#1F2C33',
          900: '#0E1418',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        // No serif — `font-serif` is aliased to the mono stack so any leftover
        // usage still reads as terminal type instead of falling back to system serif.
        serif: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'panel': '4px',
        'ios': '6px',
        'ios-lg': '8px',
        'ios-xl': '10px',
      },
      boxShadow: {
        'panel': '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 0 0 1px rgba(42, 62, 71, 0.4), 0 12px 32px -16px rgba(0, 0, 0, 0.7)',
        'panel-glow': '0 0 0 1px rgba(255, 180, 83, 0.25), 0 0 24px -4px rgba(255, 180, 83, 0.18)',
        'glow-amber': '0 0 16px rgba(255, 180, 83, 0.35)',
        'glow-mint': '0 0 16px rgba(127, 240, 189, 0.35)',
        'glow-red': '0 0 16px rgba(255, 107, 92, 0.35)',
        'glow-cyan': '0 0 16px rgba(91, 200, 255, 0.35)',
      },
      letterSpacing: {
        'term': '0.14em',
        'term-tight': '0.06em',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
          '53%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        flicker: 'flicker 4s linear infinite',
        scan: 'scan 8s linear infinite',
        blink: 'blink 1.2s steps(1) infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
