/**
 * F9-20 — Audit log section nested layout (Layer 2 RBAC — manager+)
 *
 * Enforces requireRole('manager', 'owner') — defense-in-depth.
 * Staff is already filtered out by (admin)/layout.tsx, but this
 * nested layout ensures the audit log is restricted to manager+
 * per MEP F9-20 ("manager+ only").
 *
 * Source: MEP Phase 9 F9-20, SKILL §5.7, PAD §9.4.
 */

import { requireRole } from '@/lib/auth';

export default async function AuditLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole('manager', 'owner');
  return <>{children}</>;
}
