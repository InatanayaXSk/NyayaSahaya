/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#bbbdf6",
        "lavender-grey": "#d0d1e6",
        "background-light": "#f6f6f8",
        "background-dark": "#111221",
        "card-dark": "#161726",
        "border-dark": "#2d2e45",
        "risk-high": "#ef4444",
        "risk-med": "#f59e0b",
        "risk-safe": "#10b981",
        // Dashboard variant colors
        "dash-primary": "#797A9E",
        "dash-secondary": "#9893DA",
        "dash-accent": "#BBBDF6",
        "dash-neutral-dark": "#625F63",
        "dash-neutral-dim": "#72727E",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "body": ["'IBM Plex Sans'", "sans-serif"],
        "serif-display": ["'Playfair Display'", "serif"],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px",
      },
    },
  },
  plugins: [],
}
