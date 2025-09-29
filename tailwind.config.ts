import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f3ff",
          100: "#c8e1ff",
          200: "#a3cdff",
          300: "#7cb5ff",
          400: "#559cff",
          500: "#2e82f6",
          600: "#1b64d4",
          700: "#124cb0",
          800: "#0b378c",
          900: "#062768",
        },
        accent: {
          DEFAULT: "#f97316",
          muted: "#fed7aa",
        },
        success: "#22c55e",
        warning: "#facc15",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      borderRadius: {
        lg: "0.75rem",
      },
      boxShadow: {
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
