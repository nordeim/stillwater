/**
 * F2-17 + F9-01 — Admin route group layout (Layer 2 RBAC)
 *
 * Enforces requireRole('staff', 'manager', 'owner') at the layout boundary.
 * Members are redirected to /dashboard.
 *
 * Phase 9: Renders <AdminShell> with sidebar nav + topbar (F9-02).
 *
 * Source: MEP Phase 2 F2-17, Phase 9 F9-01, SKILL §5.7.
 */

import { requireRole } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import type { StillwaterSession } from '@stillwater/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole('staff', 'manager', 'owner');
  // Cast: Better Auth's customSession infers a narrower readonly roles tuple;
  // AdminShell expects a mutable StudioRole[] for its canSeeLink helper.
  return <AdminShell session={session as unknown as StillwaterSession}>{children}</AdminShell>;
}
