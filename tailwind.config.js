/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: { 850: '#151f32', 900: '#0f172a' }
      },
      fontFamily: { sans: ['Segoe UI', 'Inter', 'sans-serif'] }
    },
  },
  plugins: [],
}
