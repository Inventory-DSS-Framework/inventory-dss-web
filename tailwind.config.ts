import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces & background
        background: "#F4F6FB",
        "background-deep": "#EEF1F8",
        surface: "#FFFFFF",
        "surface-soft": "#F7F9FC",
        "surface-muted": "#F1F4FA",
        border: "#EAEEF6",
        "border-soft": "#F0F3F9",

        // Electric blue primary
        primary: {
          DEFAULT: "#3358F4",
          hover: "#2A47D6",
          soft: "#E5EAFE",
          softer: "#F0F3FE",
        },

        // Lavender / violet accents
        accent: {
          violet: "#7C5CFC",
          "violet-soft": "#ECE9FE",
          lavender: "#A9B4FB",
          "lavender-soft": "#EEF0FE",
          sky: "#38BDF8",
        },

        text: {
          primary: "#161A2E",
          secondary: "#6B7390",
          muted: "#9AA1B9",
        },

        success: {
          DEFAULT: "#10B981",
          soft: "#D6F5E7",
        },
        warning: {
          DEFAULT: "#F5A623",
          soft: "#FDF0D6",
        },
        danger: {
          DEFAULT: "#F2545B",
          soft: "#FDE2E3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(22, 26, 46, 0.04), 0 4px 16px -4px rgba(22, 26, 46, 0.04)",
        "soft-lg": "0 6px 24px -6px rgba(22, 26, 46, 0.08), 0 2px 8px -2px rgba(22, 26, 46, 0.04)",
        "soft-xl": "0 16px 40px -12px rgba(22, 26, 46, 0.12)",
        button: "0 1px 2px rgba(22, 26, 46, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      },
      backgroundImage: {
        // Kept intentionally subtle — reads as a flat pastel, not a saturated gradient.
        "gradient-lavender": "linear-gradient(160deg, #F1F2FE 0%, #E9ECFE 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
