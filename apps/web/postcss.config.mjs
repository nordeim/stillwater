/**
 * PostCSS configuration for Tailwind CSS v4
 *
 * In Tailwind v4, the postcss-import and autoprefixer plugins are
 * handled internally by @tailwindcss/postcss. No separate
 * postcss-import is needed.
 */

/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    // Tailwind CSS v4 PostCSS plugin — handles everything:
    // @import resolution, autoprefixer, CSS nesting, etc.
    "@tailwindcss/postcss": {},
  },
};

export default config;
