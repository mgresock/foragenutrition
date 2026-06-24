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
        // Editorial Ledger palette — near-black canvas + solid dark green
        canvas:  "#0c0c0c",   // black
        surface: "#151515",
        card:    "#1b1b1b",
        border:       "#2b2b2b",   // hairline
        "border-bright": "#3a3a3a",
        lime: {
          DEFAULT: "#2f9e44",   // solid dark green accent (opaque, not neon)
          dim:     "#1f6e2e",
          glow:    "#39b350",
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
          secondary: "#969c84",   // WCAG AA on canvas/surface/card
          muted:     "#868c72",   // WCAG AA (>=4.9:1) — was #565c46 which failed
        },
      },
      fontFamily: {
        display: ["Archivo Black", "Archivo", "-apple-system", "Segoe UI", "sans-serif"],
        body:    ["Hind", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
      },
      // Slightly softened corners — small radius on panels/buttons/inputs,
      // `full` restored to circular for avatars, dots, spinners, FAB.
      borderRadius: {
        none: "0",
        sm:   "3px",
        DEFAULT: "4px",
        md:   "5px",
        lg:   "6px",
        xl:   "8px",
        "2xl": "10px",
        "3xl": "12px",
        full: "9999px",
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
        "lime-glow":  "0 0 28px rgba(47,158,68,0.35)",
        "lime-sm":    "0 0 12px rgba(47,158,68,0.25)",
        card:         "none",
        "card-hover": "none",
      },
    },
  },
  plugins: [],
};

export default config;
