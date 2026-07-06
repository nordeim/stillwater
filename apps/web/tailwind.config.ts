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

import containerQueries from "@tailwindcss/container-queries";
import typography from "@tailwindcss/typography";

import { stillwaterBase } from "@stillwater/tailwind-config";

import type { Config } from "tailwindcss";

const config: Config = {
  // Content paths — Tailwind v4 scans these for class usage
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    // Include shared UI package components
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],

  // Extend the shared base config (includes theme tokens, fonts, colors)
  ...stillwaterBase,

  plugins: [
    // Typography plugin for blog/long-form content
    typography,
    // Container queries for component-level responsive design
    containerQueries,
  ],
};

export default config;
