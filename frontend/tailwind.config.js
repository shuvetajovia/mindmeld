/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable toggling dark mode via class on html/body
  theme: {
    extend: {
      colors: {
        bgPrimary: "var(--bg-primary)",
        bgCard: "var(--bg-card)",
        borderColor: "var(--border-color)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        
        alertGreen: "var(--alert-green)",
        alertYellow: "var(--alert-yellow)",
        alertOrange: "var(--alert-orange)",
        alertRed: "var(--alert-red)"
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
