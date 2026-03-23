/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'agri-green': '#4f6b32',
        'agri-green-deep': '#394d24',
        'agri-green-soft': '#e4ead9',
        'agri-bg': '#ede5d7',
        'agri-card': '#fff8ee',
        'agri-muted': '#f2eadb',
        'agri-border': '#d8ccb8',
        'agri-soil': '#71573b',
        'agri-soil-soft': '#eee0cf',
        'agri-wheat': '#b79247',
        'agri-wheat-soft': '#f4e8c3',
        'agri-ink': '#263121',
        'agri-ink-soft': '#667059',
        'agri-danger': '#b42318',
        'agri-alert': '#b7791f',
      },
      boxShadow: {
        panel: '0 22px 55px rgba(28, 36, 24, 0.22)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
      },
    },
  },
  plugins: [],
}
