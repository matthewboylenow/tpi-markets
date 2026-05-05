import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tpi: {
          blue: "#0066b2",
          "blue-dark": "#004d85",
          "blue-light": "#3389c4",
          orange: "#FF7B00",
          "orange-dark": "#cc6200",
          cream: "#F8F6F1",
          ink: "#0E1620",
          stone: "#5C6470",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        serif: ['var(--font-source-serif)', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
