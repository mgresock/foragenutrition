import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Editorial Ledger palette — dark broadsheet paper + acid lime
        canvas:  "#0a0d08",   // paper: near-black with green undertone
        surface: "#10140d",
        card:    "#161a10",
        border:       "#282c20",   // hairline
        "border-bright": "#3c4230",
        lime: {
          DEFAULT: "#62e23f",   // acid lime accent
          dim:     "#3f9e2b",
          glow:    "#7df257",
        },
        amber: {
          app: "#FF9F0A",
          dim: "#C47B00",
        },
        cyan: {
          app: "#32ADE6",
          dim: "#0071A4",
        },
        text: {
          primary:   "#f2f4e8",   // warm off-white ink
          secondary: "#969c84",
          muted:     "#565c46",
        },
      },
      fontFamily: {
        display: ["Archivo Black", "Archivo", "-apple-system", "Segoe UI", "sans-serif"],
        body:    ["Hind", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
      },
      // Editorial Ledger: sharp corners EVERYWHERE — panels, buttons, inputs,
      // avatars, pips. Matches the broadsheet reference (square avatar + bars).
      // Circular SVG progress rings are stroke-based, so unaffected by this.
      borderRadius: {
        none: "0",
        sm:   "0",
        DEFAULT: "0",
        md:   "0",
        lg:   "0",
        xl:   "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      backgroundImage: {
        "grid-subtle":
          "linear-gradient(rgba(44,44,46,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(44,44,46,0.35) 1px, transparent 1px)",
        "radial-lime":
          "radial-gradient(circle at 50% 50%, rgba(52,199,89,0.07) 0%, transparent 70%)",
      },
      backgroundSize: { grid: "40px 40px" },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float:        "float 6s ease-in-out infinite",
        "slide-up":   "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in":    "fadeIn 0.4s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        // Editorial Ledger: flat broadsheet — no elevation, hairline borders do
        // the separating. Keep the acid-lime glow on primary CTAs (per reference).
        "lime-glow":  "0 0 28px rgba(98,226,63,0.30)",
        "lime-sm":    "0 0 12px rgba(98,226,63,0.22)",
        card:         "none",
        "card-hover": "none",
      },
    },
  },
  plugins: [],
};

export default config;
