import type { Config } from 'tailwindcss';

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f4ff",
          200: "#bae3ff",
          300: "#7cc4fa",
          400: "#36a9f0",
          500: "#0b8bd9",
          600: "#006bb6",
          700: "#00508f",
          800: "#003e6e",
          900: "#00294a",
          950: "#001a30",
          DEFAULT: "#0b8bd9",
          dark: "#006bb6"
        },
        sand: {
          50: "#fff9f2",
          100: "#fef3e4",
          200: "#fce3c6",
          300: "#f8ce9c",
          400: "#f2b374",
          500: "#e8964c",
          600: "#c57435",
          700: "#9c5726",
          800: "#6f3b18",
          900: "#42220c",
          950: "#251205",
          DEFAULT: "#e8964c"
        }
      }
    }
  },
  plugins: []
} satisfies Config;


