// @ts-check

/**
 * Stillwater — Shared ESLint Configuration
 * Applied across all packages and apps in the monorepo.
 *
 * Stack: TypeScript strict, React 19, Next.js 16, Tailwind CSS v4
 */

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import importPlugin from "eslint-plugin-import";
import tailwindPlugin from "eslint-plugin-tailwindcss";

/** @type {import("typescript-eslint").Config} */
export default tseslint.config(
  // ── Base ignores (applies globally) ──────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },

  // ── Base ESLint recommended ───────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript strict (type-checked requires projectService) ─────
  // In typescript-eslint v8, strictTypeChecked is a config ARRAY (not a function).
  // Type-checked rules require parserOptions.projectService to be set.
  // This config block enables the TypeScript project service which auto-discovers
  // the nearest tsconfig.json per file — essential for monorepo support.
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ── Core rules ───────────────────────────────────────────────────
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // General best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },

  // ── React + React Hooks (scoped to .tsx/.jsx only) ────────────────
  // React rules only apply to component files, not plain .ts config files.
  // ESLint v9.39.4 + eslint-plugin-react@7.37.5 (supports ^9.7, not v10).
  // Scoped to .tsx/.jsx to avoid running React rules on .ts files.
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with React 19 JSX transform
      "react/prop-types": "off",          // TypeScript handles this
      "react/display-name": "warn",
      "react-hooks/exhaustive-deps": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // ── Import ordering ───────────────────────────────────────────────
  // ESLint v9.39.4 + eslint-plugin-import@2.32.0 (supports ^9, not v10).
  // Re-enabled after ESLint downgrade from v10 to v9.
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "external",
              position: "before",
            },
            {
              pattern: "@stillwater/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["type"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "error",
      "import/no-cycle": "error",
    },
  },

  // ── Tailwind CSS ──────────────────────────────────────────────────
  {
    plugins: {
      tailwindcss: tailwindPlugin,
    },
    rules: {
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-contradicting-classname": "error",
    },
  },

  // ── Next.js (D19: wire previously-unused nextPlugin) ──────────────
  // ESLint v9 flat config: plugin key must match rule prefix.
  // @next/eslint-plugin-next rules use "@next/next/" prefix,
  // so the plugin must be registered as "@next/next" (not "next").
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
