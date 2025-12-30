import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Compound color palette
        'navy': {
          900: '#0a0f1a',
          800: '#0d1424',
          700: '#111a2e',
          600: '#1a2540',
        },
        'cream': {
          50: '#FFFDF8',
          100: '#FBF7F0',
          200: '#F5EDE0',
          300: '#EDE3D0',
        },
        'accent': {
          yellow: '#F5C542',
          gold: '#D4A84B',
        },
        // Keep semantic colors for numbers
        'money-green': '#22C55E',
        'money-red': '#EF4444',
        // Legacy iOS colors (for compatibility)
        'ios-blue': '#007AFF',
        'ios-green': '#22C55E',
        'ios-red': '#EF4444',
        'ios-orange': '#F59E0B',
        'ios-yellow': '#F5C542',
        'ios-purple': '#8B5CF6',
        'ios-pink': '#EC4899',
        'ios-gray': {
          50: '#F9F9F9',
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#C7C7CC',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#3A3A3C',
          900: '#1C1C1E',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        'ios': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
      },
      boxShadow: {
        'ios': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'ios-lg': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'glow-yellow': '0 0 60px rgba(245, 197, 66, 0.15)',
        'glow-green': '0 0 60px rgba(34, 197, 94, 0.1)',
        'glow-blue': '0 0 60px rgba(59, 130, 246, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config
