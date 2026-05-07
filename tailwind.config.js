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
        "primary": "rgb(var(--color-primary) / <alpha-value>)",
        "background": "rgb(var(--color-background) / <alpha-value>)",
        "surface": "rgb(var(--color-surface) / <alpha-value>)",
        "border": "rgb(var(--color-border) / <alpha-value>)",
        "text-base": "rgb(var(--color-text-base) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        "lavender-grey": "#d0d1e6",
        "background-light": "#f6f6f8",
        "background-dark": "#111221",
        "card-dark": "#161726",
        "border-dark": "#2d2e45",
        "risk-high": "#ef4444",
        "risk-med": "#f59e0b",
        "risk-safe": "#10b981",
      },
      borderColor: theme => ({
        ...theme('colors'),
        DEFAULT: "rgb(var(--color-border) / 0.2)",
      }),
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
