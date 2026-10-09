import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef6ff", 100: "#d9eaff", 200: "#bcdaff", 300: "#8ec3ff", 400: "#59a1ff", 500: "#3380f5", 600: "#1f62ea", 700: "#194ed7", 800: "#1a41ae", 900: "#1a3b88" },
        flag: { low: "#b45309", high: "#b91c1c", critical: "#7f1d1d", normal: "#15803d" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
