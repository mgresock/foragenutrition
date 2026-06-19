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
        canvas:  "#000000",
        surface: "#111111",
        card:    "#1C1C1E",
        border:       "#2C2C2E",
        "border-bright": "#3A3A3C",
        lime: {
          DEFAULT: "#34C759",
          dim:     "#248A3D",
          glow:    "#30D158",
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
          primary:   "#F2F2F7",
          secondary: "#8E8E93",
          muted:     "#48484A",
        },
      },
      fontFamily: {
        display: ["Archivo", "-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"],
        body:    ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
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
        "lime-glow":  "0 0 30px rgba(52,199,89,0.22)",
        "lime-sm":    "0 0 12px rgba(52,199,89,0.18)",
        card:         "0 4px 24px rgba(0,0,0,0.6)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
