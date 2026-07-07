/**
 * Stillwater — Shared Tailwind CSS v4 Base Configuration
 *
 * Design Philosophy: "Editorial Calm" — Warm Mineral Palette
 * Anti-Generic enforcement: NO purple gradients, NO Inter-only, NO generic grids.
 *
 * NOTE: In Tailwind v4, most configuration moves to CSS (@theme directive).
 * This file exports JS-accessible tokens for use in Storybook, tests, etc.
 */

import type { Config } from "tailwindcss";

export const stillwaterBase: Omit<Config, 'content'> = {
  // ── Theme ──────────────────────────────────────────────────────
  // NOTE: In Tailwind v4, content paths are configured via @source
  // directives in CSS, not in the JS config. Each app declares its
  // own content paths in its tailwind.config.ts.

  theme: {
    extend: {
      // ── Typography ─────────────────────────────────────────────
      fontFamily: {
        display: [
          "Cormorant Garamond",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        body: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },

      // ── Colour palette (mirrors CSS custom properties) ─────────
      colors: {
        stone: {
          950: "#0F0D0B",
          900: "#1C1915",
          800: "#2E2B26",
          700: "#3D3832",
          600: "#544F48",
          500: "#6E6760",
          400: "#8C7B6E",
          300: "#B0A49A",
          200: "#D4CFC9",
          100: "#E8E3DC",
          50:  "#F5F0E8",
        },
        clay: {
          600: "#8A4030",
          500: "#9E5E44",
          400: "#C4856A",
          300: "#D9A48F",
          200: "#EDD4C8",
          100: "#F7EDE8",
        },
        water: {
          700: "#4A7280",
          600: "#5D8A99",
          500: "#7B9EA8",
          400: "#9BBAC5",
          300: "#B8CDD4",
          100: "#E8F0F3",
        },
        sand: {
          DEFAULT: "#F5F0E8",
          warm:    "#EDE5D8",
          deep:    "#E2D8CB",
        },
      },

      // ── Spacing (13-stop scale, 4px base — matches packages/ui/src/tokens/spacing.css + SKILL §4.1 + PAD §11.4) ─
      spacing: {
        "px": "1px",
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",     // editorial half-step
        "6": "24px",
        "7": "32px",     // primary component gap
        "8": "48px",
        "9": "64px",     // section padding
        "10": "96px",
        "11": "128px",
        "12": "192px",   // large section breaks
        "13": "256px",
      },

      // ── Max-widths (matches packages/ui/src/tokens/spacing.css + SKILL §4.1) ─
      maxWidth: {
        content: "1280px",
        narrow:  "720px",
        wide:    "1440px",
      },

      // ── Typography Scale ───────────────────────────────────────
      fontSize: {
        "display-2xl": ["clamp(3.5rem,8vw,7rem)",    { lineHeight: "1.0" }],
        "display-xl":  ["clamp(2.5rem,5vw,4.5rem)",  { lineHeight: "1.05" }],
        "display-lg":  ["clamp(2rem,4vw,3.25rem)",   { lineHeight: "1.1" }],
        "heading-lg":  ["clamp(1.5rem,3vw,2rem)",    { lineHeight: "1.2" }],
        "heading-md":  ["1.25rem",                   { lineHeight: "1.3" }],
        "body-lg":     ["1.125rem",                  { lineHeight: "1.75" }],
        "body-md":     ["1rem",                      { lineHeight: "1.65" }],
        "body-sm":     ["0.875rem",                  { lineHeight: "1.6" }],
        "caption":     ["0.75rem",                   { lineHeight: "1.4" }],
        "label":       ["0.6875rem",                 { lineHeight: "1.4" }],
      },

      // ── Border Radius (sharp edges by design per PAD §11.1 + SKILL §4.1; --radius: 0 propagates through all shadcn components) ─
      borderRadius: {
        none:   "0",
        sm:     "0",
        DEFAULT: "0",  // Stillwater: no softness — sharp edges for editorial feel
        md:     "0",
        lg:     "0",
        xl:     "0",
        "2xl":  "0",
        full:   "9999px",  // ONLY for avatars and status dots (per SKILL §4.1)
      },

      // ── Animation ─────────────────────────────────────────────
      transitionTimingFunction: {
        "gentle":  "cubic-bezier(0.16, 1, 0.3, 1)",
        "breathe": "cubic-bezier(0.45, 0, 0.55, 1)",
        "sharp":   "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      transitionDuration: {
        instant:  "100ms",
        quick:    "150ms",
        standard: "300ms",
        slow:     "600ms",
        crawl:    "900ms",
      },

      // ── Keyframes ─────────────────────────────────────────────
      keyframes: {
        marquee: {
          "from": { transform: "translateX(0)" },
          "to":   { transform: "translateX(-50%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "reveal": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },

      animation: {
        marquee:    "marquee 32s linear infinite",
        "fade-in":  "fade-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        reveal:     "reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },

  plugins: [],
} satisfies Omit<Config, "content">;
