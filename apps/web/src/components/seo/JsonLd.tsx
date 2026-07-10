/**
 * F11-09 — JSON-LD structured data component
 *
 * Renders <script type="application/ld+json"> with escaped content.
 * Used on home page (YogaStudio), blog posts (Article), instructors (Person).
 *
 * Source: MEP Phase 11 F11-09, PAD §23.2, SKILL §15.10 (escapeForScriptContext).
 */

interface JsonLdProps {
  schema: Record<string, unknown>;
}

export function JsonLd({ schema }: JsonLdProps) {
  // Escape for safe embedding in <script> context per SKILL §15.10
  const json = JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
