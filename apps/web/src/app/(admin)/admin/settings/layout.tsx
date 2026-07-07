/**
 * F2-19 — Settings section nested layout (Layer 2 RBAC)
 *
 * Enforces requireRole('owner') — highest tier.
 * Defense-in-depth: (admin)/layout.tsx already requires staff+,
 * but settings requires owner specifically.
 *
 * Source: MEP Phase 2 F2-19, SKILL §5.7.
 */

import { requireRole } from '@/lib/auth';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole('owner');
  return <>{children}</>;
}
