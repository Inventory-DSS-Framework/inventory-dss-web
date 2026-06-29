import type { Config } from "tailwindcss";

// Colors are driven by CSS variables (RGB channel triplets) defined in globals.css,
// so the whole palette can be swapped at runtime via `data-theme` on <html>.
// The `<alpha-value>` placeholder keeps Tailwind's opacity modifiers (e.g. bg-primary/20).
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

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
        background: v("--c-bg"),
        "background-deep": v("--c-bg-deep"),
        surface: v("--c-surface"),
        "surface-soft": v("--c-surface-soft"),
        "surface-muted": v("--c-surface-muted"),
        border: v("--c-border"),
        "border-soft": v("--c-border-soft"),

        primary: {
          DEFAULT: v("--c-primary"),
          hover: v("--c-primary-hover"),
          soft: v("--c-primary-soft"),
          softer: v("--c-primary-softer"),
        },

        // Secondary accent (role kept under the `accent.violet*` names so existing
        // component classes don't change; the hue follows the active theme).
        accent: {
          violet: v("--c-accent"),
          "violet-soft": v("--c-accent-soft"),
          lavender: v("--c-accent-2"),
          "lavender-soft": v("--c-accent-2-soft"),
          sky: v("--c-sky"),
        },

        text: {
          primary: v("--c-text"),
          secondary: v("--c-text-secondary"),
          muted: v("--c-text-muted"),
        },

        success: { DEFAULT: v("--c-success"), soft: v("--c-success-soft") },
        warning: { DEFAULT: v("--c-warning"), soft: v("--c-warning-soft") },
        danger: { DEFAULT: v("--c-danger"), soft: v("--c-danger-soft") },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
        // Themed soft pastel (the Ticket medio card). Reads flat, not as a saturated gradient.
        "gradient-lavender":
          "linear-gradient(160deg, rgb(var(--c-grad-from)) 0%, rgb(var(--c-grad-to)) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
