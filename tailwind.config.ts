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
        },
        caribbean: {
          blue: {
            50: "#e6f7ff",
            100: "#bae7ff",
            200: "#91d5ff",
            300: "#69c0ff",
            400: "#40a9ff",
            500: "#1890ff",
            600: "#0077B6",
            700: "#005885",
            800: "#003d5a",
            900: "#002233",
            DEFAULT: "#00B4D8",
            light: "#90E0EF",
            dark: "#0077B6"
          },
          sky: {
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            300: "#7dd3fc",
            400: "#38bdf8",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
            800: "#075985",
            900: "#0c4a6e",
            DEFAULT: "#90E0EF"
          },
          white: {
            DEFAULT: "#FFFFFF",
            soft: "#F8F9FA",
            warm: "#FAFAFA"
          },
          coral: {
            DEFAULT: "#FF6B6B",
            light: "#FF8787",
            dark: "#E63946"
          }
        }
      }
    }
  },
  plugins: []
} satisfies Config;


