// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg":         "#0c0c0c",
        "bg-2":       "#141414",
        "bg-card":    "#1a1a1a",
        "accent":     "#c4a46e",
        "accent-dim": "rgba(196,164,110,0.12)",
        "blanc":      "#edeae4",
        "texte":      "#7a7570",
        "texte-2":    "#aaa59e",
        "border":     "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans:  ["var(--font-sans)",  "system-ui", "sans-serif"],
      },
      borderRadius: {
        "pill": "100px",
      },
      animation: {
        "fade-in": "fadeIn 0.6s var(--ease) forwards",
        "slide-up": "slideUp 0.6s var(--ease) forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}

export default config