/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'plugin-bg': '#0d0d0f',
        'panel-bg': '#141418',
        'panel-border': '#2a2a35',
        'knob-inactive': '#2a2a35',
        'knob-active': '#c9a84c',
        'freeze-glow': '#3ecfcf',
        'shimmer-glow': '#a78bfa',
      },
      fontFamily: {
        display: ['Clash Display', 'Inter', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
