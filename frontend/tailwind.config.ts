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
        navy: "#0A2E6E",
        royal: "#0E4DA4",
        sky: "#3B82D6",
        ink: "#15233D",
        muted: "#64748B",
        hair: "#E4ECF7",
        mist: "#EAF1FB",
        canvas: "#EDF3FB",
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10,46,110,0.04), 0 10px 30px -16px rgba(10,46,110,0.20)",
        card: "0 2px 10px -4px rgba(10,46,110,0.10), 0 24px 50px -30px rgba(10,46,110,0.35)",
        glow: "0 14px 34px -10px rgba(14,77,164,0.50)",
        nav: "0 -10px 40px -16px rgba(10,46,110,0.28)",
        ring: "0 0 0 1px rgba(14,77,164,0.10)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        brand: "linear-gradient(135deg, #0E4DA4 0%, #3B82D6 100%)",
        "brand-deep": "linear-gradient(140deg, #0A2E6E 0%, #0E4DA4 55%, #3B82D6 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "float-slow": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "float-slow": "float-slow 7s ease-in-out infinite",
        "glow-pulse": "glow-pulse 5s ease-in-out infinite",
        "slide-down": "slide-down 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
