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
        canvas: "#0c0e09",
        surface: "#151810",
        card: "#1e2218",
        border: "#2a3020",
        "border-bright": "#3d4a2e",
        lime: {
          DEFAULT: "#b6f040",
          dim: "#8abd2e",
          glow: "#d4ff6a",
        },
        amber: {
          app: "#f0a030",
          dim: "#c07818",
        },
        cyan: {
          app: "#40c8f0",
          dim: "#2898c0",
        },
        text: {
          primary: "#f0ece0",
          secondary: "#8a9070",
          muted: "#4a5438",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-subtle":
          "linear-gradient(rgba(42,48,32,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(42,48,32,0.4) 1px, transparent 1px)",
        "radial-lime":
          "radial-gradient(circle at 50% 50%, rgba(182,240,64,0.08) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        "lime-glow": "0 0 30px rgba(182,240,64,0.2)",
        "lime-sm": "0 0 12px rgba(182,240,64,0.15)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
