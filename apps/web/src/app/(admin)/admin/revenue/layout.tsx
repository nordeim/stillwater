/**
 * F2-18 — Revenue section nested layout (Layer 2 RBAC)
 *
 * Enforces requireRole('manager', 'owner') — defense-in-depth.
 * Staff is already filtered out by (admin)/layout.tsx, but this
 * nested layout ensures the revenue section is restricted even
 * if the admin layout changes.
 *
 * Source: MEP Phase 2 F2-18, SKILL §5.7.
 */

import { requireRole } from '@/lib/auth';

export default async function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole('manager', 'owner');
  return <>{children}</>;
}
