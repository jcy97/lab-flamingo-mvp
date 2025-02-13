import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
      colors: {
        "neutral-100": "#FAFAFA",
        "neutral-300": "#E6E6E6",
        "neutral-500": "#A6A6A6",
        "neutral-700": "#4D4D4D",
        "neutral-800": "#383838",
        "neutral-900": "#1A1A1A",
        "primary-100": "#FEDDDC",
        "primary-300": "#FA98AA",
        "primary-500": "#F0538F",
        "primary-700": "#AC2975",
        "primary-900": "#730F5D",
        "second-100": "#CEFCF0",
        "second-300": "#6EF1E4",
        "second-500": "#14C4D1",
        "second-700": "#0A7596",
        "second-900": "#033D64",
      },
    },
  },
  plugins: [],
} satisfies Config;
