/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        champagne: {
          50: '#faf8f3',
          100: '#f5f0e6',
          200: '#e9ddc4',
          300: '#ddc9a2',
          400: '#d1b580',
          500: '#c9a961', // Main champagne gold
          600: '#b89548',
          700: '#9a7a3a',
          800: '#7d6230',
          900: '#655028',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
