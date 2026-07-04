/**
 * Stillwater — Tailwind CSS v4 Configuration (apps/web)
 *
 * In Tailwind v4, the primary design tokens live in the global CSS file
 * via the @theme directive. This config file handles:
 * - Content scanning paths
 * - Plugin registration
 * - App-specific extensions over the shared base
 *
 * See: apps/web/src/app/globals.css for @theme token declarations
 */

import type { Config } from "tailwindcss";
import { stillwaterBase } from "@stillwater/tailwind-config";

const config: Config = {
  // Content paths — Tailwind v4 scans these for class usage
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    // Include shared UI package components
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],

  // Extend the shared base config
  ...stillwaterBase,

  theme: {
    ...stillwaterBase.theme,
    extend: {
      ...stillwaterBase.theme?.extend,

      // App-specific overrides (none needed for v1)
    },
  },

  plugins: [
    // Typography plugin for blog/long-form content
    require("@tailwindcss/typography"),
    // Container queries for component-level responsive design
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
