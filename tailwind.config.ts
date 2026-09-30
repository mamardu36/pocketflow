import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./constants/**/*.ts", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        border: token("border"),
        ring: token("ring"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        hero: { DEFAULT: token("hero"), foreground: token("hero-foreground"), muted: token("hero-muted") },
        positive: token("positive"),
        warning: token("warning"),
        danger: token("danger"),
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Segoe UI Variable"', '"Segoe UI"',
          "Roboto", '"Helvetica Neue"', "Arial", "sans-serif",
        ],
      },
      borderRadius: { "4xl": "1.75rem" },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--shadow) / 0.06), 0 4px 16px -6px hsl(var(--shadow) / 0.10)",
        lift: "0 12px 40px -12px hsl(var(--shadow) / 0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "dialog-in": { from: { opacity: "0", transform: "translateY(8px) scale(0.98)" }, to: { opacity: "1", transform: "none" } },
        "month-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "sheet-up": "sheet-up 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        "dialog-in": "dialog-in 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "month-in": "month-in 220ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
