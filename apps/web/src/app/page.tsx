/**
 * Stillwater — Phase 0 Placeholder Home Page
 *
 * This page will be replaced in Phase 4 (Marketing surface with Sanity CMS)
 * and Phase 12 (Landing page port from static mockup to production Next.js).
 */

export default function HomePage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
      color: 'var(--color-text-primary, #1C1915)',
      background: 'var(--color-background, #F5F0E8)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display, Georgia, serif)',
        fontSize: 'clamp(3rem, 8vw, 5rem)',
        fontWeight: 300,
        lineHeight: 1.05,
        marginBottom: '1rem',
      }}>
        Stillwater
      </h1>
      <p style={{
        fontSize: '1.125rem',
        lineHeight: 1.65,
        color: 'var(--color-text-secondary, #8C7B6E)',
        maxWidth: '32rem',
        textAlign: 'center',
      }}>
        Phase 0 scaffold complete. The production landing page will appear here
        after Phase 4 (Sanity CMS integration) and Phase 12 (mockup port).
      </p>
      <div style={{
        marginTop: '3rem',
        padding: '1rem 2rem',
        border: '1px solid var(--color-border, #D4CFC9)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--color-text-secondary, #8C7B6E)',
      }}>
        Next.js 16 · React 19 · Tailwind v4 · tRPC v11 · Drizzle · Better Auth
      </div>
    </main>
  );
}
