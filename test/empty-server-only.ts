/**
 * Empty stub for the `server-only` package.
 *
 * The real `server-only` package throws when imported outside of React Server
 * Components. In the vitest test environment this side-effect import would
 * crash any module that transitively pulls it in (e.g. lib/auth.ts,
 * lib/observability/logger.ts). This file is aliased as a replacement so
 * `import 'server-only'` becomes a harmless no-op during tests.
 */
export {};
