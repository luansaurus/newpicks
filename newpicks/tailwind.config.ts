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
        background: "#0f172a", // slate-900
        card: "#1e293b",       // slate-800
        border: "#334155",     // slate-700
        primary: "#22c55e",    // green-500
      },
    },
  },
  plugins: [],
};

export default config;