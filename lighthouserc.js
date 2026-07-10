/**
 * F10-12 — Lighthouse CI configuration
 *
 * Runs Lighthouse against production build. Performance 95+ (warn),
 * Accessibility 100 (error), SEO 100 (error), Best Practices 100 (error).
 *
 * Usage: pnpm lighthouse ci (after pnpm build + pnpm start)
 *
 * Source: MEP Phase 10 F10-12, PAD §19.1 (Core Web Vitals targets).
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/schedule',
        'http://localhost:3000/pricing',
        'http://localhost:3000/instructors',
        'http://localhost:3000/about',
      ],
      startServerCommand: 'pnpm start --filter=@stillwater/web',
      startServerReadyPattern: 'Ready in',
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:seo': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['error', { minScore: 1.0 }],
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
};
