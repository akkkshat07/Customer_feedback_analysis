/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#0d968b",
        "background-light": "#f6f8f8",
        "background-dark": "#05080f",
        "surface-dark": "#0d1220",
        "accent-indigo": "#4f46e5",
        "accent-teal": "#14b8a6",
        esme: {
          teal: '#0d968b',
          gold: '#C5A059',
          blue: '#102220',
        }
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
