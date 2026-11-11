/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        surface: '#FFFFFF',
        line: '#E7E5E0',
        ink: '#1A1A1A',
        muted: '#6B6860',
        accent: { DEFAULT: '#1E5B4A', soft: '#E8F0ED' },
        amber: { DEFAULT: '#B7791F', soft: '#FBF3E2' },
        red: { DEFAULT: '#B42318', soft: '#FDECEA' },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '8px' },
      boxShadow: { none: 'none' },
    },
  },
  plugins: [],
}
