import type { Config } from "tailwindcss";

// Colors are driven by CSS variables (RGB channel triplets) defined in globals.css,
// so mode / premium palette / FTGM stage swap the whole palette at runtime via
// attributes on <html>. `<alpha-value>` keeps opacity modifiers (bg-primary/20).
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
        "on-primary": v("--c-on-primary"),
        glow: v("--c-glow"),

        // Secondary accent (kept under the `accent.violet*` names so existing
        // component classes don't churn; the hue follows mode/palette/stage).
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
        // One radius for the whole app: every rounded-* tier resolves to 12px.
        xl: "0.75rem",
        "2xl": "0.75rem",
        "3xl": "0.75rem",
        "4xl": "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow-color) / 0.04), 0 4px 18px -8px rgb(var(--shadow-color) / 0.07)",
        "soft-lg": "0 2px 6px -2px rgb(var(--shadow-color) / 0.06), 0 16px 36px -14px rgb(var(--shadow-color) / 0.14)",
        "soft-xl": "0 4px 12px -4px rgb(var(--shadow-color) / 0.08), 0 32px 64px -24px rgb(var(--shadow-color) / 0.26)",
        button: "0 1px 2px rgb(var(--shadow-color) / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.12)",
        glow: "0 0 32px -6px rgb(var(--c-glow) / 0.5)",
      },
      backgroundImage: {
        "gradient-lavender":
          "linear-gradient(160deg, rgb(var(--c-grad-from)) 0%, rgb(var(--c-grad-to)) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
