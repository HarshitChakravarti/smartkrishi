/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, farmer-friendly palette (soft greens + earthy neutrals)
        'agri-green': '#1f5b3a',        // primary
        'agri-light-green': '#2f7d4a',  // CTA
        'agri-bg': '#f7f4ee',           // background
        'agri-card': '#fffdf7',
        'agri-muted': '#f1efe6',
        'agri-earth': '#b08968',
        'agri-ink': '#1f2b1f',
      },
    },
  },
  plugins: [],
}
