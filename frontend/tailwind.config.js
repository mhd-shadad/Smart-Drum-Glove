/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#090a0f",
          card: "#12141a",
          cardHover: "#171a23",
          elevated: "#1c202b",
          surface: "#242936",
          border: "#242835",
          borderLight: "#33394b",
          cream: "#f4ede4",
          creamMuted: "#b8b0a4",
          gold: "#d4a373",
          goldBright: "#f5c48b",
          amber: "#ffb46b",
          amberBright: "#ffc98a",
          cyan: "#38bdf8",
          green: "#10b981",
          red: "#ef4444",
          metal: "#94a3b8",
          metalDark: "#475569"
        },
        // Backwards compatibility alias for cyber -> studio
        cyber: {
          bg: "#090a0f",
          panel: "#12141a",
          panelHover: "#171a23",
          border: "#242835",
          borderLight: "#33394b",
          cyan: "#38bdf8",
          green: "#10b981",
          amber: "#ffb46b",
          red: "#ef4444",
          purple: "#c084fc",
          textMuted: "#94a3b8",
          textBright: "#f4ede4"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "Monaco", "monospace"]
      },
      boxShadow: {
        glowGold: "0 0 20px -3px rgba(212, 163, 115, 0.4)",
        glowAmber: "0 0 25px -2px rgba(255, 180, 107, 0.65)",
        glowGreen: "0 0 16px -3px rgba(16, 185, 129, 0.45)",
        glowRed: "0 0 16px -3px rgba(239, 68, 68, 0.45)",
        glowCyan: "0 0 16px -3px rgba(56, 189, 248, 0.45)",
        proInset: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.07), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.7)",
      }
    },
  },
  plugins: [],
}
