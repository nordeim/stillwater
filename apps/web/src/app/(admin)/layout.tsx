/**
 * F2-17 — Admin route group layout (Layer 2 RBAC)
 *
 * Enforces requireRole('staff', 'manager', 'owner') at the layout boundary.
 * Members are redirected to /dashboard.
 *
 * Source: MEP Phase 2 F2-17, SKILL §5.7.
 */

import { requireRole } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole('staff', 'manager', 'owner');
  return (
    <div className="admin-shell" data-session={session.user.id}>
      {children}
    </div>
  );
}
