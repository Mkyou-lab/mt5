/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mk-dark': '#0a0e1a',
        'mk-darker': '#050810',
        'mk-green': '#00ff88',
        'mk-green-dark': '#00cc6a',
        'mk-gray': '#1a1f2e',
        'mk-gray-light': '#2a3142',
      },
      fontFamily: {
        'mono': ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}