/**
 * F12-18 — Reusable section header with number + label + title
 *
 * Section number: clamp(5rem, 10vw, 9rem) Cormorant 300 stone-100
 * Label: 0.6875rem DM Sans uppercase clay-400
 * Title: clamp(2rem, 4vw, 3.25rem) Cormorant 300
 *
 * Source: MEP Phase 12 F12-18.
 */

interface SectionHeaderProps {
  number: string;
  label: string;
  title: string;
  description?: string;
}

export function SectionHeader({ number, label, title, description }: SectionHeaderProps) {
  return (
    <header className="mb-12">
      <div className="relative">
        <span
          className="absolute -top-4 left-0 select-none font-display text-[clamp(5rem,10vw,9rem)] font-light leading-[0.85] text-stone-100"
          style={{ fontFamily: 'var(--font-display)' }}
          aria-hidden="true"
        >
          {number}
        </span>
      </div>
      <div className="relative pt-8">
        <p
          className="text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-clay-400"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </p>
        <h2
          className="mt-2 font-display text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.15] text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-prose text-sm text-stone-500">{description}</p>
        )}
      </div>
    </header>
  );
}
